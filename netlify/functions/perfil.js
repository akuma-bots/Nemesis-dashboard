const { lerSessao } = require("./lib/sessao");
const { carregarBlob } = require("./lib/upstash");
const {
  PADRAO,
  comPadrao,
  calcularRank
} = require("./lib/competitivo-padrao");

const GUILD_ID_NEMESIS = "1543381737961160910";

function respostaJSON(statusCode, corpo) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store, max-age=0"
    },
    body: JSON.stringify(corpo)
  };
}

async function buscarDiscordUsuario(accessToken) {
  const resposta = await fetch(
    "https://discord.com/api/v10/users/@me",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  );

  if (!resposta.ok) {
    throw new Error("Não foi possível identificar o usuário do Discord.");
  }

  return resposta.json();
}

async function buscarMembroGuild(discordId) {
  const token = process.env.DISCORD_BOT_TOKEN;

  if (!token) return null;

  const resposta = await fetch(
    `https://discord.com/api/v10/guilds/${GUILD_ID_NEMESIS}/members/${discordId}`,
    {
      headers: {
        Authorization: `Bot ${token}`
      }
    }
  );

  if (!resposta.ok) return null;

  return resposta.json();
}

exports.handler = async function (event) {
  if (event.httpMethod !== "GET") {
    return respostaJSON(405, {
      erro: "Método não permitido."
    });
  }

  try {
    const sessao = lerSessao(event);

    if (!sessao) {
      return respostaJSON(401, {
        erro: "Não autenticado."
      });
    }

    const usuarioDiscord =
      await buscarDiscordUsuario(sessao.access_token);

    const discordId = usuarioDiscord.id;

    const membro =
      await buscarMembroGuild(discordId);

    const conteudo = comPadrao(
      await carregarBlob(
        "competitivo.json",
        PADRAO
      )
    );

    const perfis = Object.values(
      conteudo.perfis || {}
    );

    const perfil =
      perfis.find(
        (p) =>
          String(p.discordId) ===
          String(discordId)
      ) || {};

    const pontos =
      Number(perfil.pontos || 0);

    const vitorias =
      Number(perfil.vitorias || 0);

    const derrotas =
      Number(perfil.derrotas || 0);

    const partidas =
      vitorias + derrotas;

    const taxa =
      partidas > 0
        ? (vitorias / partidas) * 100
        : 0;

    const rankingOrdenado =
      perfis
        .map((p) => ({
          discordId: p.discordId,
          pontos: Number(p.pontos || 0),
          elo: Number(p.elo || 1000)
        }))
        .sort(
          (a, b) =>
            b.pontos - a.pontos ||
            b.elo - a.elo
        );

    const posicao =
      rankingOrdenado.findIndex(
        (p) =>
          String(p.discordId) ===
          String(discordId)
      );

    const ranking =
      posicao >= 0
        ? posicao + 1
        : null;

    const cargo =
      membro?.roles?.length
        ? `Membro da NÊMESIS`
        : "Membro";

    const nome =
      usuarioDiscord.global_name ||
      usuarioDiscord.username ||
      perfil.nome ||
      "Usuário";

    const avatar =
      usuarioDiscord.avatar
        ? `https://cdn.discordapp.com/avatars/${discordId}/${usuarioDiscord.avatar}.png?size=256`
        : "https://cdn.discordapp.com/embed/avatars/0.png";

    const elo =
      Number(perfil.elo || 1000);

    return respostaJSON(200, {
      usuario: {
        discordId,
        nome,
        username: usuarioDiscord.username,
        globalName: usuarioDiscord.global_name,
        avatar,
        cargo,
        pontos,
        pc: pontos,
        vitorias,
        derrotas,
        elo,
        rank: calcularRank(elo)
      },

      estatisticas: {
        pontos,
        pc: pontos,
        vitorias,
        derrotas,
        taxa,
        missoes: Number(perfil.missoes || 0),
        contribuicoes: Number(
          perfil.contribuicoes || 0
        ),
        especiais: Number(
          perfil.especiais ||
          perfil.missoesEspeciais ||
          0
        ),
        atividades: Number(
          perfil.atividades || 0
        ),
        ranking
      },

      ranking,

      progresso:
        Number(perfil.progresso || 0),

      proximoCargo:
        perfil.proximoCargo || "—",

      pontosProximo:
        perfil.pontosProximo ?? "—"
    });

  } catch (erro) {
    console.error(
      "Erro na função perfil:",
      erro
    );

    return respostaJSON(500, {
      erro:
        "Erro interno ao carregar o perfil."
    });
  }
};