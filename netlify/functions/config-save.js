const { exigirGerenciaServidor } = require("./lib/autorizar");
const { carregarBlob, salvarBlob } = require("./lib/upstash");
const { comPadrao } = require("./lib/config-padrao");

const CAMPOS_PERMITIDOS = [
  "support_role_id",
  "log_channel_id",
  "ticket_category_id",
  "canal_eventos_id",
  "canal_parcerias_id",
  "canal_denuncias_id",
  "categoria_modmail_id",
];

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  const corpo = JSON.parse(event.body || "{}");
  const { guildId } = corpo;

  const { erro } = await exigirGerenciaServidor(event, guildId);
  if (erro) return erro;

  const configs = await carregarBlob("guild_configs.json", {});
  const atual = comPadrao(configs[guildId]);

  for (const campo of CAMPOS_PERMITIDOS) {
    if (campo in corpo) {
      atual[campo] = corpo[campo] === "" || corpo[campo] === null ? null : corpo[campo];
    }
  }

  configs[guildId] = atual;
  await salvarBlob("guild_configs.json", configs);

  return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ok: true, config: atual }) };
};
