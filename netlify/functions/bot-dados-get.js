const { lerSessao } = require("./lib/sessao");
const { usuarioGerenciaServidor } = require("./lib/discord");
const { carregarBlob } = require("./lib/upstash");

const GUILD_ID_NEMESIS = "1543381737961160910";

/*
 * ============================================================
 * NÊMESIS — PONTE SHINKU ↔ DASHBOARD
 * ============================================================
 *
 * O Shinku e o Dashboard utilizam o mesmo Upstash Redis.
 *
 * Este endpoint permite que o Dashboard consulte os dados
 * persistentes utilizados pelo bot.
 *
 * Nenhum token do Upstash é enviado ao navegador.
 *
 * Acesso:
 * - usuário precisa estar autenticado;
 * - usuário precisa gerenciar o servidor da NÊMESIS.
 *
 * ============================================================
 */

const ARQUIVOS_PERMITIDOS = new Set([
  // ==========================================================
  // CONFIGURAÇÃO
  // ==========================================================

  "guild_configs.json",

  // ==========================================================
  // PERFIS / PONTUAÇÃO
  // ==========================================================

  "competitivo.json",
  "perfis.json",
  "patentes_config.json",

  // ==========================================================
  // MISSÕES
  // ==========================================================

  "missoes.json",

  // ==========================================================
  // REVISÕES
  // ==========================================================

  "revisoes.json",

  // ==========================================================
  // COMPETITIVO
  // ==========================================================

  "desafios.json",
  "lutas.json",

  // ==========================================================
  // RECORDES
  // ==========================================================

  "recordes.json",

  // ==========================================================
  // EVENTOS
  // ==========================================================

  "eventos.json",
  "sorteios.json",
  "guerras.json",
  "temporadas.json",

  // ==========================================================
  // COMUNIDADE
  // ==========================================================

  "parcerias.json",

  // ==========================================================
  // FORMULÁRIOS
  // ==========================================================

  "formularios.json",
  "formularios_respostas.json",

  // ==========================================================
  // MODERAÇÃO
  // ==========================================================

  "punicoes.json",

  // ==========================================================
  // TICKETS
  // ==========================================================

  "tickets.json",

  // ==========================================================
  // SISTEMAS AUTOMÁTICOS
  // ==========================================================

  "contadores.json",
]);


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
  try {

    // ========================================================
    // MÉTODO
    // ========================================================

    if (event.httpMethod !== "GET") {

      return resposta(405, {
        ok: false,
        erro: "Método não permitido.",
      });

    }


    // ========================================================
    // AUTENTICAÇÃO
    // ========================================================

    const sessao = lerSessao(event);

    if (!sessao) {

      return resposta(401, {
        ok: false,
        erro: "Você precisa estar autenticado.",
      });

    }


    // ========================================================
    // AUTORIZAÇÃO
    // ========================================================

    const gerencia = await usuarioGerenciaServidor(
      sessao.access_token,
      GUILD_ID_NEMESIS
    );

    if (!gerencia) {

      return resposta(403, {
        ok: false,
        erro:
          "Você não possui permissão para gerenciar o servidor da NÊMESIS.",
      });

    }


    // ========================================================
    // ARQUIVO SOLICITADO
    // ========================================================

    const arquivo = String(
      event.queryStringParameters?.arquivo || ""
    ).trim();


    if (!arquivo) {

      return resposta(400, {
        ok: false,
        erro: "Informe o arquivo que deseja consultar.",

        exemplo:
          "/.netlify/functions/bot-dados-get?arquivo=formularios_respostas.json",

        arquivos:
          [...ARQUIVOS_PERMITIDOS],
      });

    }


    // ========================================================
    // VALIDAÇÃO
    // ========================================================

    if (!ARQUIVOS_PERMITIDOS.has(arquivo)) {

      return resposta(400, {
        ok: false,
        erro:
          "Esse arquivo não está disponível para consulta.",

        arquivos:
          [...ARQUIVOS_PERMITIDOS],
      });

    }


    // ========================================================
    // UPSTASH
    // ========================================================

    const dados = await carregarBlob(
      arquivo,
      {}
    );


    // ========================================================
    // RESPOSTA
    // ========================================================

    return resposta(200, {
      ok: true,

      guildId:
        GUILD_ID_NEMESIS,

      arquivo,

      dados,
    });

  } catch (erro) {

    console.error(
      "[BOT-DADOS-GET]",
      erro
    );

    return resposta(500, {
      ok: false,

      erro:
        "Erro interno ao consultar os dados da NÊMESIS.",

      detalhe:
        process.env.NODE_ENV === "development"
          ? erro.message
          : undefined,
    });

  }
};