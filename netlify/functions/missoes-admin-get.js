const {
  lerSessao,
} = require("./lib/sessao");

const {
  usuarioGerenciaServidor,
} = require("./lib/discord");

const {
  carregarBlob,
} = require("./lib/upstash");

const {
  PADRAO,
  comPadrao,
  TIPOS,
} = require("./lib/missoes-padrao");

const GUILD_ID_NEMESIS =
  "1543381737961160910";

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "GET") {
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

    const dados =
      comPadrao(
        await carregarBlob(
          "missoes.json",
          PADRAO
        )
      );

    return {
      statusCode: 200,

      headers: {
        "Content-Type":
          "application/json",

        "Cache-Control":
          "no-store",
      },

      body: JSON.stringify({
        ok: true,

        guildId:
          GUILD_ID_NEMESIS,

        tipos: TIPOS,

        missoes:
          dados.missoes,

        submissoes:
          dados.submissoes,

        totalMissoes:
          dados.missoes.length,

        totalAtivas:
          dados.missoes.filter(
            (m) => m.ativa
          ).length,

        totalSubmissoes:
          dados.submissoes.length,

        pendentes:
          dados.submissoes.filter(
            (s) =>
              s.status ===
              "pendente"
          ).length,
      }),
    };

  } catch (erro) {
    console.error(
      "[MISSOES-ADMIN-GET]",
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
          "Erro ao carregar os dados das missões.",
      }),
    };
  }
};