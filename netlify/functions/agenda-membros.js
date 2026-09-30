const API = "https://discord.com/api/v10";

function respostaJSON(statusCode, corpo) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store, max-age=0"
    },
    body: JSON.stringify(corpo)
  };
}


exports.handler = async function () {

  try {

    const token =
      process.env.DISCORD_BOT_TOKEN;

    const guildId =
      process.env.DISCORD_GUILD_ID;


    if (!token) {

      console.error(
        "DISCORD_BOT_TOKEN não configurado."
      );

      return respostaJSON(
        500,
        {
          erro:
            "O token do bot não está configurado na Netlify."
        }
      );
    }


    if (!guildId) {

      console.error(
        "DISCORD_GUILD_ID não configurado."
      );

      return respostaJSON(
        500,
        {
          erro:
            "O ID do servidor não está configurado na Netlify."
        }
      );
    }


    const resposta =
      await fetch(
        `${API}/guilds/${guildId}?with_counts=true`,
        {
          method: "GET",

          headers: {
            Authorization:
              `Bot ${token}`,

            "Content-Type":
              "application/json"
          }
        }
      );


    if (!resposta.ok) {

      const texto =
        await resposta.text();


      console.error(
        "Discord API:",
        resposta.status,
        texto
      );


      if (resposta.status === 401) {

        return respostaJSON(
          500,
          {
            erro:
              "O token do bot é inválido ou expirou."
          }
        );
      }


      if (resposta.status === 403) {

        return respostaJSON(
          500,
          {
            erro:
              "O bot não possui acesso ao servidor."
          }
        );
      }


      if (resposta.status === 404) {

        return respostaJSON(
          500,
          {
            erro:
              "Servidor da NÊMESIS não encontrado."
          }
        );
      }


      return respostaJSON(
        500,
        {
          erro:
            `Discord retornou o erro ${resposta.status}.`
        }
      );
    }


    const servidor =
      await resposta.json();


    const membros =
      Number(
        servidor.approximate_member_count
      );


    if (!Number.isFinite(membros)) {

      console.error(
        "Discord não retornou approximate_member_count:",
        servidor
      );


      return respostaJSON(
        500,
        {
          erro:
            "O Discord não retornou a quantidade de membros."
        }
      );
    }


    return respostaJSON(
      200,
      {
        membros,

        servidor: {
          id: servidor.id,
          nome: servidor.name
        },

        atualizadoEm:
          new Date().toISOString()
      }
    );


  } catch (erro) {

    console.error(
      "Erro na função agenda-membros:",
      erro
    );


    return respostaJSON(
      500,
      {
        erro:
          "Erro interno ao consultar os membros do servidor."
      }
    );
  }
};