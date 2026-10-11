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
    const idadeSegundos = Number.isFinite(ultimaAtualizacao)
      ? Math.round((Date.now() - ultimaAtualizacao) / 1000)
      : null;
    const timestampValido =
      Number.isFinite(ultimaAtualizacao) &&
      Date.now() >= ultimaAtualizacao - 30_000;
    const heartbeatRecente =
      timestampValido &&
      Date.now() - ultimaAtualizacao <= TOLERANCIA_MS;
    const guildIdConfere =
      String(status?.guild_id || "") === GUILD_ID_NEMESIS;
    const flagOnline = status?.online === true;
    const botOnline = Boolean(
      heartbeatRecente && flagOnline && guildIdConfere
    );

    let diagnostico;
    if (!status) {
      diagnostico = "HEARTBEAT_AUSENTE";
    } else if (!timestampValido) {
      diagnostico = "TIMESTAMP_INVALIDO";
    } else if (!guildIdConfere) {
      diagnostico = "GUILD_ID_DIFERENTE";
    } else if (!flagOnline) {
      diagnostico = "BOT_NAO_PRONTO_OU_SERVIDOR_NAO_ENCONTRADO";
    } else if (!heartbeatRecente) {
      diagnostico = "HEARTBEAT_EXPIRADO";
    } else {
      diagnostico = "OK";
    }

    return resposta(200, {
      ok: true,
      redisConectado: true,
      botOnline,
      diagnostico,
      heartbeatEncontrado: Boolean(status),
      timestampValido,
      heartbeatRecente,
      guildIdConfere,
      flagOnline,
      idadeSegundos,
      servidorId: GUILD_ID_NEMESIS,
      guildIdHeartbeat: status?.guild_id || null,
      botNome: status?.bot_name || null,
      servidorNome: status?.guild_name || null,
      ultimaAtualizacao: Number.isFinite(ultimaAtualizacao)
        ? new Date(ultimaAtualizacao).toISOString()
        : null,
      mensagem: botOnline
        ? "Bot e Dashboard estão acessando o mesmo Redis compartilhado."
        : diagnostico === "HEARTBEAT_AUSENTE"
          ? "A chave integracao_bot_status.json não existe no Redis. O bot pode não ter publicado o heartbeat, estar usando outro banco ou ainda não ter feito deploy da versão atual."
          : diagnostico === "GUILD_ID_DIFERENTE"
            ? "O heartbeat existe, mas o ID do servidor salvo pelo bot não corresponde ao servidor configurado no Dashboard."
            : diagnostico === "BOT_NAO_PRONTO_OU_SERVIDOR_NAO_ENCONTRADO"
              ? "O heartbeat existe, mas o bot marcou online=false. Verifique NEMESIS_GUILD_ID e os logs de conexão do Discord no Render."
              : diagnostico === "HEARTBEAT_EXPIRADO"
                ? "O último heartbeat tem mais de 3 minutos. Verifique se o processo do bot continua ativo no Render."
                : "O timestamp do heartbeat é inválido. Confira a versão em execução do bot.",
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
