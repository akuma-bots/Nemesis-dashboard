const { carregarBlob } = require("./lib/upstash");
const { PADRAO, comPadrao } = require("./lib/formularios-padrao");

const json = (status, corpo) => ({ statusCode: status, headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) });

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") return { statusCode: 405, body: "Method Not Allowed" };

  const dados = comPadrao(await carregarBlob("formularios.json", PADRAO));
  const ativos = dados.formularios.filter((f) => f.ativo);
  const id = event.queryStringParameters && event.queryStringParameters.id;

  if (id) {
    const f = ativos.find((x) => x.id === id);
    if (!f) return json(404, { erro: "Formulário não encontrado." });
    const { cargosNotificar, canalNotificacaoId, ...publico } = f;
    return json(200, { formulario: publico });
  }

  return json(200, { formularios: ativos.map((f) => ({ id: f.id, titulo: f.titulo, descricao: f.descricao })) });
};