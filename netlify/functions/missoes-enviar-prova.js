const { carregarBlob, salvarBlob } = require("./lib/upstash");
const {
  PADRAO,
  comPadrao,
  obterGuild,
} = require("./lib/missoes-padrao");

const {
  autenticar,
} = require("./lib/auth");

const GUILD_ID = "1543381737961160910";

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        erro: "Method Not Allowed",
      }),
    };
  }

  try {
    const usuario = await autenticar(event);

    if (!usuario) {
      return {
        statusCode: 401,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          erro: "Não autenticado.",
        }),
      };
    }

    let corpo;

    try {
      corpo = JSON.parse(
        event.body || "{}"
      );
    } catch {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          erro: "JSON inválido.",
        }),
      };
    }

    const missaoId = String(
      corpo.missaoId || ""
    ).trim();

    const imagemBase64 = String(
      corpo.imagemBase64 || ""
    ).trim();

    if (!missaoId) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          erro: "missaoId é obrigatório.",
        }),
      };
    }

    if (!imagemBase64) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          erro: "A imagem da prova é obrigatória.",
        }),
      };
    }

    /*
     * Aceita somente imagens em Base64.
     */
    if (
      !imagemBase64.startsWith(
        "data:image/"
      )
    ) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          erro:
            "A prova precisa ser uma imagem válida.",
        }),
      };
    }

    /*
     * Limite de segurança para evitar
     * armazenar payloads gigantes no Redis.
     */
    if (imagemBase64.length > 2_100_000) {
      return {
        statusCode: 413,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          erro:
            "A imagem da prova é muito grande.",
        }),
      };
    }

    /*
     * Carrega o armazenamento compartilhado.
     */
    const bruto = await carregarBlob(
      "missoes.json",
      PADRAO
    );

    const atual = comPadrao(bruto);

    const resultado = obterGuild(
      atual,
      GUILD_ID,
      true
    );

    const conteudo = resultado.conteudo;
    const guild = resultado.guild;

    guild.missoes = Array.isArray(
      guild.missoes
    )
      ? guild.missoes
      : [];

    guild.submissoes = Array.isArray(
      guild.submissoes
    )
      ? guild.submissoes
      : [];

    /*
     * Localiza a missão.
     */
    const missao = guild.missoes.find(
      (item) =>
        String(item.id) ===
        missaoId
    );

    if (!missao) {
      return {
        statusCode: 404,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          erro: "Missão não encontrada.",
        }),
      };
    }

    if (missao.ativa === false) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          erro:
            "Esta missão não está mais ativa.",
        }),
      };
    }

    const discordId = String(
      usuario.discordId ||
        usuario.discord_id ||
        usuario.id ||
        ""
    ).trim();

    const nome =
      usuario.username ||
      usuario.nome ||
      usuario.globalName ||
      usuario.global_name ||
      "Jogador";

    if (!discordId) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          erro:
            "Não foi possível identificar seu Discord.",
        }),
      };
    }

    /*
     * Impede múltiplas provas pendentes
     * para a mesma missão.
     */
    const duplicada = guild.submissoes.find(
      (submissao) =>
        String(
          submissao.discordId
        ) === discordId &&
        String(
          submissao.missaoId
        ) === missaoId &&
        submissao.status === "pendente"
    );

    if (duplicada) {
      return {
        statusCode: 409,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          erro:
            "Você já possui uma prova pendente para esta missão.",
          submissao: duplicada,
        }),
      };
    }

    const recompensa = Number(
      missao.recompensa_xp ??
        missao.pontos ??
        0
    );

    const agora = Date.now();

    const submissao = {
      id: `sub_${agora}_${Math.random()
        .toString(36)
        .slice(2, 8)}`,

      missaoId,

      missaoTitulo:
        missao.titulo || "",

      missaoTipo:
        missao.tipo || null,

      missaoPontos:
        Number.isFinite(recompensa)
          ? recompensa
          : 0,

      recompensa_xp:
        Number.isFinite(recompensa)
          ? recompensa
          : 0,

      discordId,

      nome,

      imagemBase64,

      status: "pendente",

      criadoEm: agora,
    };

    guild.submissoes.push(
      submissao
    );

    conteudo.guilds[GUILD_ID] =
      guild;

    await salvarBlob(
      "missoes.json",
      conteudo
    );

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
      body: JSON.stringify({
        sucesso: true,

        guildId: GUILD_ID,

        submissao: {
          id: submissao.id,
          missaoId:
            submissao.missaoId,
          missaoTitulo:
            submissao.missaoTitulo,
          missaoTipo:
            submissao.missaoTipo,
          recompensa_xp:
            submissao.recompensa_xp,
          discordId:
            submissao.discordId,
          nome:
            submissao.nome,
          status:
            submissao.status,
          criadoEm:
            submissao.criadoEm,
        },
      }),
    };
  } catch (erro) {
    console.error(
      "Erro em missoes-enviar-prova:",
      erro
    );

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        erro:
          "Erro interno ao enviar a prova.",
        detalhe: erro.message,
      }),
    };
  }
};