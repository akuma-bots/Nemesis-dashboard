const { lerSessao } = require("./lib/sessao");
const { buscarUsuario, buscarServidoresGerenciaveis, botEstaNoServidor } = require("./lib/discord");

exports.handler = async (event) => {
  const sessao = lerSessao(event);
  if (!sessao) return { statusCode: 401, body: JSON.stringify({ erro: "não autenticado" }) };

  try {
    const [usuario, servidores] = await Promise.all([
      buscarUsuario(sessao.access_token),
      buscarServidoresGerenciaveis(sessao.access_token),
    ]);

    const servidoresComStatus = await Promise.all(
      servidores.map(async (g) => ({
        id: g.id,
        nome: g.name,
        icone: g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png` : null,
        bot_presente: await botEstaNoServidor(g.id),
      }))
    );

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usuario: { id: usuario.id, nome: usuario.username }, servidores: servidoresComStatus }),
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ erro: e.message }) };
  }
};
