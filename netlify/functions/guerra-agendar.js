const { exigirGerenciaServidor } = require("./lib/autorizar");
const { carregarBlob } = require("./lib/upstash");
const { comPadrao } = require("./lib/config-padrao");
const { enviarEmbed } = require("./lib/discord");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  const { guildId, gangueA, gangueB, quando } = JSON.parse(event.body || "{}");
  const { erro } = await exigirGerenciaServidor(event, guildId);
  if (erro) return erro;

  if (!gangueA || !gangueB || !quando) {
    return { statusCode: 400, body: JSON.stringify({ erro: "gangueA, gangueB e quando são obrigatórios" }) };
  }

  const configs = await carregarBlob("guild_configs.json", {});
  const config = comPadrao(configs[guildId]);
  const canalId = config.canal_eventos_id;
  if (!canalId) {
    return { statusCode: 400, body: JSON.stringify({ erro: "Configure o canal de eventos na aba Geral primeiro." }) };
  }

  const embed = {
    title: "⚔️ Guerra agendada!",
    description: `**${gangueA}** vs **${gangueB}**`,
    color: 0xed4245,
    fields: [{ name: "Quando", value: quando }],
  };
  await enviarEmbed(canalId, embed);

  return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ok: true }) };
};
