const { carregarBlob } = require("./lib/upstash");
const {
  PADRAO,
  comPadrao,
  obterGuild,
  normalizarTipo,
} = require("./lib/missoes-padrao");

const GUILD_ID = "1543381737961160910";

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        erro: "Method Not Allowed",
      }),
    };
  }

  try {
    const bruto = await carregarBlob(
      "missoes.json",
      PADRAO
    );

    const atual = comPadrao(bruto);

    const resultado = obterGuild(
      atual,
      GUILD_ID,
      false
    );

    const guild = resultado.guild;

    if (!guild) {
      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
        body: JSON.stringify({
          guildId: GUILD_ID,
          missoes: [],
          tipos: [],
          total: 0,
        }),
      };
    }

    let missoes = Array.isArray(
      guild.missoes
    )
      ? guild.missoes
      : [];

    /*
     * Permite filtrar pelo tipo:
     *
     * ?tipo=missao
     * ?tipo=contribuicao
     * ?tipo=especial
     */
    const tipoParametro = event.queryStringParameters?.tipo;

    if (tipoParametro) {
      const tipo = normalizarTipo(
        tipoParametro
      );

      if (!tipo) {
        return {
          statusCode: 400,
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            erro: "Tipo de missão inválido.",
          }),
        };
      }

      missoes = missoes.filter(
        (missao) =>
          missao.tipo === tipo
      );
    }

    /*
     * O endpoint público retorna somente
     * missões ativas.
     */
    missoes = missoes.filter(
      (missao) =>
        missao.ativa !== false
    );

    const tipos = [
      ...new Set(
        missoes
          .map(
            (missao) =>
              missao.tipo
          )
          .filter(Boolean)
      ),
    ];

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
      body: JSON.stringify({
        guildId: GUILD_ID,
        missoes,
        tipos,
        total: missoes.length,
      }),
    };
  } catch (erro) {
    console.error(
      "Erro em missoes-get:",
      erro
    );

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        erro: "Erro interno ao carregar as missões.",
        detalhe: erro.message,
      }),
    };
  }
};