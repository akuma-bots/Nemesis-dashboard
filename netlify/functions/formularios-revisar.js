const { lerSessao } = require("./lib/sessao");
const { usuarioGerenciaServidor } = require("./lib/discord");
const { carregarBlob, salvarBlob } = require("./lib/upstash");
const { PADRAO, comPadrao } = require("./lib/formularios-padrao");

const API = "https://discord.com/api/v10";
const GUILD_ID_NEMESIS = "1543381737961160910";
const json = (status, corpo) => ({ statusCode: status, headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) });

async function avisarCandidato(r, decisao, mensagem) {
  const headers = { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`, "Content-Type": "application/json" };
  const dm = await fetch(`${API}/users/@me/channels`, { method: "POST", headers, body: JSON.stringify({ recipient_id: r.discordId }) });
  if (!dm.ok) return;
  const canal = await dm.json();
  const base = decisao === "aprovada"
    ? `✅ Sua candidatura em **${r.formTitulo}** foi **aprovada**.`
    : `❌ Sua candidatura em **${r.formTitulo}** foi **recusada**.`;
  const content = mensagem ? `${base}\n\n${mensagem}` : base;
  await fetch(`${API}/channels/${canal.id}/messages`, { method: "POST", headers, body: JSON.stringify({ content }) });
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  const sessao = lerSessao(event);
  if (!sessao) return json(401, { erro: "não autenticado" });
  if (!(await usuarioGerenciaServidor(sessao.access_token, GUILD_ID_NEMESIS))) {
    return json(403, { erro: "Você não gerencia o servidor da NÊMESIS." });
  }

  const { respostaId, decisao, mensagem } = JSON.parse(event.body || "{}");
  if (!respostaId || !["aprovada", "recusada"].includes(decisao)) {
    return json(400, { erro: "respostaId e decisao (aprovada/recusada) são obrigatórios." });
  }

  const dados = comPadrao(await carregarBlob("formularios.json", PADRAO));
  const r = dados.respostas.find((x) => x.id === respostaId);
  if (!r) return json(404, { erro: "Candidatura não encontrada." });
  if (r.status !== "pendente") return json(400, { erro: "Essa candidatura já foi revisada." });

  r.status = decisao;
  await salvarBlob("formularios.json", dados);

  try { await avisarCandidato(r, decisao, String(mensagem || "").slice(0, 1000)); } catch (e) { console.error("Falha ao avisar candidato:", e); }

  return json(200, { ok: true });
};