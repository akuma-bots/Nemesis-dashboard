const {
  lerSessao,
} = require("./lib/sessao");

const {
  usuarioGerenciaServidor,
} = require("./lib/discord");

const {
  carregarBlob,
  salvarBlob,
} = require("./lib/upstash");

const {
  PADRAO,
  comPadrao,
  normalizarTipo,
  normalizarMissao,
} = require("./lib/missoes-padrao");

const GUILD_ID_NEMESIS =
  "1543381737961160910";

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        body: JSON.stringify({
          erro: "Método não permitido.",
        }),
      };
    }

    const sessao =
      lerSessao(event);

    if (!sessao) {
      return {
        statusCode: 401,
        body: JSON.stringify({
          erro:
            "Você precisa estar autenticado.",
        }),
      };
    }

    const gerencia =
      await usuarioGerenciaServidor(
        sessao.access_token,
        GUILD_ID_NEMESIS
      );

    if (!gerencia) {
      return {
        statusCode: 403,
        body: JSON.stringify({
          erro:
            "Você não gerencia o servidor da NÊMESIS.",
        }),
      };
    }

    const corpo =
      JSON.parse(
        event.body || "{}"
      );

    if (
      !Array.isArray(
        corpo.missoes
      )
    ) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          erro:
            "missoes precisa ser uma lista.",
        }),
      };
    }

    const missoes = [];

    for (
      const item of corpo.missoes
    ) {
      const tipo =
        normalizarTipo(
          item?.tipo
        );

      if (!tipo) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            erro:
              "Tipo de missão inválido.",
            permitido: [
              "missao",
              "contribuicao",
              "especial",
            ],
          }),
        };
      }

      const missao =
        normalizarMissao({
          ...item,
          tipo,
        });

      if (!missao) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            erro:
              "Uma das missões possui dados inválidos.",
          }),
        };
      }

      missoes.push(
        missao
      );
    }

    const atual =
      comPadrao(
        await carregarBlob(
          "missoes.json",
          PADRAO
        )
      );

    /*
     * O Dashboard altera somente o catálogo.
     * As submissões existentes são preservadas.
     */
    const novo = {
      ...atual,
      missoes,
    };

    await salvarBlob(
      "missoes.json",
      novo
    );

    return {
      statusCode: 200,

      headers: {
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify({
        ok: true,
        missoes:
          novo.missoes,
      }),
    };

  } catch (erro) {
    console.error(
      "[MISSOES-CATALOGO-SAVE]",
      erro
    );

    return {
      statusCode: 500,

      headers: {
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify({
        ok: false,
        erro:
          "Não foi possível salvar as missões.",
      }),
    };
  }
};