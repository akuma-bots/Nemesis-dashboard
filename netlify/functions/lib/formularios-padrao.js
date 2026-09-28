const PADRAO = { formularios: [], respostas: [] };

function comPadrao(conteudo) {
  return {
    formularios: (conteudo && conteudo.formularios) || [],
    respostas: (conteudo && conteudo.respostas) || [],
  };
}

module.exports = { PADRAO, comPadrao };