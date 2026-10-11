const { exigirGerenciaServidor } = require("./lib/autorizar");
const { carregarBlob, salvarBlob } = require("./lib/upstash");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  let corpo;
  try { corpo = JSON.parse(event.body || "{}"); }
  catch { return { statusCode: 400, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ erro: "JSON inválido." }) }; }

  const { guildId, nome, xpMinimo, cargoId } = corpo;
  const { erro } = await exigirGerenciaServidor(event, guildId);
  if (erro) return erro;

  const nomeLimpo = typeof nome === "string" ? nome.trim().slice(0, 80) : "";
  const xp = Number(xpMinimo);
  if (!nomeLimpo || xpMinimo === undefined || !Number.isFinite(xp) || xp < 0 || xp > 1000000000) {
    return { statusCode: 400, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ erro: "Informe um nome e um XP mínimo válido entre 0 e 1.000.000.000." }) };
  }
  if (cargoId && !/^\d{17,20}$/.test(String(cargoId))) {
    return { statusCode: 400, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ erro: "cargoId inválido." }) };
  }

  const todas = await carregarBlob("patentes_config.json", {});
  const lista = (Array.isArray(todas[guildId]) ? todas[guildId] : []).filter((p) => String(p.nome || "").toLowerCase() !== nomeLimpo.toLowerCase());
  lista.push({ nome: nomeLimpo, xp_minimo: xp, cargo_id: cargoId || null });
  todas[guildId] = lista;
  await salvarBlob("patentes_config.json", todas);

  return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ok: true, patentes: lista.sort((a, b) => a.xp_minimo - b.xp_minimo) }) };
};
