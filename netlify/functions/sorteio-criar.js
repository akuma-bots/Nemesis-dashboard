const crypto = require("crypto");
const { exigirGerenciaServidor } = require("./lib/autorizar");
const { carregarBlob, salvarBlob } = require("./lib/upstash");
const { enviarEmbed } = require("./lib/discord");

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
    const corpo = JSON.parse(event.body || "{}");

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
      qtdVencedores <= 0
    ) {
      return resposta(400, {
        ok: false,
        erro: "A quantidade de vencedores precisa ser maior que 0.",
      });
    }

    const fim =
      Math.floor(Date.now() / 1000) +
      minutos * 60;

    const sorteioId =
      crypto.randomUUID().slice(0, 8);

    const descricao = [];

    if (String(texto).trim()) {
      descricao.push(
        String(texto).trim(),
        ""
      );
    }

    if (String(requisitos).trim()) {
      descricao.push(
        "⚠️ **Requisitos:**",
        String(requisitos).trim(),
        ""
      );
    }

    descricao.push(
      "🎁 **Prêmio:**",
      String(premio).trim(),
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

    if (String(banner).trim()) {
      embed.image = {
        url: String(banner).trim(),
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

      texto: String(
        texto || ""
      ),

      requisitos: String(
        requisitos || ""
      ),

      premio: String(
        premio
      ).trim(),

      banner:
        String(banner || "").trim() ||
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