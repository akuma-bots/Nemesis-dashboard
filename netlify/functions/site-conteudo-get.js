const { carregarBlob } = require("./lib/upstash");
const { PADRAO, comPadrao } = require("./lib/nemesis-conteudo-padrao");

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") return { statusCode: 405, body: "Method Not Allowed" };

  const conteudo = await carregarBlob("site_conteudo.json", PADRAO);

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(comPadrao(conteudo)),
  };
};
