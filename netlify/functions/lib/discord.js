const API = "https://discord.com/api/v10";
const PERMISSAO_GERENCIAR_SERVIDOR = 0x20n;

async function trocarCodigoPorToken(code) {
  const body = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID,
    client_secret: process.env.DISCORD_CLIENT_SECRET,
    grant_type: "authorization_code",
    code,
    redirect_uri: process.env.DISCORD_REDIRECT_URI || process.env.DISCORD_REDIRECT_URL,
  });
  const resposta = await fetch(`${API}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!resposta.ok) throw new Error(`Falha ao trocar código por token (${resposta.status}): ${await resposta.text()}`);
  return resposta.json();
}

async function buscarUsuario(accessToken) {
  const resposta = await fetch(`${API}/users/@me`, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!resposta.ok) throw new Error(`Falha ao buscar usuário (${resposta.status})`);
  return resposta.json();
}

async function buscarServidoresGerenciaveis(accessToken) {
  const resposta = await fetch(`${API}/users/@me/guilds`, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!resposta.ok) throw new Error(`Falha ao buscar servidores (${resposta.status})`);
  const todos = await resposta.json();
  return todos.filter((g) => g.owner || (BigInt(g.permissions) & PERMISSAO_GERENCIAR_SERVIDOR) === PERMISSAO_GERENCIAR_SERVIDOR);
}

async function usuarioGerenciaServidor(accessToken, guildId) {
  const servidores = await buscarServidoresGerenciaveis(accessToken);
  return servidores.some((g) => g.id === guildId);
}

function headersBot() {
  return { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`, "Content-Type": "application/json" };
}

async function botEstaNoServidor(guildId) {
  const resposta = await fetch(`${API}/guilds/${guildId}`, { headers: headersBot() });
  return resposta.ok;
}

async function listarCanais(guildId) {
  const resposta = await fetch(`${API}/guilds/${guildId}/channels`, { headers: headersBot() });
  if (!resposta.ok) throw new Error(`Falha ao listar canais (${resposta.status})`);
  return resposta.json();
}

async function listarCargos(guildId) {
  const resposta = await fetch(`${API}/guilds/${guildId}/roles`, { headers: headersBot() });
  if (!resposta.ok) throw new Error(`Falha ao listar cargos (${resposta.status})`);
  return resposta.json();
}

async function criarCanal(guildId, nome, tipo, extra = {}) {
  const resposta = await fetch(`${API}/guilds/${guildId}/channels`, {
    method: "POST",
    headers: headersBot(),
    body: JSON.stringify({ name: nome, type: tipo, ...extra }),
  });
  if (!resposta.ok) throw new Error(`Falha ao criar canal (${resposta.status}): ${await resposta.text()}`);
  return resposta.json();
}

async function apagarCanal(canalId) {
  const resposta = await fetch(`${API}/channels/${canalId}`, { method: "DELETE", headers: headersBot() });
  if (!resposta.ok && resposta.status !== 404) throw new Error(`Falha ao apagar canal (${resposta.status})`);
}

async function travarConexaoCanal(guildId, canalId) {
  const resposta = await fetch(`${API}/channels/${canalId}/permissions/${guildId}`, {
    method: "PUT",
    headers: headersBot(),
    body: JSON.stringify({ type: 0, deny: "1048576" }),
  });
  if (!resposta.ok) throw new Error(`Falha ao travar permissão do canal (${resposta.status})`);
}

async function buscarCanal(canalId) {
  const resposta = await fetch(`${API}/channels/${canalId}`, { headers: headersBot() });
  if (!resposta.ok) return null;
  return resposta.json();
}

async function enviarEmbed(canalId, embed, components) {
  const body = { embeds: [embed] };
  if (components) body.components = components;
  const resposta = await fetch(`${API}/channels/${canalId}/messages`, {
    method: "POST",
    headers: headersBot(),
    body: JSON.stringify(body),
  });
  if (!resposta.ok) throw new Error(`Falha ao enviar mensagem (${resposta.status}): ${await resposta.text()}`);
  return resposta.json();
}

async function criarEventoAgendado(guildId, { nome, descricao, inicioISO, fimISO, canalVozId }) {
  const body = {
    name: nome,
    description: descricao,
    scheduled_start_time: inicioISO,
    scheduled_end_time: fimISO,
    privacy_level: 2,
  };
  if (canalVozId) {
    body.channel_id = canalVozId;
    body.entity_type = 2; // voice
  } else {
    body.entity_type = 3; // external
    body.entity_metadata = { location: "A definir" };
  }
  const resposta = await fetch(`${API}/guilds/${guildId}/scheduled-events`, {
    method: "POST",
    headers: headersBot(),
    body: JSON.stringify(body),
  });
  if (!resposta.ok) throw new Error(`Falha ao criar evento (${resposta.status}): ${await resposta.text()}`);
  return resposta.json();
}

// ---------------- Moderação ----------------

async function buscarMembro(guildId, userId) {
  const resposta = await fetch(`${API}/guilds/${guildId}/members/${userId}`, { headers: headersBot() });
  if (!resposta.ok) return null;
  return resposta.json();
}

async function banirMembro(guildId, userId, motivo) {
  const resposta = await fetch(`${API}/guilds/${guildId}/bans/${userId}`, {
    method: "PUT",
    headers: { ...headersBot(), "X-Audit-Log-Reason": encodeURIComponent(motivo || "Sem motivo informado.") },
    body: JSON.stringify({ delete_message_seconds: 0 }),
  });
  if (!resposta.ok) throw new Error(`Falha ao banir (${resposta.status}): ${await resposta.text()}`);
}

async function expulsarMembro(guildId, userId, motivo) {
  const resposta = await fetch(`${API}/guilds/${guildId}/members/${userId}`, {
    method: "DELETE",
    headers: { ...headersBot(), "X-Audit-Log-Reason": encodeURIComponent(motivo || "Sem motivo informado.") },
  });
  if (!resposta.ok && resposta.status !== 404) throw new Error(`Falha ao expulsar (${resposta.status}): ${await resposta.text()}`);
}

async function aplicarTimeout(guildId, userId, minutos, motivo) {
  const ate = new Date(Date.now() + minutos * 60000).toISOString();
  const resposta = await fetch(`${API}/guilds/${guildId}/members/${userId}`, {
    method: "PATCH",
    headers: { ...headersBot(), "X-Audit-Log-Reason": encodeURIComponent(motivo || "Sem motivo informado.") },
    body: JSON.stringify({ communication_disabled_until: ate }),
  });
  if (!resposta.ok) throw new Error(`Falha ao mutar (${resposta.status}): ${await resposta.text()}`);
}

async function removerTimeout(guildId, userId) {
  const resposta = await fetch(`${API}/guilds/${guildId}/members/${userId}`, {
    method: "PATCH",
    headers: headersBot(),
    body: JSON.stringify({ communication_disabled_until: null }),
  });
  if (!resposta.ok) throw new Error(`Falha ao desmutar (${resposta.status}): ${await resposta.text()}`);
}

module.exports = {
  trocarCodigoPorToken,
  buscarUsuario,
  buscarServidoresGerenciaveis,
  usuarioGerenciaServidor,
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
