const { carregarBlob } = require("./lib/upstash");
const { PADRAO, comPadrao } = require("./lib/missoes-padrao");

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") return { statusCode: 405, body: "Method Not Allowed" };

  const conteudo = comPadrao(await carregarBlob("missoes.json", PADRAO));
  const ativas = conteudo.missoes.filter((m) => m.ativa);

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ missoes: ativas }),
  };
};
