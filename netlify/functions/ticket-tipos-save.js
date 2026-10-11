const { exigirGerenciaServidor } = require("./lib/autorizar");
const { carregarBlob, salvarBlob } = require("./lib/upstash");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  let corpo;
  try { corpo = JSON.parse(event.body || "{}"); }
  catch { return { statusCode: 400, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ erro: "JSON inválido." }) }; }
  const { guildId, tipos } = corpo;

  const { erro } = await exigirGerenciaServidor(event, guildId);
  if (erro) return erro;

  if (!Array.isArray(tipos) || tipos.length > 25) {
    return { statusCode: 400, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ erro: "tipos precisa ser uma lista com no máximo 25 opções." }) };
  }

  const normalizados = [];
  const valores = new Set();
  for (const item of tipos) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return { statusCode: 400, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ erro: "Cada tipo de ticket precisa ser um objeto válido." }) };
    }
    const valor = String(item.valor || "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 80);
    const label = String(item.label || "").trim().slice(0, 100);
    const descricao = String(item.descricao || "").trim().slice(0, 100);
    const emoji = String(item.emoji || "🎫").trim().slice(0, 32);
    if (!valor || !label || valores.has(valor)) {
      return { statusCode: 400, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ erro: "Cada opção precisa ter valor e nome únicos." }) };
    }
    valores.add(valor);
    normalizados.push({ valor, label, descricao, emoji, usa_ia: item.usa_ia === true });
  }

  const todos = await carregarBlob("ticket_tipos.json", {});
  todos[guildId] = normalizados;
  await salvarBlob("ticket_tipos.json", todos);

  return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ok: true, tipos: normalizados }) };
};