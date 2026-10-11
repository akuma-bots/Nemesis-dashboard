
const { lerSessao } = require("./lib/sessao");
const {
  usuarioGerenciaServidor,
  listarCargos,
  listarCanais,
} = require("./lib/discord");
const { carregarBlob } = require("./lib/upstash");
const {
  PADRAO,
  comPadrao,
  obterGuild,
  GUILD_ID_NEMESIS,
} = require("./lib/formularios-padrao");

const json = (status, corpo) => ({
  statusCode: status,
  headers: {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  },
  body: JSON.stringify(corpo),
});

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "GET") {
      return json(405, {
        erro: "Método não permitido.",
      });
    }

    const sessao = lerSessao(event);

    if (!sessao) {
      return json(401, {
        erro: "Não autenticado.",
      });
    }

    const gerencia = await usuarioGerenciaServidor(
      sessao.access_token,
      GUILD_ID_NEMESIS
    );

    if (!gerencia) {
      return json(403, {
        erro: "Você não gerencia o servidor da NÊMESIS.",
      });
    }

    // Formulários: estrutura compartilhada com o bot.
    const formulariosDados = comPadrao(
      await carregarBlob("formularios.json", PADRAO)
    );

    const formulariosGuild = obterGuild(formulariosDados);

    const formularios = Array.isArray(formulariosGuild)
      ? formulariosGuild
      : [];

    // Respostas ficam em arquivo separado, como no bot.
    const respostasDados = await carregarBlob(
      "formularios_respostas.json",
      {}
    );

    const respostasGuild =
      respostasDados &&
      typeof respostasDados === "object" &&
      !Array.isArray(respostasDados)
        ? respostasDados[GUILD_ID_NEMESIS]
        : [];

    const respostas = Array.isArray(respostasGuild)
      ? respostasGuild
      : [];

    let cargos = [];
    let canais = [];

    try {
      const listaCargos = await listarCargos(
        GUILD_ID_NEMESIS
      );

      cargos = (Array.isArray(listaCargos) ? listaCargos : [])
        .filter(
          (cargo) =>
            cargo.id !== GUILD_ID_NEMESIS &&
            !cargo.managed
        )
        .sort(
          (a, b) =>
            (b.position || 0) - (a.position || 0)
        )
        .map((cargo) => ({
          id: String(cargo.id),
          nome: cargo.name,
        }));
    } catch (erro) {
      console.error(
        "[FORMULARIOS-ADMIN-GET] Falha ao listar cargos:",
        erro
      );
    }

    try {
      const listaCanais = await listarCanais(
        GUILD_ID_NEMESIS
      );

      canais = (Array.isArray(listaCanais) ? listaCanais : [])
        .filter((canal) => canal.type === 0)
        .map((canal) => ({
          id: String(canal.id),
          nome: canal.name,
        }));
    } catch (erro) {
      console.error(
        "[FORMULARIOS-ADMIN-GET] Falha ao listar canais:",
        erro
      );
    }

    return json(200, {
      ok: true,
      guildId: GUILD_ID_NEMESIS,
      formularios,
      respostas,
      cargos,
      canais,
    });
  } catch (erro) {
    console.error(
      "[FORMULARIOS-ADMIN-GET]",
      erro
    );

    return json(500, {
      erro: "Erro interno ao carregar os dados dos formulários.",
    });
  }
};
