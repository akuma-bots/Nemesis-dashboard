const { carregarBlob } = require("./lib/upstash");
const { PADRAO, comPadrao, FAIXAS_ELO, calcularRank } = require("./lib/competitivo-padrao");

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") return { statusCode: 405, body: "Method Not Allowed" };

  const conteudo = comPadrao(await carregarBlob("competitivo.json", PADRAO));

  const ranking = Object.values(conteudo.perfis)
    .map((p) => ({
      discordId: p.discordId,
      nome: p.nome,
      pontos: p.pontos || 0,
      elo: p.elo || 1000,
      vitorias: p.vitorias || 0,
      derrotas: p.derrotas || 0,
      rank: calcularRank(p.elo || 1000),
      kd: (p.derrotas || 0) === 0 ? (p.vitorias || 0).toFixed(2) : ((p.vitorias || 0) / p.derrotas).toFixed(2),
    }))
    .sort((a, b) => b.pontos - a.pontos || b.elo - a.elo);

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ catalogo: conteudo.catalogo, faixasElo: FAIXAS_ELO, ranking }),
  };
};
