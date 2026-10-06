const { carregarBlob } = require("./lib/upstash");
const {
  PADRAO,
  comPadrao,
  obterGuild,
} = require("./lib/formularios-padrao");

const GUILD_ID_NEMESIS =
  "1543381737961160910";

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

    const dados = comPadrao(
      await carregarBlob(
        "formularios.json",
        PADRAO
      )
    );

    const formularios = obterGuild(dados);

    const ativos = Array.isArray(formularios)
      ? formularios.filter(
          (formulario) =>
            formulario &&
            formulario.ativo !== false
        )
      : [];

    const parametros =
      event.queryStringParameters || {};

    const id = parametros.id
      ? String(parametros.id)
      : null;

    if (id) {
      const formulario = ativos.find(
        (item) =>
          String(item.id) === id
      );

      if (!formulario) {
        return json(404, {
          erro:
            "Formulário não encontrado.",
        });
      }

      const publico = {
        id: String(
          formulario.id
        ),

        guild_id:
          String(
            formulario.guild_id ||
              GUILD_ID_NEMESIS
          ),

        nome:
          formulario.nome || "",

        titulo_painel:
          formulario.titulo_painel ||
          formulario.nome ||
          "",

        descricao_painel:
          formulario.descricao_painel ||
          "",

        banner_url:
          formulario.banner_url ||
          "",

        paginas:
          Array.isArray(
            formulario.paginas
          )
            ? formulario.paginas
            : [],

        ativo:
          formulario.ativo !== false,

        criado_em:
          formulario.criado_em ||
          null,

        atualizado_em:
          formulario.atualizado_em ||
          null,
      };

      return json(200, {
        formulario: publico,
      });
    }

    return json(200, {
      guildId:
        GUILD_ID_NEMESIS,

      formularios:
        ativos.map((formulario) => ({
          id: String(
            formulario.id
          ),

          nome:
            formulario.nome || "",

          titulo:
            formulario.titulo_painel ||
            formulario.nome ||
            "",

          descricao:
            formulario.descricao_painel ||
            "",

          titulo_painel:
            formulario.titulo_painel ||
            formulario.nome ||
            "",

          descricao_painel:
            formulario.descricao_painel ||
            "",

          banner_url:
            formulario.banner_url ||
            "",

          paginas:
            Array.isArray(
              formulario.paginas
            )
              ? formulario.paginas
              : [],

          ativo:
            formulario.ativo !== false,
        })),
    });
  } catch (erro) {
    console.error(
      "[FORMULARIOS-GET]",
      erro
    );

    return json(500, {
      erro:
        "Erro interno ao carregar os formulários.",
    });
  }
};