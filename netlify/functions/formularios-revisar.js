const { lerSessao } = require("./lib/sessao");
const { usuarioGerenciaServidor } = require("./lib/discord");
const { carregarBlob, salvarBlob } = require("./lib/upstash");

const API = "https://discord.com/api/v10";
const GUILD_ID_NEMESIS = "1543381737961160910";

const json = (status, corpo) => ({
  statusCode: status,
  headers: {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  },
  body: JSON.stringify(corpo),
});

async function avisarCandidato(
  resposta,
  formulario,
  decisao,
  mensagem
) {
  const headers = {
    Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
    "Content-Type": "application/json",
  };

  const autorId = String(
    resposta.autor_id
  );

  const dm = await fetch(
    `${API}/users/@me/channels`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        recipient_id: autorId,
      }),
    }
  );

  if (!dm.ok) return;

  const canal = await dm.json();

  const nomeFormulario =
    formulario?.titulo ||
    formulario?.nome ||
    resposta.formTitulo ||
    "formulário";

  const base =
    decisao === "aprovada"
      ? `✅ Sua candidatura em **${nomeFormulario}** foi **aprovada**.`
      : `❌ Sua candidatura em **${nomeFormulario}** foi **recusada**.`;

  const content = mensagem
    ? `${base}\n\n${mensagem}`
    : base;

  await fetch(
    `${API}/channels/${canal.id}/messages`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        content,
      }),
    }
  );
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
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

    const gerencia =
      await usuarioGerenciaServidor(
        sessao.access_token,
        GUILD_ID_NEMESIS
      );

    if (!gerencia) {
      return json(403, {
        erro:
          "Você não gerencia o servidor da NÊMESIS.",
      });
    }

    const corpo = JSON.parse(
      event.body || "{}"
    );

    const respostaId =
      String(corpo.respostaId || "").trim();

    const decisao =
      String(corpo.decisao || "").trim();

    const mensagem =
      String(corpo.mensagem || "")
        .trim()
        .slice(0, 1000);

    if (
      !respostaId ||
      !["aprovada", "recusada"].includes(
        decisao
      )
    ) {
      return json(400, {
        erro:
          "respostaId e decisao (aprovada/recusada) são obrigatórios.",
      });
    }

    const formularios =
      await carregarBlob(
        "formularios.json",
        {}
      );

    const respostas =
      await carregarBlob(
        "formularios_respostas.json",
        {}
      );

    const listaRespostas =
      Array.isArray(
        respostas[GUILD_ID_NEMESIS]
      )
        ? respostas[GUILD_ID_NEMESIS]
        : [];

    const resposta =
      listaRespostas.find(
        (item) =>
          String(item.id) ===
          respostaId
      );

    if (!resposta) {
      return json(404, {
        erro:
          "Candidatura não encontrada.",
      });
    }

    if (
      resposta.status !==
      "pendente"
    ) {
      return json(400, {
        erro:
          "Essa candidatura já foi revisada.",
      });
    }

    const listaFormularios =
      Array.isArray(
        formularios[
          GUILD_ID_NEMESIS
        ]
      )
        ? formularios[
            GUILD_ID_NEMESIS
          ]
        : Array.isArray(
            formularios.formularios
          )
          ? formularios.formularios
          : [];

    const formulario =
      listaFormularios.find(
        (item) =>
          String(item.id) ===
          String(
            resposta.formulario_id
          )
      );

    const usuarioDiscord =
      await require("./lib/discord")
        .buscarUsuario(
          sessao.access_token
        );

    const agora = Date.now();

    resposta.status =
      decisao;

    resposta.revisor_id =
      String(
        usuarioDiscord.id
      );

    resposta.atualizado_em =
      agora;

    if (
      decisao === "aprovada"
    ) {
      resposta.aprovado_em =
        agora;
    } else {
      resposta.rejeitada_em =
        agora;
    }

    if (mensagem) {
      resposta.mensagem_revisao =
        mensagem;
    }

    respostas[
      GUILD_ID_NEMESIS
    ] = listaRespostas;

    await salvarBlob(
      "formularios_respostas.json",
      respostas
    );

    try {
      await avisarCandidato(
        resposta,
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
        id: resposta.id,
        status: resposta.status,
        revisor_id:
          resposta.revisor_id,
        atualizado_em:
          resposta.atualizado_em,
      },
    });
  } catch (erro) {
    console.error(
      "[FORMULARIOS-REVISAR]",
      erro
    );

    return json(500, {
      erro:
        "Erro interno ao revisar a candidatura.",
    });
  }
};