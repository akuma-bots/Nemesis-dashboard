const PADRAO = {
  catalogo: [
    { id: "vitoria-competitiva", nome: "Vitória Competitiva", pontos: 50, grupo: "pontos" },
    { id: "derrota-competitiva", nome: "Derrota Competitiva", pontos: 10, grupo: "pontos" },
    { id: "vitoria-rival-superior", nome: "Vitória contra Rival Superior", pontos: 75, grupo: "pontos" },
    { id: "sequencia-3-vitorias", nome: "Sequência de 3 Vitórias", pontos: 25, grupo: "pontos" },
    { id: "sequencia-5-vitorias", nome: "Sequência de 5 Vitórias", pontos: 50, grupo: "pontos" },
    { id: "treino-oficial", nome: "Treino Oficial", pontos: 15, grupo: "pontos" },
    { id: "evento-oficial", nome: "Evento Oficial", pontos: 25, grupo: "pontos" },
    { id: "torneio", nome: "Torneio (participação)", pontos: 50, grupo: "pontos" },
    { id: "vitoria-torneio", nome: "Vitória em Torneio", pontos: 100, grupo: "pontos" },
    { id: "campeonato-final", nome: "Campeonato / Final", pontos: 150, grupo: "pontos" },
    { id: "mvp-partida", nome: "MVP da Partida", pontos: 30, grupo: "pontos" },
    { id: "mvp-evento", nome: "MVP do Evento", pontos: 100, grupo: "pontos" },
    { id: "participar-dia", nome: "Participar do Dia", pontos: 10, grupo: "bonus" },
    { id: "participar-3-dias-semana", nome: "Participar 3 Dias na Semana", pontos: 30, grupo: "bonus" },
    { id: "participar-7-dias-semana", nome: "Participar 7 Dias na Semana", pontos: 75, grupo: "bonus" },
    { id: "ajudar-treino", nome: "Ajudar outro membro em treino", pontos: 10, grupo: "bonus" },
    { id: "abandonar-partida", nome: "Abandonar Partida", pontos: -25, grupo: "penalidade" },
    { id: "ausencia-injustificada", nome: "Ausência Injustificada em Competição", pontos: -30, grupo: "penalidade" },
    { id: "conduta-anticompetitiva", nome: "Conduta Anticompetitiva", pontos: -50, grupo: "penalidade" },
    { id: "fraude-resultado", nome: "Trapaça / Fraude de Resultado", pontos: -100, grupo: "penalidade" },
  ],
  perfis: {},
};

function comPadrao(conteudo) {
  return {
    catalogo: (conteudo && conteudo.catalogo) || PADRAO.catalogo,
    perfis: (conteudo && conteudo.perfis) || PADRAO.perfis,
  };
}

const FAIXAS_ELO = [
  { nome: "Bronze", min: 0 },
  { nome: "Silver", min: 1100 },
  { nome: "Gold", min: 1300 },
  { nome: "Platina", min: 1500 },
  { nome: "Diamond", min: 1700 },
  { nome: "Master", min: 1900 },
  { nome: "Grandmaster", min: 2200 },
  { nome: "Champion", min: 2500 },
];

function calcularRank(elo) {
  let rank = FAIXAS_ELO[0].nome;
  for (const faixa of FAIXAS_ELO) {
    if (elo >= faixa.min) rank = faixa.nome;
  }
  return rank;
}

module.exports = { PADRAO, comPadrao, FAIXAS_ELO, calcularRank };
