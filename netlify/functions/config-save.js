const { exigirGerenciaServidor } = require("./lib/autorizar");
const {
  carregarBlob,
  salvarBlob,
} = require("./lib/upstash");
const { comPadrao } = require("./lib/config-padrao");

const CAMPOS_PERMITIDOS = [
  // Configuração geral
  "support_role_id",
  "log_channel_id",
  "ticket_category_id",
  "canal_eventos_id",
  "canal_parcerias_id",
  "canal_denuncias_id",
  "categoria_modmail_id",
  "cargo_categoria_parcerias_id",
  "canal_auditoria_id",
  "canal_guerras_id",

  // Competitivo
  "canal_desafios_id",
  "desafio_cooldown_minutos",
  "canal_lutas_id",
  "canal_provas_pvp_id",
  "canal_ranking_id",

  // Missões
  "canal_missoes_missao_id",
  "canal_provas_missao_id",

  // Contribuições
  "canal_missoes_contribuicao_id",
  "canal_provas_contribuicao_id",

  // Missões especiais
  "canal_missoes_especial_id",
  "canal_provas_especial_id",

  // Recordes
  "canal_recordes_id",

  // Painel de tickets
  "ticket_painel_titulo",
  "ticket_painel_descricao",
  "ticket_painel_banner_url",

  // Permissões de moderação
  "cargos_moderacao_total",
  "cargos_moderacao_basico",
];

const CAMPOS_ID = new Set([
  "support_role_id",
  "log_channel_id",
  "ticket_category_id",
  "canal_eventos_id",
  "canal_parcerias_id",
  "canal_denuncias_id",
  "categoria_modmail_id",
  "cargo_categoria_parcerias_id",
  "canal_auditoria_id",
  "canal_guerras_id",
  "canal_desafios_id",
  "canal_lutas_id",
  "canal_provas_pvp_id",
  "canal_ranking_id",
  "canal_missoes_missao_id",
  "canal_provas_missao_id",
  "canal_missoes_contribuicao_id",
  "canal_provas_contribuicao_id",
  "canal_missoes_especial_id",
  "canal_provas_especial_id",
  "canal_recordes_id",
]);

function resposta(statusCode, dados) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
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

  let corpo;

  try {
    corpo = JSON.parse(event.body || "{}");
  } catch {
    return resposta(400, {
      ok: false,
      erro: "O corpo da requisição não contém JSON válido.",
    });
  }

  const guildId = String(corpo.guildId || "").trim();

  if (!guildId) {
    return resposta(400, {
      ok: false,
      erro: "guildId é obrigatório.",
    });
  }

  try {
    const { erro } = await exigirGerenciaServidor(
      event,
      guildId
    );

    if (erro) {
      return erro;
    }

    const configs = await carregarBlob(
      "guild_configs.json",
      {}
    );

    const atual = comPadrao(configs[guildId]);

    for (const campo of CAMPOS_PERMITIDOS) {
      if (!Object.prototype.hasOwnProperty.call(corpo, campo)) {
        continue;
      }

      const valor = corpo[campo];

      if (CAMPOS_ID.has(campo)) {
        if (valor === "" || valor === null) {
          atual[campo] = null;
          continue;
        }

        const id = String(valor).trim();

        if (!/^\d+$/.test(id)) {
          return resposta(400, {
            ok: false,
            erro: `O campo ${campo} precisa conter um ID válido do Discord.`,
          });
        }

        atual[campo] = id;
        continue;
      }

      if (
        campo === "cargos_moderacao_total" ||
        campo === "cargos_moderacao_basico"
      ) {
        if (!Array.isArray(valor)) {
          return resposta(400, {
            ok: false,
            erro: `O campo ${campo} precisa ser uma lista.`,
          });
        }

        atual[campo] = valor
          .filter((item) => /^\d+$/.test(String(item)))
          .map(String);

        continue;
      }

      if (campo === "desafio_cooldown_minutos") {
        const minutos = Number(valor);

        if (
          !Number.isInteger(minutos) ||
          minutos < 0 ||
          minutos > 10080
        ) {
          return resposta(400, {
            ok: false,
            erro: "O intervalo dos desafios precisa ser um número entre 0 e 10080 minutos.",
          });
        }

        atual[campo] = minutos;
        continue;
      }

      if (
        campo === "ticket_painel_titulo" ||
        campo === "ticket_painel_descricao" ||
        campo === "ticket_painel_banner_url"
      ) {
        atual[campo] =
          valor === null ? null : String(valor);

        continue;
      }

      atual[campo] = valor;
    }

    configs[guildId] = atual;

    await salvarBlob(
      "guild_configs.json",
      configs
    );

    return resposta(200, {
      ok: true,
      config: atual,
    });
  } catch (erro) {
    console.error("[CONFIG-SAVE]", erro);

    return resposta(500, {
      ok: false,
      erro: "Não foi possível salvar as configurações.",
    });
  }
};