const { exigirGerenciaServidor } = require("./lib/autorizar");
const { carregarBlob, salvarBlob } = require("./lib/upstash");
const { comPadrao } = require("./lib/config-padrao");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  const { guildId, canalId, cargoId, acao } = JSON.parse(event.body || "{}");
  const { erro } = await exigirGerenciaServidor(event, guildId);
  if (erro) return erro;

  const configs = await carregarBlob("guild_configs.json", {});
  const atual = comPadrao(configs[guildId]);

  if (acao === "remover") {
    delete atual.canais_cargo_automatico[canalId];
  } else {
    if (!cargoId) return { statusCode: 400, body: JSON.stringify({ erro: "cargoId é obrigatório pra adicionar" }) };
    atual.canais_cargo_automatico[canalId] = cargoId;
  }

  configs[guildId] = atual;
  await salvarBlob("guild_configs.json", configs);

  return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ok: true, canais_cargo_automatico: atual.canais_cargo_automatico }) };
};
