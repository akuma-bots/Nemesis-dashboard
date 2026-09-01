const { exigirGerenciaServidor } = require("./lib/autorizar");
const { carregarBlob, salvarBlob } = require("./lib/upstash");

async function _configAtual(todos, guildId) {
  return todos[guildId] || { grupo_id: null, mapeamentos: {} };
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  const corpo = JSON.parse(event.body || "{}");
  const { guildId, acao } = corpo;
  const { erro } = await exigirGerenciaServidor(event, guildId);
  if (erro) return erro;

  const todos = await carregarBlob("roblox_grupo_config.json", {});
  const atual = await _configAtual(todos, guildId);

  if (acao === "definir-grupo") {
    const { grupoId } = corpo;
    if (!grupoId || !/^\d+$/.test(String(grupoId))) {
      return { statusCode: 400, body: JSON.stringify({ erro: "grupoId precisa ser só números." }) };
    }
    atual.grupo_id = Number(grupoId);
  } else if (acao === "mapear") {
    const { rankRoblox, cargoId } = corpo;
    if (!rankRoblox || !cargoId) return { statusCode: 400, body: JSON.stringify({ erro: "rankRoblox e cargoId são obrigatórios" }) };
    atual.mapeamentos[rankRoblox] = cargoId;
  } else if (acao === "desmapear") {
    const { rankRoblox } = corpo;
    delete atual.mapeamentos[rankRoblox];
  } else {
    return { statusCode: 400, body: JSON.stringify({ erro: "ação inválida" }) };
  }

  todos[guildId] = atual;
  await salvarBlob("roblox_grupo_config.json", todos);

  return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ok: true, config: atual }) };
};
