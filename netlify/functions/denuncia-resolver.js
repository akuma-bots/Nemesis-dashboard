const { exigirGerenciaServidor } = require("./lib/autorizar");
const { carregarBlob, salvarBlob } = require("./lib/upstash");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  let corpo;
  try { corpo = JSON.parse(event.body || "{}"); }
  catch { return { statusCode: 400, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ erro: "JSON inválido." }) }; }
  const { guildId, id, acao } = corpo;
  const { erro } = await exigirGerenciaServidor(event, guildId);
  if (erro) return erro;
  if (!id) return { statusCode: 400, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ erro: "ID da denúncia é obrigatório." }) };

  const todas = await carregarBlob("denuncias.json", {});
  const lista = Array.isArray(todas[guildId]) ? todas[guildId] : [];
  const registro = lista.find((d) => d.id === id);
  if (!registro) return { statusCode: 404, body: JSON.stringify({ erro: "Denúncia não encontrada." }) };

  registro.status = "resolvida";
  registro.resolucao = String(acao || "Resolvida pelo painel").trim().slice(0, 500);
  todas[guildId] = lista;
  await salvarBlob("denuncias.json", todas);

  return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ok: true }) };
};
