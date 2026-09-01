const { trocarCodigoPorToken } = require("./lib/discord");
const { criarCookieSessao } = require("./lib/sessao");

exports.handler = async (event) => {
  const code = event.queryStringParameters && event.queryStringParameters.code;
  if (!code) {
    return { statusCode: 302, headers: { Location: "/?erro=sem_codigo" }, body: "" };
  }

  try {
    const tokenData = await trocarCodigoPorToken(code);
    return {
      statusCode: 302,
      headers: {
        Location: "/dashboard.html",
        "Set-Cookie": criarCookieSessao(tokenData.access_token, tokenData.expires_in),
      },
      body: "",
    };
  } catch (e) {
    return { statusCode: 302, headers: { Location: `/?erro=${encodeURIComponent(e.message)}` }, body: "" };
  }
};
