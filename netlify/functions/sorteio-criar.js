const crypto = require("crypto");
const { exigirGerenciaServidor } = require("./lib/autorizar");
const { carregarBlob, salvarBlob } = require("./lib/upstash");
const { enviarEmbed, buscarCanal } = require("./lib/discord");

function resposta(statusCode, dados) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(dados),
  };
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return resposta(405, {
      ok: false,
      erro: "Método não permitido.",
    });
  }

  try {
    let corpo;
    try {
      corpo = JSON.parse(event.body || "{}");
    } catch {
      return resposta(400, { ok: false, erro: "JSON inválido." });
    }

    const {
      guildId,
      canalId,
      texto = "",
      requisitos = "",
      premio,
      duracaoMinutos,
      vencedores,
      banner = "",
    } = corpo;

    const { erro } = await exigirGerenciaServidor(
      event,
      guildId
    );

    if (erro) return erro;

    const minutos = Number(duracaoMinutos);
    const qtdVencedores = Number(vencedores) || 1;

    if (!guildId || !canalId || !premio) {
      return resposta(400, {
        ok: false,
        erro: "Canal e prêmio são obrigatórios.",
      });
    }

    const premioLimpo = String(premio).trim().slice(0, 200);
    const textoLimpo = String(texto || "").trim().slice(0, 1200);
    const requisitosLimpos = String(requisitos || "").trim().slice(0, 1200);
    const bannerLimpo = String(banner || "").trim();

    if (!premioLimpo) {
      return resposta(400, { ok: false, erro: "O prêmio não pode estar vazio." });
    }
    if (bannerLimpo && !/^https?:\/\//i.test(bannerLimpo)) {
      return resposta(400, { ok: false, erro: "O banner precisa ser uma URL HTTP ou HTTPS." });
    }
    if (!/^\d{17,20}$/.test(String(canalId))) {
      return resposta(400, { ok: false, erro: "ID do canal inválido." });
    }

    // A autorização do usuário não deve permitir publicar em canais de outro servidor.
    const canalDestino = await buscarCanal(String(canalId));
    if (!canalDestino || String(canalDestino.guild_id) !== String(guildId)) {
      return resposta(400, { ok: false, erro: "O canal selecionado não pertence ao servidor autorizado." });
    }

    if (!Number.isFinite(minutos) || minutos <= 0) {
      return resposta(400, {
        ok: false,
        erro: "A duração precisa ser maior que 0 minutos.",
      });
    }

    if (minutos > 43200) {
      return resposta(400, {
        ok: false,
        erro: "A duração máxima é de 30 dias.",
      });
    }

    if (
      !Number.isInteger(qtdVencedores) ||
      qtdVencedores <= 0 ||
      qtdVencedores > 100
    ) {
      return resposta(400, {
        ok: false,
        erro: "A quantidade de vencedores precisa ser um número inteiro entre 1 e 100.",
      });
    }

    const fim =
      Math.floor(Date.now() / 1000) +
      minutos * 60;

    const sorteioId =
      crypto.randomUUID().slice(0, 8);

    const descricao = [];

    if (textoLimpo) {
      descricao.push(
        textoLimpo,
        ""
      );
    }

    if (requisitosLimpos) {
      descricao.push(
        "⚠️ **Requisitos:**",
        requisitosLimpos,
        ""
      );
    }

    descricao.push(
      "🎁 **Prêmio:**",
      premioLimpo,
      "",
      "🏆 **Vencedores:**",
      `**${qtdVencedores}**`,
      "",
      "⏰ **Data de término:**",
      `<t:${fim}:F>`,
      "",
      "Clique em **Participar** para entrar no sorteio."
    );

    const embed = {
      title: "🎁 SORTEIO",
      description: descricao.join("\n"),
      color: 0x5865f2,
      author: {
        name: "NÊMESIS",
      },
      footer: {
        text: `Sorteio • ID ${sorteioId}`,
      },
      timestamp: new Date().toISOString(),
    };

    if (bannerLimpo) {
      embed.image = {
        url: bannerLimpo,
      };
    }

    const components = [
      {
        type: 1,
        components: [
          {
            type: 2,
            style: 3,
            label: "🎁 Participar (0)",
            custom_id: `sorteio_participar:${sorteioId}`,
          },
          {
            type: 2,
            style: 1,
            label: "👥 Participantes (0)",
            custom_id: `sorteio_participantes:${sorteioId}`,
          },
        ],
      },
    ];

    const mensagem = await enviarEmbed(
      canalId,
      embed,
      components
    );

    const agora =
      Date.now() / 1000;

    const todos =
      await carregarBlob(
        "sorteios.json",
        {}
      );

    todos[sorteioId] = {
      id: sorteioId,

      guild_id: Number(guildId),

      canal_id: String(canalId),

      mensagem_id: String(
        mensagem.id
      ),

      texto: textoLimpo,

      requisitos: requisitosLimpos,

      premio: premioLimpo,

      banner:
        bannerLimpo ||
        null,

      fim,

      vencedores:
        qtdVencedores,

      participantes: [],

      vencedores_ids: [],

      encerrado: false,

      criado_por_id:
        null,

      criado_em:
        agora,

      atualizado_em:
        agora,

      encerrado_em:
        null,
    };

    await salvarBlob(
      "sorteios.json",
      todos
    );

    return resposta(200, {
      ok: true,
      sorteioId,
      fim,
      mensagemId:
        mensagem.id,
    });
  } catch (erro) {
    console.error(
      "[SORTEIO-CRIAR]",
      erro
    );

    return resposta(500, {
      ok: false,
      erro:
        erro.message ||
        "Não foi possível criar o sorteio.",
    });
  }
};