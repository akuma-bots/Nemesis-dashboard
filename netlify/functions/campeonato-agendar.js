const { exigirGerenciaServidor } = require("./lib/autorizar");
const { criarEventoAgendado } = require("./lib/discord");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  let corpo;
  try { corpo = JSON.parse(event.body || "{}"); }
  catch { return { statusCode: 400, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ erro: "JSON inválido." }) }; }
  const { guildId, nome, descricao, inicio, canalVozId } = corpo;
  const { erro } = await exigirGerenciaServidor(event, guildId);
  if (erro) return erro;

  if (!nome || !inicio) {
    return { statusCode: 400, body: JSON.stringify({ erro: "nome e inicio (data/hora) são obrigatórios" }) };
  }

  if (canalVozId && !/^\d{17,20}$/.test(String(canalVozId))) {
    return { statusCode: 400, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ erro: "canalVozId inválido." }) };
  }
  const inicioDate = new Date(inicio);
  if (Number.isNaN(inicioDate.getTime()) || inicioDate.getTime() <= Date.now()) {
    return { statusCode: 400, body: JSON.stringify({ erro: "Data inválida ou no passado." }) };
  }
  const fimDate = new Date(inicioDate.getTime() + 2 * 60 * 60 * 1000);

  try {
    const evento = await criarEventoAgendado(guildId, {
      nome: String(nome).trim().slice(0, 100),
      descricao: String(descricao || "Campeonato criado pelo painel.").trim().slice(0, 1000),
      inicioISO: inicioDate.toISOString(),
      fimISO: fimDate.toISOString(),
      canalVozId: canalVozId || null,
    });
    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ok: true, eventoId: evento.id }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ erro: e.message }) };
  }
};
