const API = "https://discord.com/api/v10";

// Reutiliza as chamadas respeitando o retry_after do Discord em respostas 429.
// Evita loops longos: quando o Discord pede uma espera acima do limite seguro
// da função, a resposta 429 segue para o tratamento de erro do chamador.
async function discordFetch(url, options = {}, maxRetries = 2) {
  let tentativa = 0;

  while (true) {
    const resposta = await fetch(url, options);

    if (resposta.status !== 429 || tentativa >= maxRetries) {
      return resposta;
    }

    let dados = {};
    try {
      dados = await resposta.clone().json();
    } catch {
      dados = {};
    }

    const retryHeaderValor = resposta.headers.get("retry-after");
    const retryHeader =
      retryHeaderValor === null ? NaN : Number(retryHeaderValor);
    const retryBody = Number(dados.retry_after);
    const esperaSegundos =
      Number.isFinite(retryBody) && retryBody >= 0
        ? retryBody
        : retryHeader;

    // Se o prazo não puder ser interpretado ou for longo demais para uma
    // função serverless, não dispara outra requisição antes da hora.
    if (!Number.isFinite(esperaSegundos) || esperaSegundos < 0 || esperaSegundos > 7) {
      return resposta;
    }

    await new Promise((resolve) =>
      setTimeout(resolve, Math.ceil(esperaSegundos * 1000) + 100)
    );
    tentativa += 1;
  }
}

const PERMISSAO_GERENCIAR_SERVIDOR = 0x20n;

/* =========================================================
   OAuth2
========================================================= */

async function trocarCodigoPorToken(code) {
  const body = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID,
    client_secret: process.env.DISCORD_CLIENT_SECRET,
    grant_type: "authorization_code",
    code,
    redirect_uri:
      process.env.DISCORD_REDIRECT_URI ||
      process.env.DISCORD_REDIRECT_URL,
  });

  const resposta = await discordFetch(`${API}/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!resposta.ok) {
    throw new Error(
      `Falha ao trocar código por token (${resposta.status}): ${await resposta.text()}`
    );
  }

  return resposta.json();
}

/* =========================================================
   Usuário autenticado
========================================================= */

async function buscarUsuario(accessToken) {
  const resposta = await discordFetch(`${API}/users/@me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!resposta.ok) {
    throw new Error(
      `Falha ao buscar usuário (${resposta.status}): ${await resposta.text()}`
    );
  }

  return resposta.json();
}

/* =========================================================
   Servidores do usuário
========================================================= */

async function buscarServidoresGerenciaveis(accessToken) {
  const resposta = await discordFetch(`${API}/users/@me/guilds`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!resposta.ok) {
    throw new Error(
      `Falha ao buscar servidores (${resposta.status}): ${await resposta.text()}`
    );
  }

  const todos = await resposta.json();

  return todos.filter((g) => {
    try {
      return (
        g.owner ||
        (BigInt(g.permissions) & PERMISSAO_GERENCIAR_SERVIDOR) ===
          PERMISSAO_GERENCIAR_SERVIDOR
      );
    } catch {
      return false;
    }
  });
}

async function usuarioGerenciaServidor(accessToken, guildId) {
  const servidores = await buscarServidoresGerenciaveis(accessToken);

  return servidores.some((g) => g.id === guildId);
}

/* =========================================================
   Autenticação do BOT
========================================================= */

function headersBot() {
  const token = process.env.DISCORD_BOT_TOKEN;

  if (!token) {
    throw new Error(
      "DISCORD_BOT_TOKEN não está configurado nas variáveis de ambiente."
    );
  }

  return {
    Authorization: `Bot ${token}`,
    "Content-Type": "application/json",
  };
}

/*
 * Obtém a conta do bot associada ao DISCORD_BOT_TOKEN.
 *
 * Isso é importante porque o painel precisa saber exatamente
 * qual usuário/bot deve ser procurado dentro do servidor.
 */
async function buscarBot() {
  const resposta = await discordFetch(`${API}/users/@me`, {
    headers: headersBot(),
  });

  if (!resposta.ok) {
    const texto = await resposta.text();

    throw new Error(
      `Falha ao autenticar o bot (${resposta.status}): ${texto}`
    );
  }

  return resposta.json();
}

/* =========================================================
   Verificação da presença do BOT
========================================================= */

