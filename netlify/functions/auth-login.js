const {
  criarEstadoOAuth,
  criarCookieEstadoOAuth,
} = require("./lib/sessao");

exports.handler = async () => {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const redirectUri = process.env.DISCORD_REDIRECT_URI || process.env.DISCORD_REDIRECT_URL;

  if (!clientId || !redirectUri) {
    console.error("[AUTH-LOGIN] DISCORD_CLIENT_ID ou redirect URI não configurado.");
    return {
      statusCode: 500,
      headers: { "Content-Type": "text/plain", "Cache-Control": "no-store" },
      body: "O login está temporariamente indisponível. A equipe técnica precisa verificar a configuração OAuth.",
    };
  }

  const state = criarEstadoOAuth();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "identify guilds",
    state,
  });

  return {
    statusCode: 302,
    headers: {
      Location: `https://discord.com/oauth2/authorize?${params.toString()}`,
      "Set-Cookie": criarCookieEstadoOAuth(state),
      "Cache-Control": "no-store",
    },
    body: "",
  };
};
