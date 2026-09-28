const { lerSessao } = require("./lib/sessao");
const { buscarUsuario } = require("./lib/discord");
const { carregarBlob, salvarBlob } = require("./lib/upstash");
const { PADRAO, comPadrao } = require("./lib/formularios-padrao");

const API = "https://discord.com/api/v10";
const GUILD_ID_NEMESIS = "1543381737961160910";
const LIMITES = { curta: 300, longa: 2000, escolha: 200 };
const json = (status, corpo) => ({ statusCode: status, headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) });

async function notificar(form, r) {
  const headers = { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`, "Content-Type": "application/json" };
  const texto = `📩 **Nova candidatura** — ${form.titulo}\nCandidato: **${r.nome}** (<@${r.discordId}>)\nRevise em: ${process.env.URL || ""}/admin-formularios.html`;
  const cargos = form.cargosNotificar || [];

  // 1) DM para quem tem os cargos escolhidos (até 15 pessoas, em paralelo)
  if (cargos.length) {
    const resp = await fetch(`${API}/guilds/${GUILD_ID_NEMESIS}/members?limit=1000`, { headers });
    if (resp.ok) {
      const membros = await resp.json();
      const alvos = membros.filter((m) => !m.user.bot && m.roles.some((id) => cargos.includes(id))).slice(0, 15);
      await Promise.allSettled(alvos.map(async (m) => {
        const dm = await fetch(`${API}/users/@me/channels`, { method: "POST", headers, body: JSON.stringify({ recipient_id: m.user.id }) });
        if (!dm.ok) return;
        const canal = await dm.json();
        await fetch(`${API}/channels/${canal.id}/messages`, { method: "POST", headers, body: JSON.stringify({ content: texto }) });
      }));
    } else {
      console.error("Não consegui listar membros (intent de membros ativo?):", resp.status);
    }
  }

  // 2) Aviso no canal escolhido, marcando os cargos
  if (form.canalNotificacaoId) {
    const mencoes = cargos.map((id) => `<@&${id}>`).join(" ");
    await fetch(`${API}/channels/${form.canalNotificacaoId}/messages`, {
      method: "POST",
      headers,
      body: JSON.stringify({ content: `${mencoes}\n${texto}`, allowed_mentions: { roles: cargos } }),
    });
  }
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  const sessao = lerSessao(event);
  if (!sessao) return json(401, { erro: "não autenticado" });

  const corpo = JSON.parse(event.body || "{}");
  const dados = comPadrao(await carregarBlob("formularios.json", PADRAO));
  const form = dados.formularios.find((f) => f.id === corpo.formId && f.ativo);
  if (!form) return json(404, { erro: "Formulário não encontrado ou fechado." });

  const usuario = await buscarUsuario(sessao.access_token);

  const jaPendente = dados.respostas.some((r) => r.formId === form.id && r.discordId === usuario.id && r.status === "pendente");
  if (jaPendente) return json(400, { erro: "Você já tem uma candidatura pendente neste formulário." });

  const enviadas = corpo.respostas || {};
  const itens = [];
  for (const pagina of form.paginas) {
    for (const q of pagina.perguntas) {
      const valor = String(enviadas[q.id] ?? "").trim().slice(0, LIMITES[q.tipo] || 300);
      if (q.obrigatoria && !valor) return json(400, { erro: `Pergunta obrigatória sem resposta: ${q.texto}` });
      if (q.tipo === "escolha" && valor && !(q.opcoes || []).includes(valor)) return json(400, { erro: `Opção inválida em: ${q.texto}` });
      itens.push({ pergunta: q.texto, resposta: valor || "—" });
    }
  }

  const nova = {
    id: `resp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    formId: form.id,
    formTitulo: form.titulo,
    discordId: usuario.id,
    nome: usuario.username,
    itens,
    status: "pendente",
    criadoEm: Date.now(),
  };
  dados.respostas.push(nova);
  await salvarBlob("formularios.json", dados);

  try { await notificar(form, nova); } catch (e) { console.error("Falha ao notificar:", e); }

  return json(200, { ok: true });
};