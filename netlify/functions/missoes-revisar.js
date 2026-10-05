const { carregarBlob, salvarBlob } = require("./lib/upstash");
const { comPadrao } = require("./lib/missoes-padrao");
const {
  autenticar,
  eGerente,
  respostaNaoAutorizado,
} = require("./lib/auth");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          erro: "JSON inválido.",
        }),
      };
    }

    const submissaoId = String(corpo.submissaoId || "").trim();
    const decisao = String(corpo.decisao || "").trim().toLowerCase();
    const motivoRecusa = String(corpo.motivoRecusa || "").trim();

    if (!submissaoId) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          erro: "submissaoId é obrigatório.",
        }),
      };
    }

    if (!["aprovar", "recusar"].includes(decisao)) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          erro: 'decisao deve ser "aprovar" ou "recusar".',
        }),
      };
    }

    const missoesData = comPadrao(
      await carregarBlob("missoes.json", {
        missoes: [],
        submissoes: [],
      })
    );

    const submissao = missoesData.submissoes.find(
      (item) => String(item.id) === submissaoId
    );

    if (!submissao) {
      return {
        statusCode: 404,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          erro: "Submissão não encontrada.",
        }),
      };
    }

    /*
     * Impede que uma submissão já analisada receba
     * a recompensa novamente.
     */
    if (submissao.status !== "pendente") {
      return {
        statusCode: 409,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          erro: "Esta submissão já foi analisada.",
          status: submissao.status,
        }),
      };
    }

    const agora = Date.now();

    /*
     * Dados do gerente que realizou a análise.
     */
    const revisorDiscordId =
      usuario.discordId ||
      usuario.discord_id ||
      usuario.id ||
      null;

    const revisorNome =
      usuario.username ||
      usuario.nome ||
      usuario.globalName ||
      usuario.global_name ||
      null;

    /*
     * RECUSA
     */
    if (decisao === "recusar") {
      submissao.status = "recusada";
      submissao.motivoRecusa = motivoRecusa || "Submissão recusada.";
      submissao.revisadoEm = agora;
      submissao.revisadoPor = revisorDiscordId;
      submissao.revisorNome = revisorNome;

      /*
       * A imagem não precisa permanecer armazenada
       * depois que a submissão foi analisada.
       */
      delete submissao.imagemBase64;

      await salvarBlob("missoes.json", missoesData);

      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sucesso: true,
          decisao: "recusar",
          submissao,
        }),
      };
    }

    /*
     * APROVAÇÃO
     *
     * O valor da recompensa da missão é utilizado
     * como P.C. no competitivo.json.
     */
    const recompensa = Number(
      submissao.recompensa_xp ??
        submissao.missaoPontos ??
        0
    );

    if (!Number.isFinite(recompensa) || recompensa < 0) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          erro: "A recompensa da missão é inválida.",
        }),
      };
    }

    const discordId = String(
      submissao.discordId ||
        submissao.userId ||
        ""
    ).trim();

    if (!discordId) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          erro: "A submissão não possui Discord ID.",
        }),
      };
    }

    /*
     * Carrega o mesmo competitivo.json utilizado
     * pelo Shinku.
     */
    const competitivo = await carregarBlob("competitivo.json", {
      catalogo: [],
      perfis: {},
    });

    competitivo.catalogo = Array.isArray(competitivo.catalogo)
      ? competitivo.catalogo
      : [];

    competitivo.perfis =
      competitivo.perfis &&
      typeof competitivo.perfis === "object"
        ? competitivo.perfis
        : {};

    const chave = discordId;

    /*
     * Mantém os dados existentes do jogador.
     * A aprovação apenas soma os P.C.
     */
    const perfilAtual = competitivo.perfis[chave] || {
      discordId: chave,
      nome: submissao.nome || "",
      pontos: 0,
      elo: 1000,
      vitorias: 0,
      derrotas: 0,
    };

    perfilAtual.discordId = chave;

    if (submissao.nome) {
      perfilAtual.nome = submissao.nome;
    }

    perfilAtual.pontos =
      Number(perfilAtual.pontos || 0) + recompensa;

    perfilAtual.elo = Number(
      perfilAtual.elo ?? 1000
    );

    perfilAtual.vitorias = Number(
      perfilAtual.vitorias ?? 0
    );

    perfilAtual.derrotas = Number(
      perfilAtual.derrotas ?? 0
    );

    competitivo.perfis[chave] = perfilAtual;

    /*
     * Marca a submissão como aprovada antes de salvar.
     */
    submissao.status = "aprovada";
    submissao.recompensaAplicada = recompensa;
    submissao.recompensaAplicadaEm = agora;
    submissao.revisadoEm = agora;
    submissao.revisadoPor = revisorDiscordId;
    submissao.revisorNome = revisorNome;

    /*
     * Remove a imagem depois da análise.
     */
    delete submissao.imagemBase64;

    /*
     * Salva os dois sistemas compartilhados.
     */
    await salvarBlob("competitivo.json", competitivo);
    await salvarBlob("missoes.json", missoesData);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sucesso: true,
        decisao: "aprovar",
        submissao,
        perfil: perfilAtual,
        recompensa,
      }),
    };
  } catch (erro) {
    console.error("Erro em missoes-revisar:", erro);

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        erro: "Erro interno ao revisar a submissão.",
        detalhe: erro.message,
      }),
    };
  }
};