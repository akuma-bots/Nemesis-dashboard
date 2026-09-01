const { exigirGerenciaServidor } = require("./lib/autorizar");
const { carregarBlob, salvarBlob } = require("./lib/upstash");
const { comPadrao } = require("./lib/config-padrao");
const { apagarCanal } = require("./lib/discord");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  const { guildId, canalId } = JSON.parse(event.body || "{}");
  const { erro } = await exigirGerenciaServidor(event, guildId);
  if (erro) return erro;

  const configs = await carregarBlob("guild_configs.json", {});
  const atual = comPadrao(configs[guildId]);
  atual.contadores = atual.contadores.filter((c) => c.canal_id !== canalId);
  configs[guildId] = atual;
  await salvarBlob("guild_configs.json", configs);

  try {
    await apagarCanal(canalId);
  } catch {
    // já não existia, tudo bem
  }

  return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ok: true, contadores: atual.contadores }) };
};
