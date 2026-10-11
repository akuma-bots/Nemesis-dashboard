const { exigirGerenciaServidor } = require("./lib/autorizar");
const { carregarBlob, salvarBlob } = require("./lib/upstash");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  let corpo;
  try { corpo = JSON.parse(event.body || "{}"); }
  catch { return { statusCode: 400, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ erro: "JSON inválido." }) }; }
  const { guildId, nome } = corpo;
  const { erro } = await exigirGerenciaServidor(event, guildId);
  if (erro) return erro;
  if (typeof nome !== "string" || !nome.trim()) {
    return { statusCode: 400, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ erro: "Informe o nome da patente." }) };
  }

  const todas = await carregarBlob("patentes_config.json", {});
  const lista = (Array.isArray(todas[guildId]) ? todas[guildId] : []).filter((p) => String(p.nome || "").toLowerCase() !== nome.trim().toLowerCase());
  todas[guildId] = lista;
  await salvarBlob("patentes_config.json", todas);

  return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ok: true, patentes: lista }) };
};
