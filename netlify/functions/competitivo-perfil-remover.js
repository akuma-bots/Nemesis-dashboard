const { lerSessao } = require("./lib/sessao");
const { usuarioGerenciaServidor } = require("./lib/discord");
const { carregarBlob, salvarBlob } = require("./lib/upstash");
const { PADRAO, comPadrao } = require("./lib/competitivo-padrao");

const GUILD_ID_NEMESIS = "1543381737961160910";

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  const sessao = lerSessao(event);
  if (!sessao) return { statusCode: 401, body: JSON.stringify({ erro: "não autenticado" }) };

  const gerencia = await usuarioGerenciaServidor(sessao.access_token, GUILD_ID_NEMESIS);
  if (!gerencia) return { statusCode: 403, body: JSON.stringify({ erro: "Você não gerencia o servidor da NÊMESIS." }) };

  const corpo = JSON.parse(event.body || "{}");
  const discordId = String(corpo.discordId || "").trim();
  if (!discordId) return { statusCode: 400, body: JSON.stringify({ erro: "discordId é obrigatório." }) };

  const atual = comPadrao(await carregarBlob("competitivo.json", PADRAO));
  delete atual.perfis[discordId];
  await salvarBlob("competitivo.json", atual);

  return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ok: true }) };
};
