const {
  trocarCodigoPorToken
} = require("./lib/discord");

const {
  criarCookieSessao
} = require("./lib/sessao");


exports.handler = async (event) => {

  const code =
    event.queryStringParameters &&
    event.queryStringParameters.code;


  if (!code) {

    return {
      statusCode: 302,

      headers: {
        Location: "/?erro=sem_codigo"
      },

      body: ""
    };

  }


  try {

    const tokenData =
      await trocarCodigoPorToken(code);


    if (
      !tokenData ||
      !tokenData.access_token
    ) {

      throw new Error(
        "Token OAuth inválido."
      );

    }


    return {

      statusCode: 302,

      headers: {

        Location: "/dashboard.html",

        "Set-Cookie":
          criarCookieSessao(
            tokenData.access_token,
            tokenData.expires_in
          )

      },

      body: ""

    };

  } catch (erro) {

    console.error(
      "Erro no callback OAuth:",
      erro
    );


    return {

      statusCode: 302,

      headers: {
        Location:
          "/?erro=Falha%20ao%20realizar%20o%20login."
      },

      body: ""

    };

  }

};