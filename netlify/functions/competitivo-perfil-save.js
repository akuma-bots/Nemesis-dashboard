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
  if (!/^\d{17,20}$/.test(discordId)) {
    return { statusCode: 400, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ erro: "discordId precisa ser um ID válido do Discord." }) };
  }

  const atual = comPadrao(await carregarBlob("competitivo.json", PADRAO));

  const perfilAtual = atual.perfis[discordId] || { discordId, nome: discordId, pontos: 0, elo: 1000, vitorias: 0, derrotas: 0 };

  const numeroOuAtual = (valor, atual, { inteiro = false, minimo = 0, maximo = 1000000000 } = {}) => {
    if (valor === undefined || valor === null || valor === "") return atual;
    const numero = Number(valor);
    if (!Number.isFinite(numero) || numero < minimo || numero > maximo || (inteiro && !Number.isInteger(numero))) return null;
    return numero;
  };

  const pontos = numeroOuAtual(corpo.pontos, perfilAtual.pontos, { inteiro: true });
  const elo = numeroOuAtual(corpo.elo, perfilAtual.elo, { maximo: 100000000 });
  const vitorias = numeroOuAtual(corpo.vitorias, perfilAtual.vitorias, { inteiro: true });
  const derrotas = numeroOuAtual(corpo.derrotas, perfilAtual.derrotas, { inteiro: true });
  if ([pontos, elo, vitorias, derrotas].some((valor) => valor === null)) {
    return { statusCode: 400, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ erro: "Pontos, Elo, vitórias e derrotas precisam ser números válidos e não negativos." }) };
  }

  const perfilNovo = {
    discordId,
    nome: typeof corpo.nome === "string" && corpo.nome.trim() ? corpo.nome.trim().slice(0, 100) : perfilAtual.nome,
    pontos,
    elo,
    vitorias,
    derrotas,
  };

  atual.perfis[discordId] = perfilNovo;
  await salvarBlob("competitivo.json", atual);

  return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ok: true, perfil: perfilNovo }) };
};
