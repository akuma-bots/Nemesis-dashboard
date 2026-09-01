const { exigirGerenciaServidor } = require("./lib/autorizar");
const { carregarBlob, salvarBlob } = require("./lib/upstash");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  const { guildId, nome, xpMinimo, cargoId } = JSON.parse(event.body || "{}");
  const { erro } = await exigirGerenciaServidor(event, guildId);
  if (erro) return erro;

  if (!nome || xpMinimo === undefined) {
    return { statusCode: 400, body: JSON.stringify({ erro: "nome e xpMinimo são obrigatórios" }) };
  }

  const todas = await carregarBlob("patentes_config.json", {});
  const lista = (todas[guildId] || []).filter((p) => p.nome.toLowerCase() !== nome.toLowerCase());
  lista.push({ nome, xp_minimo: Number(xpMinimo), cargo_id: cargoId || null });
  todas[guildId] = lista;
  await salvarBlob("patentes_config.json", todas);

  return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ok: true, patentes: lista.sort((a, b) => a.xp_minimo - b.xp_minimo) }) };
};
