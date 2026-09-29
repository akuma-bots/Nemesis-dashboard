const { exigirCargoModeracao } = require("./lib/autorizar-moderacao");
const { aplicarTimeout } = require("./lib/discord");
const { carregarBlob, salvarBlob } = require("./lib/upstash");

async function registrarAcao(guildId, acao) {
  const dados = await carregarBlob("acoes_moderacao.json", {});
  const lista = dados[guildId] || [];
  lista.unshift({ ...acao, quando: Date.now() });
  dados[guildId] = lista.slice(0, 200);
  await salvarBlob("acoes_moderacao.json", dados);
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  const { guildId, userId, motivo, minutos } = JSON.parse(event.body || "{}");
  const { erro, usuario } = await exigirCargoModeracao(event, guildId, "basico");
  if (erro) return erro;
  if (!userId) return { statusCode: 400, body: JSON.stringify({ erro: "userId é obrigatório" }) };

  const duracao = Math.min(Math.max(Number(minutos) || 60, 1), 40320); // máximo do Discord: 28 dias
  await aplicarTimeout(guildId, userId, duracao, motivo);
  await registrarAcao(guildId, { tipo: "mute", userId, motivo: motivo || null, minutos: duracao, por: usuario.id });

  return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ok: true }) };
};
