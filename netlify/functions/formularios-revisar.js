
const { lerSessao } = require("./lib/sessao");
const {
  usuarioGerenciaServidor,
  buscarUsuario,
} = require("./lib/discord");
const { carregarBlob, salvarBlob } = require("./lib/upstash");
const {
  PADRAO,
  comPadrao,
  obterGuild,
  GUILD_ID_NEMESIS,
} = require("./lib/formularios-padrao");

const API = "https://discord.com/api/v10";

const json = (status, corpo) => ({
  statusCode: status,
  headers: {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  },
  body: JSON.stringify(corpo),
});

async function avisarCandidato(resposta, formulario, decisao, mensagem) {
  const token = process.env.DISCORD_BOT_TOKEN;

  if (!token) {
    console.warn(
      "[FORMULARIOS-REVISAR] DISCORD_BOT_TOKEN não configurado; aviso ignorado."
    );
    return;
  }

  const autorId = String(resposta.autor_id || "");

  if (!autorId) return;

  const headers = {
    Authorization: `Bot ${token}`,
    "Content-Type": "application/json",
  };

  const dm = await fetch(`${API}/users/@me/channels`, {
    method: "POST",
    headers,
    body: JSON.stringify({ recipient_id: autorId }),
  });

  if (!dm.ok) {
    console.error(
      "[FORMULARIOS-REVISAR] Não foi possível abrir DM:",
      dm.status
    );
    return;
  }

  const canal = await dm.json();
  const nomeFormulario =
    formulario?.titulo_painel ||
    formulario?.nome ||
    resposta.formTitulo ||
    "formulário";

  const base =
    decisao === "aprovada"
      ? `✅ Sua candidatura em **${nomeFormulario}** foi **aprovada**.`
      : `❌ Sua candidatura em **${nomeFormulario}** foi **recusada**.`;

  const content = mensagem
    ? `${base}\n\n**Mensagem da revisão:**\n${mensagem}`
    : base;

  const envio = await fetch(`${API}/channels/${canal.id}/messages`, {
    method: "POST",
    headers,
    body: JSON.stringify({ content }),
  });

  if (!envio.ok) {
    console.error(
      "[FORMULARIOS-REVISAR] Não foi possível enviar a DM:",
      envio.status
    );
  }
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return json(405, { erro: "Método não permitido." });
    }

    const sessao = lerSessao(event);

    if (!sessao) {
      return json(401, { erro: "Não autenticado." });
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

    let corpo;

    try {
      corpo = JSON.parse(event.body || "{}");
    } catch {
      return json(400, { erro: "Corpo da requisição inválido." });
    }

    const respostaId = String(corpo.respostaId || "").trim();
    const decisao = String(corpo.decisao || "").trim();
    const mensagem = String(corpo.mensagem || "")
      .trim()
      .slice(0, 1000);

    if (!respostaId || !["aprovada", "recusada"].includes(decisao)) {
      return json(400, {
        erro:
          "Informe respostaId e decisao como aprovada ou recusada.",
      });
    }

    const formulariosDados = comPadrao(
      await carregarBlob("formularios.json", PADRAO)
    );

    const listaFormularios = obterGuild(formulariosDados);

    const respostasDadosBrutos = await carregarBlob(
      "formularios_respostas.json",
      {}
    );

    const respostasDados =
      respostasDadosBrutos &&
      typeof respostasDadosBrutos === "object" &&
      !Array.isArray(respostasDadosBrutos)
        ? respostasDadosBrutos
        : {};

    const listaRespostas = Array.isArray(
      respostasDados[GUILD_ID_NEMESIS]
    )
      ? respostasDados[GUILD_ID_NEMESIS]
      : [];

    const indice = listaRespostas.findIndex(
      (item) => String(item.id) === respostaId
    );

    if (indice < 0) {
      return json(404, { erro: "Candidatura não encontrada." });
    }

    const resposta = listaRespostas[indice];

    if (resposta.status !== "pendente") {
      return json(409, {
        erro: "Essa candidatura já foi revisada.",
      });
    }

    const formulario = listaFormularios.find(
      (item) =>
        String(item.id) === String(resposta.formulario_id)
    );

    let usuarioDiscord;

    try {
      usuarioDiscord = await buscarUsuario(sessao.access_token);
    } catch (erro) {
      console.error(
        "[FORMULARIOS-REVISAR] Falha ao identificar revisor:",
        erro
      );
      return json(401, {
        erro: "Não foi possível identificar sua conta do Discord.",
      });
    }

    if (!usuarioDiscord || !usuarioDiscord.id) {
      return json(401, {
        erro: "Não foi possível identificar sua conta do Discord.",
      });
    }

    const agora = Date.now();

    const atualizada = {
      ...resposta,
      status: decisao,
      revisor_id: String(usuarioDiscord.id),
      atualizado_em: agora,
      ...(decisao === "aprovada"
        ? { aprovado_em: agora }
        : { rejeitada_em: agora }),
      ...(mensagem ? { mensagem_revisao: mensagem } : {}),
    };

    listaRespostas[indice] = atualizada;
    respostasDados[GUILD_ID_NEMESIS] = listaRespostas;

    await salvarBlob("formularios_respostas.json", respostasDados);

    try {
      await avisarCandidato(
        atualizada,
        formulario,
        decisao,
        mensagem
      );
    } catch (erro) {
      console.error(
        "[FORMULARIOS-REVISAR] Falha ao avisar candidato:",
        erro
      );
    }

    return json(200, {
      ok: true,
      resposta: {
        id: atualizada.id,
        status: atualizada.status,
        revisor_id: atualizada.revisor_id,
        atualizado_em: atualizada.atualizado_em,
      },
    });
  } catch (erro) {
    console.error("[FORMULARIOS-REVISAR]", erro);

    return json(500, {
      erro: "Erro interno ao revisar a candidatura.",
    });
  }
};
