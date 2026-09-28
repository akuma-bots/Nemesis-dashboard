exports.handler = async () => {
  const redirectUri = process.env.DISCORD_REDIRECT_URI || process.env.DISCORD_REDIRECT_URL;
  const params = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "identify guilds",
  });
  return {
    statusCode: 302,
    headers: { Location: `https://discord.com/oauth2/authorize?${params.toString()}` },
    body: "",
  };
};