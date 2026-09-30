const { lerSessao } = require("./lib/sessao");

const {
  buscarUsuario,
  buscarServidoresGerenciaveis,
  buscarBot,
  botEstaNoServidor,
} = require("./lib/discord");

exports.handler = async (event) => {
  const sessao = lerSessao(event);

  if (!sessao) {
    return {
      statusCode: 401,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        erro: "não autenticado",
      }),
    };
  }

  try {
    const [usuario, servidores, bot] = await Promise.all([
      buscarUsuario(sessao.access_token),
      buscarServidoresGerenciaveis(sessao.access_token),
      buscarBot(),
    ]);

    const servidoresComStatus = await Promise.all(
      servidores.map(async (g) => {
        let botPresente = false;
        let erroBot = null;

        try {
          botPresente = await botEstaNoServidor(g.id);
        } catch (erro) {
          erroBot = erro.message;
        }

        return {
          id: g.id,
          nome: g.name,
          icone: g.icon
            ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png`
            : null,

          bot_presente: botPresente,

          /*
           * Mantemos essa informação somente para diagnóstico.
           * O frontend não precisa exibi-la.
           */
          bot_id: bot?.id || null,

          /*
           * Se houver erro real na API, conseguimos descobrir
           * no retorno da função em vez de transformar o erro
           * em "bot não está aqui".
           */
          erro_bot: erroBot,
        };
      })
    );

    return {
      statusCode: 200,

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        usuario: {
          id: usuario.id,
          nome: usuario.username,
        },

        bot: {
          id: bot?.id || null,
          nome: bot?.username || null,
        },

        servidores: servidoresComStatus,
      }),
    };
  } catch (e) {
    return {
      statusCode: 500,

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        erro: e.message,
      }),
    };
  }
};