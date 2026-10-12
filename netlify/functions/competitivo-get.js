const { carregarBlob } = require("./lib/upstash");
const { PADRAO, comPadrao, FAIXAS_ELO, calcularRank } = require("./lib/competitivo-padrao");

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") return { statusCode: 405, body: "Method Not Allowed" };

  const bruto = await carregarBlob("competitivo.json", PADRAO);
  const conteudo = comPadrao(bruto);
  const estado = bruto?.temporada_global || {};
  const inicio = Number(estado.inicio_timestamp || 0);
  const duracaoDias = Math.max(1, Number(estado.duracao_dias || 30));
  const fim = inicio ? inicio + duracaoDias * 86400 : 0;
  const agora = Math.floor(Date.now() / 1000);

  const ranking = Object.values(conteudo.perfis)
    .map((p) => ({
      discordId: p.discordId,
      nome: p.nome,
      pontos: Number(p.pontos_temporada ?? p.pontos ?? 0),
      pontosTotais: Number(p.pontos || 0),
      xp: Number(p.xp || 0),
      elo: Number(p.elo || 1000),
      vitorias: Number(p.vitorias || 0),
      derrotas: Number(p.derrotas || 0),
      tempoTopGlobal: Number(p.tempo_top_global_segundos || 0),
      rank: calcularRank(Number(p.elo || 1000)),
      kd: Number(p.derrotas || 0) === 0
        ? Number(p.vitorias || 0).toFixed(2)
        : (Number(p.vitorias || 0) / Number(p.derrotas || 0)).toFixed(2),
    }))
    .sort((a, b) => b.pontos - a.pontos || b.vitorias - a.vitorias || b.elo - a.elo);

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    body: JSON.stringify({
      catalogo: conteudo.catalogo,
      faixasElo: FAIXAS_ELO,
      ranking,
      temporada: {
        numero: Number(estado.numero || 1),
        inicio,
        fim,
        duracaoDias,
        segundosRestantes: inicio ? Math.max(0, fim - agora) : duracaoDias * 86400,
        historico: Array.isArray(estado.historico) ? estado.historico : [],
      },
    }),
  };
};
