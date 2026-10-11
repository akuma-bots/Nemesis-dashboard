const {
  autenticar,
  eGerente,
  respostaNaoAutorizado,
} = require("./lib/auth");

const {
  carregarBlob,
  salvarBlob,
} = require("./lib/upstash");

const {
  comPadrao,
} = require("./lib/config-padrao");

const GUILD_ID = "1543381737961160910";

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

const CAMPOS_LISTA = new Set([
  "cargos_moderacao_total",
  "cargos_moderacao_basico",
]);

const CAMPOS_TEXTO = new Set([
  "ticket_painel_titulo",
  "ticket_painel_descricao",
  "ticket_painel_banner_url",
]);

const CAMPOS_PERMITIDOS = new Set([
  ...CAMPOS_ID,
  ...CAMPOS_LISTA,
  ...CAMPOS_TEXTO,
  "desafio_cooldown_minutos",
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
      erro: "JSON inválido.",
    });
  }

  const guildId = String(
    corpo.guildId || ""
  ).trim();

  if (guildId !== GUILD_ID) {
    return resposta(400, {
      ok: false,
      erro: "Servidor da NÊMESIS inválido.",
    });
  }

  try {
    const usuario = await autenticar(event);

    if (!usuario || !eGerente(usuario)) {
      return respostaNaoAutorizado();
    }

    const camposRecebidos = Object.keys(corpo)
      .filter((campo) => campo !== "guildId");

    if (
      camposRecebidos.length === 0 ||
      camposRecebidos.some(
        (campo) => !CAMPOS_PERMITIDOS.has(campo)
      )
    ) {
      return resposta(400, {
        ok: false,
        erro: "A requisição contém campos inválidos ou nenhum campo para salvar.",
      });
    }

    const configs = await carregarBlob(
      "guild_configs.json",
      {}
    );

    const atual = comPadrao(
      configs[guildId]
    );

    for (const campo of camposRecebidos) {
      const valor = corpo[campo];

      if (CAMPOS_ID.has(campo)) {
        if (valor === "" || valor === null) {
          atual[campo] = null;
          continue;
        }

        const id = String(valor).trim();

        if (!/^\d{17,20}$/.test(id)) {
          return resposta(400, {
            ok: false,
            erro: `O campo ${campo} precisa conter um ID válido do Discord.`,
          });
        }

        atual[campo] = id;
        continue;
      }

      if (CAMPOS_LISTA.has(campo)) {
        if (!Array.isArray(valor)) {
          return resposta(400, {
            ok: false,
            erro: `O campo ${campo} precisa ser uma lista.`,
          });
        }

        if (
          valor.some(
            (item) => !/^\d{17,20}$/.test(String(item))
          )
        ) {
          return resposta(400, {
            ok: false,
            erro: `A lista ${campo} contém um ID inválido.`,
          });
        }

        atual[campo] = valor.map(String);
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
            erro: "O intervalo dos desafios deve ficar entre 0 e 10080 minutos.",
          });
        }

        atual[campo] = minutos;
        continue;
      }

      if (CAMPOS_TEXTO.has(campo)) {
        if (
          valor !== null &&
          typeof valor !== "string"
        ) {
          return resposta(400, {
            ok: false,
            erro: `O campo ${campo} precisa ser texto.`,
          });
        }

        if (
          campo === "ticket_painel_banner_url" &&
          valor
        ) {
          try {
            const url = new URL(valor);

            if (
              url.protocol !== "https:" &&
              url.protocol !== "http:"
            ) {
              throw new Error("URL inválida");
            }
          } catch {
            return resposta(400, {
              ok: false,
              erro: "O banner precisa conter uma URL HTTP ou HTTPS válida.",
            });
          }
        }

        atual[campo] =
          valor === null ? null : valor.trim();

        continue;
      }
    }

    configs[guildId] = atual;

    await salvarBlob(
      "guild_configs.json",
      configs
    );

    return resposta(200, {
      ok: true,
      mensagem: "Configurações salvas.",
      config: atual,
    });
  } catch (erro) {
    console.error(
      "[CONFIG-SAVE]",
      erro
    );

    return resposta(500, {
      ok: false,
      erro: "Não foi possível salvar as configurações.",
    });
  }
};