async function botEstaNoServidor(guildId, botConhecido = null) {
  if (!guildId) {
    return false;
  }

  /*
   * Reutiliza a identidade já consultada pelo chamador quando disponível,
   * evitando uma chamada /users/@me para cada servidor do usuário.
   */
  const bot = botConhecido || await buscarBot();

  if (!bot || !bot.id) {
    throw new Error(
      "O Discord não retornou a identidade do bot."
    );
  }

  /*
   * Agora verificamos se esse usuário/bot é membro
   * do servidor específico.
   */
  const resposta = await discordFetch(
    `${API}/guilds/${guildId}/members/${bot.id}`,
    {
      headers: headersBot(),
    }
  );

  /*
   * 200 = o bot é membro do servidor.
   */
  if (resposta.ok) {
    return true;
  }

  /*
   * 404 = o bot não está no servidor.
   */
  if (resposta.status === 404) {
    return false;
  }

  /*
   * Qualquer outro erro merece ser tratado como erro real,
   * em vez de simplesmente dizer que o bot está ausente.
   */
  const texto = await resposta.text();

  throw new Error(
    `Falha ao verificar presença do bot no servidor (${resposta.status}): ${texto}`
  );
}

/* =========================================================
   Canais
========================================================= */

async function listarCanais(guildId) {
  const resposta = await discordFetch(
    `${API}/guilds/${guildId}/channels`,
    {
      headers: headersBot(),
    }
  );

  if (!resposta.ok) {
    throw new Error(
      `Falha ao listar canais (${resposta.status}): ${await resposta.text()}`
    );
  }

  return resposta.json();
}

/* =========================================================
   Cargos
========================================================= */

async function listarCargos(guildId) {
  const resposta = await discordFetch(
    `${API}/guilds/${guildId}/roles`,
    {
      headers: headersBot(),
    }
  );

  if (!resposta.ok) {
    throw new Error(
      `Falha ao listar cargos (${resposta.status}): ${await resposta.text()}`
    );
  }

  return resposta.json();
}

/* =========================================================
   Criar canal
========================================================= */

async function criarCanal(guildId, nome, tipo, extra = {}) {
  const resposta = await discordFetch(
    `${API}/guilds/${guildId}/channels`,
    {
      method: "POST",
      headers: headersBot(),
      body: JSON.stringify({
        name: nome,
        type: tipo,
        ...extra,
      }),
    }
  );

  if (!resposta.ok) {
    throw new Error(
      `Falha ao criar canal (${resposta.status}): ${await resposta.text()}`
    );
  }

  return resposta.json();
}

/* =========================================================
   Apagar canal
========================================================= */

async function apagarCanal(canalId) {
  const resposta = await discordFetch(
    `${API}/channels/${canalId}`,
    {
      method: "DELETE",
      headers: headersBot(),
    }
  );

  if (!resposta.ok && resposta.status !== 404) {
    throw new Error(
      `Falha ao apagar canal (${resposta.status}): ${await resposta.text()}`
    );
  }
}

/* =========================================================
   Travar conexão do canal
========================================================= */

async function travarConexaoCanal(guildId, canalId) {
  const resposta = await discordFetch(
    `${API}/channels/${canalId}/permissions/${guildId}`,
    {
      method: "PUT",
      headers: headersBot(),
      body: JSON.stringify({
        type: 0,
        deny: "1048576",
      }),
    }
  );

  if (!resposta.ok) {
    throw new Error(
      `Falha ao travar permissão do canal (${resposta.status}): ${await resposta.text()}`
    );
  }
}

/* =========================================================
   Buscar canal
========================================================= */

async function buscarCanal(canalId) {
  const resposta = await discordFetch(
    `${API}/channels/${canalId}`,
    {
      headers: headersBot(),
    }
  );

  if (!resposta.ok) {
    return null;
  }

  return resposta.json();
}

/* =========================================================
   Enviar Embed
========================================================= */

async function enviarEmbed(canalId, embed, components) {
  const body = {
    embeds: [embed],
  };

  if (components) {
    body.components = components;
  }

  const resposta = await discordFetch(
    `${API}/channels/${canalId}/messages`,
    {
      method: "POST",
      headers: headersBot(),
      body: JSON.stringify(body),
    }
  );

  if (!resposta.ok) {
    throw new Error(
      `Falha ao enviar mensagem (${resposta.status}): ${await resposta.text()}`
    );
  }

  return resposta.json();
}

