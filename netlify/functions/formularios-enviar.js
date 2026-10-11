
const { lerSessao } = require("./lib/sessao");
const { buscarUsuario } = require("./lib/discord");
const { carregarBlob, salvarBlob } = require("./lib/upstash");
const {
  PADRAO,
  comPadrao,
  obterGuild,
  GUILD_ID_NEMESIS,
} = require("./lib/formularios-padrao");

const API = "https://discord.com/api/v10";

const LIMITES = {
  curta: 300,
  longa: 2000,
  escolha: 200,
};

const json = (status, corpo) => ({
  statusCode: status,
  headers: {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  },
  body: JSON.stringify(corpo),
});

function objetoValido(valor) {
  return valor && typeof valor === "object" && !Array.isArray(valor);
}

function obterTokenBot() {
  return process.env.DISCORD_BOT_TOKEN || "";
}

async function notificar(form, resposta) {
  const token = obterTokenBot();

  if (!token) {
    console.warn(
      "[FORMULARIOS] DISCORD_BOT_TOKEN não configurado; notificações ignoradas."
    );
    return;
  }

  const headers = {
    Authorization: `Bot ${token}`,
    "Content-Type": "application/json",
  };

  const titulo =
    form.titulo_painel ||
    form.nome ||
    "Formulário";

  const texto =
    `📩 **Nova candidatura — ${titulo}**\n` +
    `Candidato: **${resposta.nome || "Membro"}** (<@${resposta.autor_id}>)\n` +
    `Revise em: ${(process.env.URL || "").replace(/\/$/, "")}/admin-formularios.html`;

  const cargos = Array.isArray(form.cargos_notificar)
    ? form.cargos_notificar.map(String)
    : [];

  if (cargos.length) {
    try {
      const resp = await fetch(
        `${API}/guilds/${GUILD_ID_NEMESIS}/members?limit=1000`,
        { headers }
      );

      if (resp.ok) {
        const membros = await resp.json();

        if (Array.isArray(membros)) {
          const alvos = membros
            .filter((membro) =>
              membro.user &&
              !membro.user.bot &&
              Array.isArray(membro.roles) &&
              membro.roles.some((id) => cargos.includes(String(id)))
            )
            .slice(0, 15);

          await Promise.allSettled(
            alvos.map(async (membro) => {
              const dm = await fetch(`${API}/users/@me/channels`, {
                method: "POST",
                headers,
                body: JSON.stringify({
                  recipient_id: membro.user.id,
                }),
              });

              if (!dm.ok) return;

              const canal = await dm.json();

              await fetch(`${API}/channels/${canal.id}/messages`, {
                method: "POST",
                headers,
                body: JSON.stringify({ content: texto }),
              });
            })
          );
        }
      } else {
        console.error(
          "[FORMULARIOS] Falha ao consultar membros para notificação:",
          resp.status
        );
      }
    } catch (erro) {
      console.error(
        "[FORMULARIOS] Erro nas notificações por cargo:",
        erro
      );
    }
  }

  const canalId = String(form.canal_notificacao_id || "").trim();

  if (canalId) {
    try {
      const mencoes = cargos
        .map((id) => `<@&${id}>`)
        .join(" ");

      const resp = await fetch(
        `${API}/channels/${canalId}/messages`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            content: [mencoes, texto].filter(Boolean).join("\n"),
            allowed_mentions: {
              parse: [],
              roles: cargos,
              users: [String(resposta.autor_id)],
            },
          }),
        }
      );

      if (!resp.ok) {
        console.error(
          "[FORMULARIOS] Falha ao enviar notificação ao canal:",
          resp.status
        );
      }
    } catch (erro) {
      console.error(
        "[FORMULARIOS] Erro na notificação ao canal:",
        erro
      );
    }
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

    let corpo;

    try {
      corpo = JSON.parse(event.body || "{}");
    } catch {
      return json(400, { erro: "Corpo da requisição inválido." });
    }

    const formId = String(corpo.formId || "").trim();

    if (!formId) {
      return json(400, { erro: "Informe o formulário." });
    }

    const formulariosDados = comPadrao(
      await carregarBlob("formularios.json", PADRAO)
    );

    const formularios = obterGuild(formulariosDados);

    const form = formularios.find(
      (item) =>
        String(item.id) === formId &&
        item.ativo !== false
    );

    if (!form) {
      return json(404, {
        erro: "Formulário não encontrado ou fechado.",
      });
    }

    if (!Array.isArray(form.paginas)) {
      return json(400, {
        erro: "Este formulário não possui páginas válidas.",
      });
    }

    const usuario = await buscarUsuario(sessao.access_token);

    if (!usuario || !usuario.id) {
      return json(401, {
        erro: "Não foi possível identificar sua conta do Discord.",
      });
    }

    const respostasDadosBrutos = await carregarBlob(
      "formularios_respostas.json",
      {}
    );

    const respostasDados = objetoValido(respostasDadosBrutos)
      ? respostasDadosBrutos
      : {};

    const respostasGuild = respostasDados[GUILD_ID_NEMESIS];

    const lista = Array.isArray(respostasGuild)
      ? respostasGuild
      : [];

    const jaPendente = lista.some(
      (resposta) =>
        String(resposta.formulario_id) === formId &&
        String(resposta.autor_id) === String(usuario.id) &&
        resposta.status === "pendente"
    );

    if (jaPendente) {
      return json(409, {
        erro: "Você já tem uma candidatura pendente neste formulário.",
      });
    }

    const enviadas = objetoValido(corpo.respostas)
      ? corpo.respostas
      : {};

    const itens = [];
    let quantidadePerguntas = 0;

    for (const pagina of form.paginas) {
      if (!pagina || !Array.isArray(pagina.perguntas)) {
        continue;
      }

      for (const pergunta of pagina.perguntas) {
        if (!pergunta || !pergunta.id) continue;

        quantidadePerguntas++;

        const tipo = LIMITES[pergunta.tipo]
          ? pergunta.tipo
          : "curta";

        const limite = LIMITES[tipo];

        const valorOriginal = enviadas[pergunta.id];
        const valor = String(valorOriginal ?? "")
          .trim()
          .slice(0, limite);

        if (pergunta.obrigatoria && !valor) {
          return json(400, {
            erro: `Pergunta obrigatória sem resposta: ${pergunta.texto || pergunta.id}`,
          });
        }

        if (tipo === "escolha" && valor) {
          const opcoes = Array.isArray(pergunta.opcoes)
            ? pergunta.opcoes.map(String)
            : [];

          if (!opcoes.includes(valor)) {
            return json(400, {
              erro: `Opção inválida em: ${pergunta.texto || pergunta.id}`,
            });
          }
        }

        itens.push({
          pergunta: String(pergunta.texto || pergunta.id),
          resposta: valor || "—",
        });
      }
    }

    if (quantidadePerguntas === 0) {
      return json(400, {
        erro: "Este formulário ainda não possui perguntas válidas.",
      });
    }

    const agora = Date.now();

    const nova = {
      id: `resp_${agora}_${Math.random().toString(36).slice(2, 8)}`,
      guild_id: GUILD_ID_NEMESIS,
      formulario_id: String(form.id),
      autor_id: String(usuario.id),
      // Mantém os dois nomes para compatibilidade: o painel de revisão
      // lê "itens", enquanto integrações anteriores podem usar "respostas".
      itens,
      respostas: itens,
      status: "pendente",
      revisor_id: null,
      timestamp: agora,
      criado_em: agora,
      atualizado_em: agora,
      nome: String(usuario.global_name || usuario.username || "Membro"),
      formTitulo: String(form.titulo_painel || form.nome || ""),
    };

    lista.push(nova);
    respostasDados[GUILD_ID_NEMESIS] = lista;

    await salvarBlob("formularios_respostas.json", respostasDados);

    try {
      await notificar(form, nova);
    } catch (erro) {
      console.error(
        "[FORMULARIOS] Falha ao notificar sobre nova candidatura:",
        erro
      );
    }

    return json(200, {
      ok: true,
      resposta: {
        id: nova.id,
        status: nova.status,
      },
    });
  } catch (erro) {
    console.error("[FORMULARIOS-ENVIAR]", erro);

    return json(500, {
      erro: "Erro interno ao enviar o formulário.",
    });
  }
};
