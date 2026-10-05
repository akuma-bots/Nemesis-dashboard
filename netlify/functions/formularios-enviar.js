const { lerSessao } = require("./lib/sessao");
const { buscarUsuario } = require("./lib/discord");
const { carregarBlob, salvarBlob } = require("./lib/upstash");
const { PADRAO, comPadrao } = require("./lib/formularios-padrao");

const API = "https://discord.com/api/v10";
const GUILD_ID_NEMESIS = "1543381737961160910";

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

async function notificar(form, resposta) {
  const headers = {
    Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
    "Content-Type": "application/json",
  };

  const texto =
    `📩 **Nova candidatura** — ${form.titulo || form.nome}\n` +
    `Candidato: **${resposta.nome}** (<@${resposta.discordId}>)\n` +
    `Revise em: ${process.env.URL || ""}/admin-formularios.html`;

  const cargos = Array.isArray(form.cargosNotificar)
    ? form.cargosNotificar
    : Array.isArray(form.cargos_notificar)
      ? form.cargos_notificar.map(String)
      : [];

  if (cargos.length) {
    const resp = await fetch(
      `${API}/guilds/${GUILD_ID_NEMESIS}/members?limit=1000`,
      { headers }
    );

    if (resp.ok) {
      const membros = await resp.json();

      const alvos = membros
        .filter(
          (m) =>
            !m.user.bot &&
            m.roles.some((id) => cargos.includes(id))
        )
        .slice(0, 15);

      await Promise.allSettled(
        alvos.map(async (membro) => {
          const dm = await fetch(
            `${API}/users/@me/channels`,
            {
              method: "POST",
              headers,
              body: JSON.stringify({
                recipient_id: membro.user.id,
              }),
            }
          );

          if (!dm.ok) return;

          const canal = await dm.json();

          await fetch(
            `${API}/channels/${canal.id}/messages`,
            {
              method: "POST",
              headers,
              body: JSON.stringify({
                content: texto,
              }),
            }
          );
        })
      );
    }
  }

  const canalNotificacaoId =
    form.canalNotificacaoId ||
    form.canal_notificacao_id ||
    "";

  if (canalNotificacaoId) {
    const mencoes = cargos
      .map((id) => `<@&${id}>`)
      .join(" ");

    await fetch(
      `${API}/channels/${canalNotificacaoId}/messages`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          content: `${mencoes}\n${texto}`,
          allowed_mentions: {
            roles: cargos,
          },
        }),
      }
    );
  }
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

    const corpo = JSON.parse(
      event.body || "{}"
    );

    const dados = comPadrao(
      await carregarBlob(
        "formularios.json",
        PADRAO
      )
    );

    const formularios = Array.isArray(
      dados.formularios
    )
      ? dados.formularios
      : [];

    const form = formularios.find(
      (item) =>
        String(item.id) ===
          String(corpo.formId) &&
        item.ativo
    );

    if (!form) {
      return json(404, {
        erro:
          "Formulário não encontrado ou fechado.",
      });
    }

    const usuario = await buscarUsuario(
      sessao.access_token
    );

    const respostasDados =
      await carregarBlob(
        "formularios_respostas.json",
        {}
      );

    const lista =
      respostasDados[GUILD_ID_NEMESIS] || [];

    const jaPendente = lista.some(
      (resposta) =>
        String(resposta.formulario_id) ===
          String(form.id) &&
        String(resposta.autor_id) ===
          String(usuario.id) &&
        resposta.status === "pendente"
    );

    if (jaPendente) {
      return json(400, {
        erro:
          "Você já tem uma candidatura pendente neste formulário.",
      });
    }

    const enviadas =
      corpo.respostas || {};

    const itens = [];

    for (const pagina of form.paginas || []) {
      for (const pergunta of pagina.perguntas || []) {
        const tipo =
          pergunta.tipo || "curta";

        const limite =
          LIMITES[tipo] || 300;

        const valor = String(
          enviadas[pergunta.id] ?? ""
        )
          .trim()
          .slice(0, limite);

        if (
          pergunta.obrigatoria &&
          !valor
        ) {
          return json(400, {
            erro:
              `Pergunta obrigatória sem resposta: ${pergunta.texto}`,
          });
        }

        if (
          tipo === "escolha" &&
          valor &&
          !(
            pergunta.opcoes || []
          ).includes(valor)
        ) {
          return json(400, {
            erro:
              `Opção inválida em: ${pergunta.texto}`,
          });
        }

        itens.push({
          pergunta:
            pergunta.texto,
          resposta:
            valor || "—",
        });
      }
    }

    const agora = Date.now();

    const nova = {
      id:
        `resp_${Date.now()}_` +
        Math.random()
          .toString(36)
          .slice(2, 8),

      guild_id:
        GUILD_ID_NEMESIS,

      formulario_id:
        String(form.id),

      autor_id:
        String(usuario.id),

      respostas:
        itens,

      status:
        "pendente",

      revisor_id:
        null,

      timestamp:
        agora,

      criado_em:
        agora,

      atualizado_em:
        agora,

      nome:
        usuario.username,

      formTitulo:
        form.titulo ||
        form.nome ||
        "",
    };

    lista.push(nova);

    respostasDados[
      GUILD_ID_NEMESIS
    ] = lista;

    await salvarBlob(
      "formularios_respostas.json",
      respostasDados
    );

    try {
      await notificar(
        form,
        {
          ...nova,
          discordId:
            usuario.id,
        }
      );
    } catch (erro) {
      console.error(
        "[FORMULARIOS] Falha ao notificar:",
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
    console.error(
      "[FORMULARIOS-ENVIAR]",
      erro
    );

    return json(500, {
      erro:
        "Erro interno ao enviar o formulário.",
    });
  }
};