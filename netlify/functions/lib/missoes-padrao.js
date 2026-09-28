const PADRAO = {
  missoes: [],
  submissoes: [],
};

function comPadrao(conteudo) {
  return {
    missoes: (conteudo && conteudo.missoes) || PADRAO.missoes,
    submissoes: (conteudo && conteudo.submissoes) || PADRAO.submissoes,
  };
}

module.exports = { PADRAO, comPadrao };