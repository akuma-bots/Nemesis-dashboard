const { exigirGerenciaServidor } = require("./lib/autorizar");
const { carregarBlob, salvarBlob } = require("./lib/upstash");
const { comPadrao } = require("./lib/config-padrao");
const { apagarCanal } = require("./lib/discord");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  let corpo;
  try { corpo = JSON.parse(event.body || "{}"); }
  catch { return { statusCode: 400, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ erro: "JSON inválido." }) }; }
  const { guildId, canalId } = corpo;
  const { erro } = await exigirGerenciaServidor(event, guildId);
  if (erro) return erro;
  if (!/^\d{17,20}$/.test(String(canalId || ""))) {
    return { statusCode: 400, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ erro: "canalId inválido." }) };
  }

  const configs = await carregarBlob("guild_configs.json", {});
  const atual = comPadrao(configs[guildId]);
  atual.contadores = atual.contadores.filter((c) => String(c.canal_id) !== String(canalId));
  configs[guildId] = atual;
  await salvarBlob("guild_configs.json", configs);

  try {
    await apagarCanal(canalId);
  } catch {
    // já não existia, tudo bem
  }

  return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ok: true, contadores: atual.contadores }) };
};
