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
  guilds: {},
};

function normalizarTipo(tipo) {
  const valor = String(tipo || "")
    .trim()
    .toLowerCase();

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

  const tipo = normalizarTipo(missao.tipo);

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
      missao.descricao || ""
    ),

    recompensa_xp: recompensa,

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

function normalizarGuild(guild) {
  const origem =
    guild &&
    typeof guild === "object"
      ? guild
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

function comPadrao(conteudo) {
  const origem =
    conteudo &&
    typeof conteudo === "object"
      ? conteudo
      : {};

  /*
   * Novo formato compartilhado:

   {
     "guilds": {
       "ID_DO_SERVIDOR": {
         "missoes": [],
         "submissoes": []
       }
     }
   }
   */

  if (
    origem.guilds &&
    typeof origem.guilds === "object" &&
    !Array.isArray(origem.guilds)
  ) {
    const guilds = {};

    for (const [guildId, guild] of Object.entries(
      origem.guilds
    )) {
      guilds[String(guildId)] =
        normalizarGuild(guild);
    }

    return {
      ...origem,
      guilds,
    };
  }

  /*
   * Compatibilidade com o formato antigo
   * utilizado pelo Dashboard.
   */
  if (
    Array.isArray(origem.missoes) ||
    Array.isArray(origem.submissoes)
  ) {
    return {
      guilds: {},
      _legado: {
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
      },
    };
  }

  /*
   * Compatibilidade com o formato antigo
   * do Bot:
   *
   * {
   *   "guildId": [...]
   * }
   */
  const guilds = {};

  for (const [chave, valor] of Object.entries(
    origem
  )) {
    if (!Array.isArray(valor)) {
      continue;
    }

    guilds[String(chave)] = {
      missoes: valor
        .map(normalizarMissao)
        .filter(Boolean),

      submissoes: [],
    };
  }

  return {
    guilds,
  };
}

function obterGuild(
  conteudo,
  guildId,
  criar = true
) {
  const normalizado = comPadrao(
    conteudo
  );

  const chave = String(guildId);

  if (
    !normalizado.guilds[chave] &&
    criar
  ) {
    normalizado.guilds[chave] = {
      missoes: [],
      submissoes: [],
    };
  }

  return {
    conteudo: normalizado,
    guild:
      normalizado.guilds[chave] ||
      null,
  };
}

function nomeTipo(tipo) {
  return (
    TIPOS[tipo]?.nome ||
    "Desconhecido"
  );
}

function iconeTipo(tipo) {
  return (
    TIPOS[tipo]?.icone ||
    "•"
  );
}

module.exports = {
  TIPOS,
  PADRAO,
  comPadrao,
  obterGuild,
  normalizarTipo,
  normalizarMissao,
  normalizarSubmissao,
  normalizarGuild,
  nomeTipo,
  iconeTipo,
};