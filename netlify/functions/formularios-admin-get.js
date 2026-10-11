
const { lerSessao } = require("./lib/sessao");
const {
  usuarioGerenciaServidor,
  listarCargos,
  listarCanais,
} = require("./lib/discord");
const { carregarBlob, salvarBlob } = require("./lib/upstash");
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

    // Oculta somente os modelos antigos. Não modifica o banco durante uma requisição GET.
    const normalizarTitulo = (valor) =>
      String(valor || "")
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();

    const ehFormularioLegado = (formulario) => {
      const titulo = normalizarTitulo(
        formulario?.titulo_painel || formulario?.titulo || formulario?.nome
      );
      return (titulo.includes("staff") && !titulo.includes("processo seletivo")) ||
        (titulo.includes("parceria") && !titulo.includes("estabelecimento de alianca")) ||
        (titulo.includes("entrar") && titulo.includes("gangue"));
    };

    const formularios = (Array.isArray(formulariosGuild)
      ? formulariosGuild
      : []).filter((formulario) => !ehFormularioLegado(formulario));

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

    const formulariosNormalizados = formularios.map((formulario) => ({
      ...formulario,
      // Mantém compatibilidade com os nomes de campos usados pelo editor.
      titulo: formulario.titulo || formulario.titulo_painel || formulario.nome || "",
      descricao: formulario.descricao || formulario.descricao_painel || "",
      cargosNotificar: formulario.cargosNotificar || formulario.cargos_notificar || [],
      canalNotificacaoId: formulario.canalNotificacaoId || formulario.canal_notificacao_id || "",
    }));
    const formulariosPorId = new Map(
      formulariosNormalizados.map((formulario) => [String(formulario.id), formulario])
    );

    const respostasNormalizadas = respostas.map((resposta) => {
      const formulario = formulariosPorId.get(String(resposta.formulario_id));
      let itens = Array.isArray(resposta.itens) ? resposta.itens : null;

      if (!itens && Array.isArray(resposta.respostas)) {
        if (resposta.respostas.every((item) => item && typeof item === "object" && "resposta" in item)) {
          itens = resposta.respostas;
        } else {
          const perguntas = (formulario?.paginas || []).flatMap((pagina) => {
            const listaPerguntas = Array.isArray(pagina)
              ? pagina
              : Array.isArray(pagina?.perguntas)
                ? pagina.perguntas
                : [];
            return listaPerguntas.map((pergunta) =>
              typeof pergunta === "string"
                ? pergunta
                : String(pergunta?.texto || pergunta?.pergunta || "Pergunta")
            );
          });
          itens = resposta.respostas.map((valor, indice) => ({
            pergunta: perguntas[indice] || `Pergunta ${indice + 1}`,
            resposta: String(valor ?? "—"),
          }));
        }
      }

      const dataOriginal = Number(resposta.criadoEm || resposta.criado_em || resposta.timestamp || 0);
      const criadoEm = dataOriginal > 0 && dataOriginal < 1000000000000
        ? dataOriginal * 1000
        : dataOriginal;

      return {
        ...resposta,
        itens: itens || [],
        criadoEm,
        nome: resposta.nome || (resposta.autor_id ? `Usuário Discord ${resposta.autor_id}` : "Membro"),
        formTitulo: resposta.formTitulo || formulario?.titulo || formulario?.titulo_painel || formulario?.nome || "Formulário",
      };
    });

    return json(200, {
      ok: true,
      guildId: GUILD_ID_NEMESIS,
      formularios: formulariosNormalizados,
      respostas: respostasNormalizadas,
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
