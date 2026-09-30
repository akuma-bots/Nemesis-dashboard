const PADRAO = {
  missoes: [],
  submissoes: [],
};

function comPadrao(conteudo) {
  return {
    missoes: Array.isArray(conteudo?.missoes)
      ? conteudo.missoes
      : PADRAO.missoes,

    submissoes: Array.isArray(conteudo?.submissoes)
      ? conteudo.submissoes
      : PADRAO.submissoes,
  };
}

module.exports = {
  PADRAO,
  comPadrao,
};