const { exigirGerenciaServidor } = require("./lib/autorizar");
const { carregarBlob, salvarBlob } = require("./lib/upstash");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  const { guildId, nome } = JSON.parse(event.body || "{}");
  const { erro } = await exigirGerenciaServidor(event, guildId);
  if (erro) return erro;

  const todas = await carregarBlob("parcerias.json", {});
  const lista = (todas[guildId] || []).filter((p) => p.nome.toLowerCase() !== String(nome).toLowerCase());
  todas[guildId] = lista;
  await salvarBlob("parcerias.json", todas);

  return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ok: true, parcerias: lista }) };
};
