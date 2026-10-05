const TIPOS = {
  missao: {
    nome: "Missões",
    icone: "🎯",
  },

  contribuicao: {
    nome: "Contribuições",
    icone: "🤝",
  },

  especial: {
    nome: "Missões Especiais",
    icone: "✦",
  },
};

const PADRAO = {
  missoes: [],
  submissoes: [],
};

function normalizarTipo(tipo) {
  const valor = String(tipo || "")
    .trim()
    .toLowerCase();

  /*
   * Compatibilidade com possíveis dados antigos.
   *
   * NÃO criamos mais sistemas separados para PvP/PvE.
   */
  if (
    valor === "missao" ||
    valor === "missões" ||
    valor === "missoes"
  ) {
    return "missao";
  }

  if (
    valor === "contribuicao" ||
    valor === "contribuição" ||
    valor === "contribuicoes" ||
    valor === "contribuições"
  ) {
    return "contribuicao";
  }

  if (
    valor === "especial" ||
    valor === "missao_especial" ||
    valor === "missão_especial" ||
    valor === "missoes_especiais" ||
    valor === "missões_especiais"
  ) {
    return "especial";
  }

  return null;
}

function normalizarMissao(missao) {
  if (!missao || typeof missao !== "object") {
    return null;
  }

  const tipo = normalizarTipo(
    missao.tipo
  );

  /*
   * Sistemas antigos de PvP/PvE não entram
   * no novo sistema oficial.
   */
  if (!tipo) {
    return null;
  }

  const recompensa = Number.isFinite(
    Number(missao.recompensa_xp)
  )
    ? Number(missao.recompensa_xp)
    : Number.isFinite(Number(missao.pontos))
      ? Number(missao.pontos)
      : 0;

  return {
    ...missao,

    id: String(
      missao.id ||
      `missao_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 8)}`
    ),

    tipo,

    titulo: String(
      missao.titulo ||
      missao.nome ||
      "Atividade sem título"
    ),

    descricao: String(
      missao.descricao ||
      ""
    ),

    recompensa_xp: recompensa,

    /*
     * O Dashboard antigo usava "pontos".
     * Mantemos o campo para compatibilidade,
     * mas o valor oficial é recompensa_xp.
     */
    pontos: recompensa,

    criado_por:
      missao.criado_por ??
      missao.criadoPor ??
      null,

    origem:
      missao.origem ||
      "lider",

    ativa:
      missao.ativa !== false,

    timestamp:
      missao.timestamp ??
      missao.criadoEm ??
      Date.now(),
  };
}

function normalizarSubmissao(submissao) {
  if (
    !submissao ||
    typeof submissao !== "object"
  ) {
    return null;
  }

  return {
    ...submissao,

    id: String(
      submissao.id ||
      `sub_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 8)}`
    ),

    missaoId: String(
      submissao.missaoId ||
      submissao.missao_id ||
      ""
    ),

    discordId: String(
      submissao.discordId ||
      submissao.userId ||
      ""
    ),

    nome:
      submissao.nome ||
      submissao.username ||
      "",

    status:
      submissao.status ||
      "pendente",

    criadoEm:
      submissao.criadoEm ??
      submissao.timestamp ??
      Date.now(),

    imagemBase64:
      submissao.imagemBase64 ||
      null,
  };
}

function comPadrao(conteudo) {
  const origem =
    conteudo &&
    typeof conteudo === "object"
      ? conteudo
      : {};

  return {
    ...origem,

    missoes: Array.isArray(
      origem.missoes
    )
      ? origem.missoes
          .map(normalizarMissao)
          .filter(Boolean)
      : [],

    submissoes: Array.isArray(
      origem.submissoes
    )
      ? origem.submissoes
          .map(normalizarSubmissao)
          .filter(Boolean)
      : [],
  };
}

function nomeTipo(tipo) {
  return TIPOS[tipo]?.nome || "Desconhecido";
}

function iconeTipo(tipo) {
  return TIPOS[tipo]?.icone || "•";
}

module.exports = {
  TIPOS,
  PADRAO,
  comPadrao,
  normalizarTipo,
  normalizarMissao,
  normalizarSubmissao,
  nomeTipo,
  iconeTipo,
};