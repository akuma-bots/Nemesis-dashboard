const { exigirGerenciaServidor } = require("./lib/autorizar");
const { carregarBlob, salvarBlob } = require("./lib/upstash");
const { comPadrao } = require("./lib/config-padrao");
const { criarCanal, travarConexaoCanal } = require("./lib/discord");

const ROTULOS = { membros: "👥 Membros", online: "🟢 Online", bots: "🤖 Bots", boosts: "🚀 Boosts", cargo: "🏷️ Cargo" };
const TIPOS_VALIDOS = Object.keys(ROTULOS);

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  const { guildId, tipo, cargoId, cargoNome } = JSON.parse(event.body || "{}");
  const { erro } = await exigirGerenciaServidor(event, guildId);
  if (erro) return erro;

  if (!TIPOS_VALIDOS.includes(tipo)) return { statusCode: 400, body: JSON.stringify({ erro: "tipo inválido" }) };
  if (tipo === "cargo" && !cargoId) return { statusCode: 400, body: JSON.stringify({ erro: "cargoId é obrigatório pra tipo 'cargo'" }) };

  const rotulo = tipo === "cargo" ? `🏷️ ${cargoNome || "Cargo"}` : ROTULOS[tipo];
  const canal = await criarCanal(guildId, `${rotulo}: ...`, 2);
  await travarConexaoCanal(guildId, canal.id);

  const configs = await carregarBlob("guild_configs.json", {});
  const atual = comPadrao(configs[guildId]);
  atual.contadores = atual.contadores.filter((c) => c.canal_id !== canal.id);
  atual.contadores.push({ tipo, canal_id: canal.id, cargo_id: tipo === "cargo" ? cargoId : null });
  configs[guildId] = atual;
  await salvarBlob("guild_configs.json", configs);

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ok: true, contadores: atual.contadores, aviso: "O número real aparece em até 10 minutos, quando o bot atualiza o nome do canal." }),
  };
};
