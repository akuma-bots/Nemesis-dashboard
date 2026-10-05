const {
  lerSessao,
} = require("./lib/sessao");

const {
  buscarUsuario,
} = require("./lib/discord");

const {
  carregarBlob,
  salvarBlob,
} = require("./lib/upstash");

const {
  PADRAO,
  comPadrao,
} = require("./lib/missoes-padrao");

const LIMITE_BASE64 =
  2_100_000;

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        body: JSON.stringify({
          erro:
            "Método não permitido.",
        }),
      };
    }

    const sessao =
      lerSessao(event);

    if (!sessao) {
      return {
        statusCode: 401,
        body: JSON.stringify({
          erro:
            "Você precisa estar autenticado.",
        }),
      };
    }

    const corpo =
      JSON.parse(
        event.body || "{}"
      );

    const missaoId =
      String(
        corpo.missaoId || ""
      ).trim();

    const imagemBase64 =
      corpo.imagemBase64;

    if (
      !missaoId ||
      !imagemBase64
    ) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          erro:
            "missaoId e imagemBase64 são obrigatórios.",
        }),
      };
    }

    if (
      typeof imagemBase64 !==
      "string"
    ) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          erro:
            "A imagem precisa ser enviada em base64.",
        }),
      };
    }

    if (
      imagemBase64.length >
      LIMITE_BASE64
    ) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          erro:
            "Imagem muito grande. Envie um print de até 1.5MB.",
        }),
      };
    }

    const usuario =
      await buscarUsuario(
        sessao.access_token
      );

    if (!usuario?.id) {
      return {
        statusCode: 401,
        body: JSON.stringify({
          erro:
            "Não foi possível identificar sua conta Discord.",
        }),
      };
    }

    const atual =
      comPadrao(
        await carregarBlob(
          "missoes.json",
          PADRAO
        )
      );

    const missao =
      atual.missoes.find(
        (item) =>
          item.id ===
          missaoId
      );

    if (
      !missao ||
      !missao.ativa
    ) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          erro:
            "Essa missão não existe ou não está mais ativa.",
        }),
      };
    }

    /*
     * Evita que o mesmo usuário mantenha
     * várias provas pendentes para a mesma missão.
     */
    const jaPendente =
      atual.submissoes.some(
        (submissao) =>
          submissao.missaoId ===
            missaoId &&
          String(
            submissao.discordId
          ) ===
            String(usuario.id) &&
          submissao.status ===
            "pendente"
      );

    if (jaPendente) {
      return {
        statusCode: 409,
        body: JSON.stringify({
          erro:
            "Você já possui uma prova pendente para esta missão.",
        }),
      };
    }

    const submissao = {
      id:
        `sub_${Date.now()}_${Math.random()
          .toString(36)
          .slice(2, 8)}`,

      missaoId:
        missao.id,

      missaoTitulo:
        missao.titulo,

      missaoTipo:
        missao.tipo,

      missaoPontos:
        Number(
          missao.recompensa_xp || 0
        ),

      recompensa_xp:
        Number(
          missao.recompensa_xp || 0
        ),

      discordId:
        String(usuario.id),

      nome:
        usuario.username ||
        usuario.global_name ||
        String(usuario.id),

      imagemBase64,

      status:
        "pendente",

      criadoEm:
        Date.now(),
    };

    atual.submissoes.push(
      submissao
    );

    await salvarBlob(
      "missoes.json",
      atual
    );

    return {
      statusCode: 200,

      headers: {
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify({
        ok: true,

        submissao: {
          id:
            submissao.id,

          missaoId:
            submissao.missaoId,

          missaoTitulo:
            submissao.missaoTitulo,

          missaoTipo:
            submissao.missaoTipo,

          status:
            submissao.status,

          criadoEm:
            submissao.criadoEm,
        },
      }),
    };

  } catch (erro) {
    console.error(
      "[MISSOES-ENVIAR-PROVA]",
      erro
    );

    return {
      statusCode: 500,

      headers: {
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify({
        ok: false,
        erro:
          "Não foi possível enviar a prova.",
      }),
    };
  }
};