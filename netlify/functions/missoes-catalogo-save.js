const { carregarBlob, salvarBlob } = require("./lib/upstash");
const {
  PADRAO,
  comPadrao,
  obterGuild,
  normalizarTipo,
  normalizarMissao,
} = require("./lib/missoes-padrao");

const {
  autenticar,
  eGerente,
  respostaNaoAutorizado,
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

    if (!usuario || !eGerente(usuario)) {
      return respostaNaoAutorizado();
    }

    let corpo;

    try {
      corpo = JSON.parse(event.body || "{}");
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

    if (!Array.isArray(corpo.missoes)) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          erro: "O campo missoes deve ser uma lista.",
        }),
      };
    }

    const missoesNormalizadas = [];

    for (const item of corpo.missoes) {
      const tipo = normalizarTipo(item?.tipo);

      if (!tipo) {
        return {
          statusCode: 400,
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            erro: `Tipo de missão inválido: ${
              item?.tipo ?? "não informado"
            }.`,
          }),
        };
      }

      const missao = normalizarMissao({
        ...item,
        tipo,
      });

      if (!missao) {
        return {
          statusCode: 400,
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            erro: "Uma das missões enviadas é inválida.",
          }),
        };
      }

      missoesNormalizadas.push(missao);
    }

    /*
     * Carrega o armazenamento compartilhado.
     */
    const bruto = await carregarBlob(
      "missoes.json",
      PADRAO
    );

    const atual = comPadrao(bruto);

    /*
     * Obtém somente os dados da NÊMESIS.
     */
    const resultado = obterGuild(
      atual,
      GUILD_ID,
      true
    );

    const conteudo = resultado.conteudo;
    const guild = resultado.guild;

    /*
     * O catálogo pertence ao servidor.
     *
     * As submissões existentes são preservadas.
     */
    guild.missoes = missoesNormalizadas;

    guild.submissoes = Array.isArray(
      guild.submissoes
    )
      ? guild.submissoes
      : [];

    conteudo.guilds[GUILD_ID] = guild;

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
        total: missoesNormalizadas.length,
        missoes: missoesNormalizadas,
      }),
    };
  } catch (erro) {
    console.error(
      "Erro em missoes-catalogo-save:",
      erro
    );

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        erro: "Erro interno ao salvar o catálogo de missões.",
        detalhe: erro.message,
      }),
    };
  }
};