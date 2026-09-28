const { exigirGerenciaServidor } = require("./lib/autorizar");
const { carregarBlob } = require("./lib/upstash");

const TIPOS_PADRAO = [
  { valor: "duvidas", label: "Dúvidas", emoji: "❓", descricao: "Clique aqui, para tirar as suas dúvidas!", usa_ia: true },
  { valor: "recompensas", label: "Reivindicar recompensas", emoji: "🎁", descricao: "Reivindique aqui as suas recompensas.", usa_ia: false },
  { valor: "patrocinar", label: "Patrocinar", emoji: "📣", descricao: "Clique aqui, para patrocinar o servidor/projeto!", usa_ia: false },
  { valor: "vip", label: "Obter VIP", emoji: "👑", descricao: "Clique aqui, para adquirir uma VIP!", usa_ia: false },
  { valor: "destacar", label: "Destacar", emoji: "✨", descricao: "Destaque aqui o seu servidor/projeto.", usa_ia: false },
  { valor: "outro", label: "Outro", emoji: "🔁", descricao: "A sua opção não está acima? Clique aqui!", usa_ia: false },
];

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") return { statusCode: 405, body: "Method Not Allowed" };

  const guildId = event.queryStringParameters && event.queryStringParameters.guildId;
  const { erro } = await exigirGerenciaServidor(event, guildId);
  if (erro) return erro;

  const todos = await carregarBlob("ticket_tipos.json", {});
  const tipos = todos[guildId] || TIPOS_PADRAO;

  return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tipos }) };
};