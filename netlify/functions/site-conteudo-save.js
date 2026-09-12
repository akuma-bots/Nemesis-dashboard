const { lerSessao } = require("./lib/sessao");
const { usuarioGerenciaServidor } = require("./lib/discord");
const { carregarBlob, salvarBlob } = require("./lib/upstash");
const { PADRAO, comPadrao } = require("./lib/nemesis-conteudo-padrao");

// ID fixo do servidor da NÊMESIS. Fica travado aqui de propósito — não pode
// vir do corpo da requisição, senão qualquer pessoa que gerencie QUALQUER
// outro servidor Discord poderia mandar o próprio guildId e passar pela
// autorização.
const GUILD_ID_NEMESIS = "1543381737961160910";

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  const sessao = lerSessao(event);
  if (!sessao) {
    return { statusCode: 401, body: JSON.stringify({ erro: "não autenticado" }) };
  }

  const gerencia = await usuarioGerenciaServidor(sessao.access_token, GUILD_ID_NEMESIS);
  if (!gerencia) {
    return { statusCode: 403, body: JSON.stringify({ erro: "Você não gerencia o servidor da NÊMESIS." }) };
  }

  const corpo = JSON.parse(event.body || "{}");
  const atual = comPadrao(await carregarBlob("site_conteudo.json", PADRAO));

  const novo = comPadrao({
    ...atual,
    titulo: typeof corpo.titulo === "string" ? corpo.titulo : atual.titulo,
    subtitulo: typeof corpo.subtitulo === "string" ? corpo.subtitulo : atual.subtitulo,
    cartoes: Array.isArray(corpo.cartoes) ? corpo.cartoes : atual.cartoes,
    divisoes: Array.isArray(corpo.divisoes) ? corpo.divisoes : atual.divisoes,
  });

  await salvarBlob("site_conteudo.json", novo);

  return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ok: true, conteudo: novo }) };
};
