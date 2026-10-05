const { carregarBlob } = require("./lib/upstash");
const {
  PADRAO,
  comPadrao,
  obterGuild,
} = require("./lib/missoes-padrao");

const {
  autenticar,
  eGerente,
  respostaNaoAutorizado,
} = require("./lib/auth");

const GUILD_ID = "1543381737961160910";

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") {
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

    const bruto = await carregarBlob(
      "missoes.json",
      PADRAO
    );

    const atual = comPadrao(bruto);

    const resultado = obterGuild(
      atual,
      GUILD_ID,
      false
    );

    const guild = resultado.guild || {
      missoes: [],
      submissoes: [],
    };

    const missoes = Array.isArray(
      guild.missoes
    )
      ? guild.missoes
      : [];

    const submissoes = Array.isArray(
      guild.submissoes
    )
      ? guild.submissoes
      : [];

    const ativas = missoes.filter(
      (missao) =>
        missao.ativa !== false
    );

    const pendentes = submissoes.filter(
      (submissao) =>
        submissao.status === "pendente"
    );

    const aprovadas = submissoes.filter(
      (submissao) =>
        submissao.status === "aprovada"
    );

    const recusadas = submissoes.filter(
      (submissao) =>
        submissao.status === "recusada"
    );

    const porTipo = {
      missao: missoes.filter(
        (missao) =>
          missao.tipo === "missao"
      ).length,

      contribuicao: missoes.filter(
        (missao) =>
          missao.tipo === "contribuicao"
      ).length,

      especial: missoes.filter(
        (missao) =>
          missao.tipo === "especial"
      ).length,
    };

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
      body: JSON.stringify({
        guildId: GUILD_ID,

        tipos: {
          missao: "Missões",
          contribuicao: "Contribuições",
          especial: "Missões Especiais",
        },

        missoes,
        submissoes,

        totais: {
          missoes: missoes.length,
          ativas: ativas.length,

          submissoes: submissoes.length,
          pendentes: pendentes.length,
          aprovadas: aprovadas.length,
          recusadas: recusadas.length,

          porTipo,
        },
      }),
    };
  } catch (erro) {
    console.error(
      "Erro em missoes-admin-get:",
      erro
    );

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        erro:
          "Erro interno ao carregar os dados administrativos das missões.",
        detalhe: erro.message,
      }),
    };
  }
};