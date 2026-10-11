const { exigirCargoModeracao } = require("./lib/autorizar-moderacao");
const { removerTimeout } = require("./lib/discord");
const { carregarBlob, salvarBlob } = require("./lib/upstash");

async function registrarAcao(guildId, acao) {
  const dados = await carregarBlob("acoes_moderacao.json", {});
  const lista = Array.isArray(dados[guildId]) ? dados[guildId] : [];
  lista.unshift({ ...acao, quando: Date.now() });
  dados[guildId] = lista.slice(0, 200);
  await salvarBlob("acoes_moderacao.json", dados);
}

const json = (statusCode, corpo) => ({
  statusCode,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  body: JSON.stringify(corpo),
});

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { erro: "Método não permitido." });
  }

  let corpo;
  try {
    corpo = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { erro: "JSON inválido." });
  }

  const guildId = String(corpo.guildId || "").trim();
  const userId = String(corpo.userId || "").trim();
  const motivo = String(corpo.motivo || "").trim().slice(0, 500);

  try {
    const { erro, usuario } = await exigirCargoModeracao(event, guildId, "basico");
    if (erro) return erro;
    if (!/^\d{17,20}$/.test(userId)) {
      return json(400, { erro: "userId precisa ser um ID válido do Discord." });
    }

    // Desfaz o timeout existente; não aplica um novo timeout.
    await removerTimeout(guildId, userId);

    try {
      await registrarAcao(guildId, {
        tipo: "unmute",
        userId,
        motivo: motivo || null,
        por: usuario.id,
      });
    } catch (erroLog) {
      // A ação do Discord já foi concluída; falha de auditoria não deve
      // induzir o painel a repetir uma ação que já aconteceu.
      console.error("[MODERACAO-UNMUTE] Timeout removido, mas o histórico falhou:", erroLog);
    }

    return json(200, { ok: true });
  } catch (erro) {
    console.error("[MODERACAO-UNMUTE]", erro);
    return json(502, { erro: "Não foi possível remover o timeout. Confira as permissões do bot e o ID do usuário." });
  }
};
