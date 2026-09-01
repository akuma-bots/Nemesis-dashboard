const { exigirGerenciaServidor } = require("./lib/autorizar");
const { carregarBlob, salvarBlob } = require("./lib/upstash");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  const { guildId, id, acao } = JSON.parse(event.body || "{}");
  const { erro } = await exigirGerenciaServidor(event, guildId);
  if (erro) return erro;

  const todas = await carregarBlob("denuncias.json", {});
  const lista = todas[guildId] || [];
  const registro = lista.find((d) => d.id === id);
  if (!registro) return { statusCode: 404, body: JSON.stringify({ erro: "Denúncia não encontrada." }) };

  registro.status = "resolvida";
  registro.resolucao = acao || "Resolvida pelo painel";
  todas[guildId] = lista;
  await salvarBlob("denuncias.json", todas);

  return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ok: true }) };
};
