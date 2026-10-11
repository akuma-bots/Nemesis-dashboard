
const { lerSessao } = require("./sessao");
const {
  buscarUsuario,
  buscarServidoresGerenciaveis,
} = require("./discord");

const GUILD_ID = String(
  process.env.DISCORD_GUILD_ID || "1543381737961160910"
);

async function autenticar(event) {
  const sessao = lerSessao(event);

  if (!sessao || !sessao.access_token) {
    return null;
  }

  try {
    const [usuario, servidores] = await Promise.all([
      buscarUsuario(sessao.access_token),
      buscarServidoresGerenciaveis(sessao.access_token),
    ]);

    if (!usuario || !usuario.id) {
      return null;
    }

    const gerente = servidores.some(
      (servidor) => String(servidor.id) === GUILD_ID
    );

    return {
      ...usuario,
      id: String(usuario.id),
      discordId: String(usuario.id),
      discord_id: String(usuario.id),
      username: usuario.username || "",
      globalName: usuario.global_name || null,
      global_name: usuario.global_name || null,
      gerente,
    };
  } catch (erro) {
    console.error(
      "Falha ao autenticar sessão:",
      erro.message
    );

    return null;
  }
}

function eGerente(usuario) {
  return Boolean(usuario && usuario.gerente);
}

function respostaNaoAutorizado() {
  return {
    statusCode: 403,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
    body: JSON.stringify({
      erro:
        "Você precisa gerenciar o servidor da NÊMESIS para realizar esta ação.",
    }),
  };
}

module.exports = {
  autenticar,
  eGerente,
  respostaNaoAutorizado,
};
