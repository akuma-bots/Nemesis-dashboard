const { lerSessao } = require("./lib/sessao");
const { usuarioGerenciaServidor } = require("./lib/discord");
const { carregarBlob, salvarBlob } = require("./lib/upstash");
const {
  PADRAO,
  comPadrao,
  normalizarFormulario,
  GUILD_ID_NEMESIS,
} = require("./lib/formularios-padrao");

const TIPOS = ["curta", "longa", "escolha"];

const json = (status, corpo) => ({
  statusCode: status,
  headers: {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  },
  body: JSON.stringify(corpo),
});

const lista = (valor) =>
  Array.isArray(valor) ? valor : [];

function normalizarPergunta(pergunta) {
  const q =
    pergunta &&
    typeof pergunta === "object"
      ? pergunta
      : {};

  return {
    id: String(
      q.id ||
        `pergunta-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}`
    ),

    texto: String(
      q.texto ||
        q.pergunta ||
        ""
    ).slice(0, 300),

    tipo: TIPOS.includes(q.tipo)
      ? q.tipo
      : "curta",

    obrigatoria:
      !!q.obrigatoria,

    opcoes: lista(q.opcoes)
      .map((opcao) =>
        String(opcao).trim()
      )
      .filter(Boolean)
      .slice(0, 25),
  };
}

function normalizarPagina(pagina) {
  const p =
    pagina &&
    typeof pagina === "object"
      ? pagina
      : {};

  return {
    titulo: String(
      p.titulo || ""
    ).slice(0, 120),

    perguntas: lista(
      p.perguntas
    ).map(normalizarPergunta),
  };
}

function normalizarFormularioDashboard(formulario) {
  const f =
    formulario &&
    typeof formulario === "object"
      ? formulario
      : {};

  return normalizarFormulario({
    ...f,

    guild_id:
      GUILD_ID_NEMESIS,

    id: String(
      f.id ||
        `form-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}`
    ),

    nome:
      f.nome ||
      f.titulo ||
      "",

    titulo_painel:
      f.titulo_painel ||
      f.titulo ||
      f.nome ||
      "",

    descricao_painel:
      f.descricao_painel ||
      f.descricao ||
      "",

    banner_url:
      f.banner_url ||
      f.banner ||
      "",

    ativo:
      f.ativo !== false,

    cargos_notificar:
      lista(
        f.cargos_notificar ||
          f.cargosNotificar
      ).map(String),

    canal_notificacao_id:
      f.canal_notificacao_id ||
      f.canalNotificacaoId ||
      null,

    paginas: lista(
      f.paginas
    ).map(normalizarPagina),

    criado_por:
      f.criado_por ||
      f.criadoPor ||
      null,

    timestamp:
      f.timestamp ||
      Date.now(),

    criado_em:
      f.criado_em ||
      Date.now(),
  });
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return json(405, {
        erro: "Método não permitido.",
      });
    }

    const sessao = lerSessao(event);

    if (!sessao) {
      return json(401, {
        erro: "Não autenticado.",
      });
    }

    const gerencia =
      await usuarioGerenciaServidor(
        sessao.access_token,
        GUILD_ID_NEMESIS
      );

    if (!gerencia) {
      return json(403, {
        erro:
          "Você não gerencia o servidor da NÊMESIS.",
      });
    }

    let corpo = {};

    try {
      corpo = JSON.parse(
        event.body || "{}"
      );
    } catch {
      return json(400, {
        erro: "JSON inválido.",
      });
    }

    if (
      !Array.isArray(
        corpo.formularios
      )
    ) {
      return json(400, {
        erro:
          "formularios precisa ser uma lista.",
      });
    }

    const existentes = comPadrao(
      await carregarBlob(
        "formularios.json",
        PADRAO
      )
    );

    const atuais =
      Array.isArray(
        existentes[
          GUILD_ID_NEMESIS
        ]
      )
        ? existentes[
            GUILD_ID_NEMESIS
          ]
        : [];

    const enviados =
      corpo.formularios.map(
        normalizarFormularioDashboard
      );

    const mapa = new Map();

    for (const formulario of atuais) {
      if (!formulario?.id) continue;

      mapa.set(
        String(formulario.id),
        formulario
      );
    }

    for (const formulario of enviados) {
      const id = String(
        formulario.id
      );

      const anterior =
        mapa.get(id);

      if (anterior) {
        formulario.criado_em =
          anterior.criado_em ||
          formulario.criado_em;

        formulario.criado_por =
          anterior.criado_por ||
          formulario.criado_por;

        formulario.timestamp =
          anterior.timestamp ||
          formulario.timestamp;
      }

      mapa.set(
        id,
        formulario
      );
    }

    const formulariosFinais =
      Array.from(
        mapa.values()
      );

    existentes[
      GUILD_ID_NEMESIS
    ] = formulariosFinais;

    delete existentes.formularios;

    await salvarBlob(
      "formularios.json",
      existentes
    );

    return json(200, {
      ok: true,

      guildId:
        GUILD_ID_NEMESIS,

      quantidade:
        formulariosFinais.length,

      formularios:
        formulariosFinais,
    });
  } catch (erro) {
    console.error(
      "[FORMULARIOS-SAVE]",
      erro
    );

    return json(500, {
      erro:
        "Erro interno ao salvar os formulários.",
    });
  }
};