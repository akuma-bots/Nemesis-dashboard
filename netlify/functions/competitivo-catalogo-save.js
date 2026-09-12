const { lerSessao } = require("./lib/sessao");
const { usuarioGerenciaServidor } = require("./lib/discord");
const { carregarBlob, salvarBlob } = require("./lib/upstash");
const { PADRAO, comPadrao } = require("./lib/competitivo-padrao");

// Mesmo ID fixo usado em site-conteudo-save.js — nunca vem do corpo da requisição.
const GUILD_ID_NEMESIS = "1543381737961160910";

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  const sessao = lerSessao(event);
  if (!sessao) return { statusCode: 401, body: JSON.stringify({ erro: "não autenticado" }) };

  const gerencia = await usuarioGerenciaServidor(sessao.access_token, GUILD_ID_NEMESIS);
  if (!gerencia) return { statusCode: 403, body: JSON.stringify({ erro: "Você não gerencia o servidor da NÊMESIS." }) };

  const corpo = JSON.parse(event.body || "{}");
  if (!Array.isArray(corpo.catalogo)) {
    return { statusCode: 400, body: JSON.stringify({ erro: "catalogo precisa ser uma lista." }) };
  }

  const atual = comPadrao(await carregarBlob("competitivo.json", PADRAO));
  const novo = { ...atual, catalogo: corpo.catalogo };
  await salvarBlob("competitivo.json", novo);

  return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ok: true, catalogo: novo.catalogo }) };
};
