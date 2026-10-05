const { carregarBlob } = require("./lib/upstash");
const {
  PADRAO,
  comPadrao,
  TIPOS,
} = require("./lib/missoes-padrao");

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

    const dados = comPadrao(
      await carregarBlob(
        "missoes.json",
        PADRAO
      )
    );

    let missoes = dados.missoes.filter(
      (missao) => missao.ativa
    );

    /*
     * Filtro opcional:
     *
     * ?tipo=missao
     * ?tipo=contribuicao
     * ?tipo=especial
     */
    const tipo = String(
      event.queryStringParameters?.tipo ||
      ""
    )
      .trim()
      .toLowerCase();

    if (
      tipo &&
      Object.prototype.hasOwnProperty.call(
        TIPOS,
        tipo
      )
    ) {
      missoes = missoes.filter(
        (missao) =>
          missao.tipo === tipo
      );
    }

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

        missoes,

        tipos: TIPOS,

        total: missoes.length,
      }),
    };

  } catch (erro) {
    console.error(
      "[MISSOES-GET]",
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
          "Não foi possível carregar as missões.",
      }),
    };
  }
};