/* =========================================================
   Eventos agendados
========================================================= */

async function criarEventoAgendado(
  guildId,
  {
    nome,
    descricao,
    inicioISO,
    fimISO,
    canalVozId,
  }
) {
  const body = {
    name: nome,
    description: descricao,
    scheduled_start_time: inicioISO,
    scheduled_end_time: fimISO,
    privacy_level: 2,
  };

  if (canalVozId) {
    body.channel_id = canalVozId;
    body.entity_type = 2;
  } else {
    body.entity_type = 3;
    body.entity_metadata = {
      location: "A definir",
    };
  }

  const resposta = await discordFetch(
    `${API}/guilds/${guildId}/scheduled-events`,
    {
      method: "POST",
      headers: headersBot(),
      body: JSON.stringify(body),
    }
  );

  if (!resposta.ok) {
    throw new Error(
      `Falha ao criar evento (${resposta.status}): ${await resposta.text()}`
    );
  }

  return resposta.json();
}

/* =========================================================
   Moderação
========================================================= */

async function buscarMembro(guildId, userId) {
  const resposta = await discordFetch(
    `${API}/guilds/${guildId}/members/${userId}`,
    {
      headers: headersBot(),
    }
  );

  if (!resposta.ok) {
    return null;
  }

  return resposta.json();
}

async function banirMembro(guildId, userId, motivo) {
  const resposta = await discordFetch(
    `${API}/guilds/${guildId}/bans/${userId}`,
    {
      method: "PUT",
      headers: {
        ...headersBot(),
        "X-Audit-Log-Reason": encodeURIComponent(
          motivo || "Sem motivo informado."
        ),
      },
      body: JSON.stringify({
        delete_message_seconds: 0,
      }),
    }
  );

  if (!resposta.ok) {
    throw new Error(
      `Falha ao banir (${resposta.status}): ${await resposta.text()}`
    );
  }
}

async function expulsarMembro(guildId, userId, motivo) {
  const resposta = await discordFetch(
    `${API}/guilds/${guildId}/members/${userId}`,
    {
      method: "DELETE",
      headers: {
        ...headersBot(),
        "X-Audit-Log-Reason": encodeURIComponent(
          motivo || "Sem motivo informado."
        ),
      },
    }
  );

  if (!resposta.ok && resposta.status !== 404) {
    throw new Error(
      `Falha ao expulsar (${resposta.status}): ${await resposta.text()}`
    );
  }
}

async function aplicarTimeout(
  guildId,
  userId,
  minutos,
  motivo
) {
  const ate = new Date(
    Date.now() + minutos * 60000
  ).toISOString();

  const resposta = await discordFetch(
    `${API}/guilds/${guildId}/members/${userId}`,
    {
      method: "PATCH",
      headers: {
        ...headersBot(),
        "X-Audit-Log-Reason": encodeURIComponent(
          motivo || "Sem motivo informado."
        ),
      },
      body: JSON.stringify({
        communication_disabled_until: ate,
      }),
    }
  );

  if (!resposta.ok) {
    throw new Error(
      `Falha ao mutar (${resposta.status}): ${await resposta.text()}`
    );
  }
}

async function removerTimeout(guildId, userId) {
  const resposta = await discordFetch(
    `${API}/guilds/${guildId}/members/${userId}`,
    {
      method: "PATCH",
      headers: headersBot(),
      body: JSON.stringify({
        communication_disabled_until: null,
      }),
    }
  );

  if (!resposta.ok) {
    throw new Error(
      `Falha ao desmutar (${resposta.status}): ${await resposta.text()}`
    );
  }
}

/* =========================================================
   Exportações
========================================================= */

module.exports = {
  trocarCodigoPorToken,
  buscarUsuario,
  buscarServidoresGerenciaveis,
  usuarioGerenciaServidor,

  buscarBot,
  botEstaNoServidor,

  listarCanais,
  listarCargos,
  criarCanal,
  apagarCanal,
  travarConexaoCanal,
  buscarCanal,
  enviarEmbed,
  criarEventoAgendado,

  buscarMembro,
  banirMembro,
  expulsarMembro,
  aplicarTimeout,
  removerTimeout,
};