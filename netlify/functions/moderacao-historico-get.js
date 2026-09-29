const { exigirCargoModeracao } = require("./lib/autorizar-moderacao");
const { carregarBlob } = require("./lib/upstash");

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") return { statusCode: 405, body: "Method Not Allowed" };

  const guildId = event.queryStringParameters && event.queryStringParameters.guildId;
  const { erro } = await exigirCargoModeracao(event, guildId, "basico");
  if (erro) return erro;

  const dados = await carregarBlob("acoes_moderacao.json", {});
  return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ acoes: dados[guildId] || [] }) };
};
