const { exigirGerenciaServidor } = require("./lib/autorizar");
const { carregarBlob, salvarBlob } = require("./lib/upstash");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  const corpo = JSON.parse(event.body || "{}");
  const { guildId, tipos } = corpo;

  const { erro } = await exigirGerenciaServidor(event, guildId);
  if (erro) return erro;

  if (!Array.isArray(tipos)) {
    return { statusCode: 400, body: JSON.stringify({ erro: "tipos precisa ser uma lista." }) };
  }

  const todos = await carregarBlob("ticket_tipos.json", {});
  todos[guildId] = tipos;
  await salvarBlob("ticket_tipos.json", todos);

  return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ok: true, tipos }) };
};