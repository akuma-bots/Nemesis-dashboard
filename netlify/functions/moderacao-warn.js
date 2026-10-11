const { exigirCargoModeracao } = require("./lib/autorizar-moderacao");
const { carregarBlob, salvarBlob } = require("./lib/upstash");

const json = (statusCode, corpo) => ({
  statusCode,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  body: JSON.stringify(corpo),
});

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { erro: "Método não permitido." });

  let corpo;
  try { corpo = JSON.parse(event.body || "{}"); }
  catch { return json(400, { erro: "JSON inválido." }); }

  const guildId = String(corpo.guildId || "").trim();
  const userId = String(corpo.userId || "").trim();
  const motivo = String(corpo.motivo || "").trim().slice(0, 500);
  if (!/^\d{17,20}$/.test(userId) || !motivo) {
    return json(400, { erro: "Informe um ID válido do Discord e o motivo da advertência." });
  }

  try {
    const { erro, usuario } = await exigirCargoModeracao(event, guildId, "basico");
    if (erro) return erro;

    const dados = await carregarBlob("acoes_moderacao.json", {});
    const lista = Array.isArray(dados[guildId]) ? dados[guildId] : [];
    lista.unshift({ tipo: "warn", userId, motivo, por: usuario.id, quando: Date.now() });
    dados[guildId] = lista.slice(0, 200);
    await salvarBlob("acoes_moderacao.json", dados);

    return json(200, { ok: true });
  } catch (erro) {
    console.error("[MODERACAO-WARN]", erro);
    return json(500, { erro: "Não foi possível registrar a advertência." });
  }
};
