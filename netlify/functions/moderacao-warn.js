const { exigirCargoModeracao } = require("./lib/autorizar-moderacao");
const { carregarBlob, salvarBlob } = require("./lib/upstash");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  const { guildId, userId, motivo } = JSON.parse(event.body || "{}");
  const { erro, usuario } = await exigirCargoModeracao(event, guildId, "basico");
  if (erro) return erro;
  if (!userId || !motivo) {
    return { statusCode: 400, body: JSON.stringify({ erro: "userId e motivo são obrigatórios" }) };
  }

  const dados = await carregarBlob("acoes_moderacao.json", {});
  const lista = dados[guildId] || [];
  lista.unshift({ tipo: "warn", userId, motivo, por: usuario.id, quando: Date.now() });
  dados[guildId] = lista.slice(0, 200);
  await salvarBlob("acoes_moderacao.json", dados);

  return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ok: true }) };
};
