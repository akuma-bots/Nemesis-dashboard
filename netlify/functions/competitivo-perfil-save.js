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

  const perfilAtual = atual.perfis[discordId] || { discordId, nome: discordId, pontos: 0, elo: 1000, vitorias: 0, derrotas: 0 };

  const perfilNovo = {
    discordId,
    nome: typeof corpo.nome === "string" && corpo.nome.trim() ? corpo.nome.trim() : perfilAtual.nome,
    pontos: Number.isFinite(corpo.pontos) ? corpo.pontos : perfilAtual.pontos,
    elo: Number.isFinite(corpo.elo) ? Math.max(0, corpo.elo) : perfilAtual.elo,
    vitorias: Number.isFinite(corpo.vitorias) ? corpo.vitorias : perfilAtual.vitorias,
    derrotas: Number.isFinite(corpo.derrotas) ? corpo.derrotas : perfilAtual.derrotas,
  };

  atual.perfis[discordId] = perfilNovo;
  await salvarBlob("competitivo.json", atual);

  return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ok: true, perfil: perfilNovo }) };
};
