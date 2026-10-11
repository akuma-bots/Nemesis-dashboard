const { trocarCodigoPorToken } = require("./lib/discord");
const {
  criarCookieSessao,
  validarEstadoOAuth,
  cookieLimparEstadoOAuth,
} = require("./lib/sessao");

exports.handler = async (event) => {
  const parametros = event.queryStringParameters || {};
  const code = parametros.code;
  const state = parametros.state;

  if (!code || !state || !validarEstadoOAuth(event, state)) {
    return {
      statusCode: 302,
      headers: {
        Location: "/login.html?erro=validacao_oauth",
        "Set-Cookie": cookieLimparEstadoOAuth(),
        "Cache-Control": "no-store",
      },
      body: "",
    };
  }

  try {
    const tokenData = await trocarCodigoPorToken(code);
    if (!tokenData || typeof tokenData.access_token !== "string" || !tokenData.access_token) {
      throw new Error("Token OAuth inválido.");
    }

    const expiracao = Number(tokenData.expires_in);
    if (!Number.isFinite(expiracao) || expiracao <= 0) {
      throw new Error("Expiração do token OAuth inválida.");
    }

    return {
      statusCode: 302,
      headers: {
        Location: "/dashboard.html",
        "Set-Cookie": [
          criarCookieSessao(tokenData.access_token, expiracao),
          cookieLimparEstadoOAuth(),
        ],
        "Cache-Control": "no-store",
      },
      body: "",
    };
  } catch (erro) {
    console.error("[AUTH-CALLBACK] Erro ao concluir login OAuth:", erro.message);
    return {
      statusCode: 302,
      headers: {
        Location: "/login.html?erro=Falha%20ao%20realizar%20o%20login.",
        "Set-Cookie": cookieLimparEstadoOAuth(),
        "Cache-Control": "no-store",
      },
      body: "",
    };
  }
};
