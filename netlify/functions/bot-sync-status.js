const { lerSessao } = require("./lib/sessao");
const { usuarioGerenciaServidor } = require("./lib/discord");
const { carregarBlob, verificarConexao } = require("./lib/upstash");

const GUILD_ID_NEMESIS = "1543381737961160910";
const TOLERANCIA_MS = 3 * 60 * 1000;

function resposta(statusCode, dados) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
    body: JSON.stringify(dados),
  };
}

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return resposta(405, { ok: false, erro: "Método não permitido." });
  }

  try {
    const sessao = lerSessao(event);
    if (!sessao) {
      return resposta(401, { ok: false, erro: "Você precisa entrar pelo Discord." });
    }

    const gerencia = await usuarioGerenciaServidor(
      sessao.access_token,
      GUILD_ID_NEMESIS
    );

    if (!gerencia) {
      return resposta(403, {
        ok: false,
        erro: "Você precisa ter permissão de gerenciamento no servidor da NÊMESIS.",
      });
    }

    await verificarConexao();

    const status = await carregarBlob("integracao_bot_status.json", null);
    const ultimaAtualizacao = status?.updated_at
      ? Date.parse(status.updated_at)
      : NaN;
    const heartbeatRecente =
      Number.isFinite(ultimaAtualizacao) &&
      Date.now() - ultimaAtualizacao <= TOLERANCIA_MS &&
      Date.now() >= ultimaAtualizacao - 30_000;
    const botOnline = Boolean(
      heartbeatRecente &&
      status?.online === true &&
      String(status?.guild_id) === GUILD_ID_NEMESIS
    );

    return resposta(200, {
      ok: true,
      redisConectado: true,
      botOnline,
      servidorId: GUILD_ID_NEMESIS,
      botNome: status?.bot_name || null,
      servidorNome: status?.guild_name || null,
      ultimaAtualizacao: Number.isFinite(ultimaAtualizacao)
        ? new Date(ultimaAtualizacao).toISOString()
        : null,
      mensagem: botOnline
        ? "Bot e Dashboard estão acessando o mesmo Redis compartilhado."
        : "O Redis está acessível, mas ainda não foi recebido um heartbeat recente do bot. Confira as variáveis Upstash no Render e aguarde até 1 minuto após o bot iniciar.",
    });
  } catch (erro) {
    console.error("[BOT-SYNC-STATUS]", erro);
    return resposta(503, {
      ok: false,
      redisConectado: false,
      erro: "Não foi possível verificar a conexão compartilhada. Confira as variáveis do Upstash no Netlify.",
    });
  }
};
