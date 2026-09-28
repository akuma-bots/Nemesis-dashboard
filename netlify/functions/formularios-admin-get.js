const { lerSessao } = require("./lib/sessao");
const { usuarioGerenciaServidor, listarCargos, listarCanais } = require("./lib/discord");
const { carregarBlob } = require("./lib/upstash");
const { PADRAO, comPadrao } = require("./lib/formularios-padrao");

const GUILD_ID_NEMESIS = "1543381737961160910";
const json = (status, corpo) => ({ statusCode: status, headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) });

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") return { statusCode: 405, body: "Method Not Allowed" };

  const sessao = lerSessao(event);
  if (!sessao) return json(401, { erro: "não autenticado" });
  if (!(await usuarioGerenciaServidor(sessao.access_token, GUILD_ID_NEMESIS))) {
    return json(403, { erro: "Você não gerencia o servidor da NÊMESIS." });
  }

  const dados = comPadrao(await carregarBlob("formularios.json", PADRAO));

  let cargos = [];
  let canais = [];
  try {
    cargos = (await listarCargos(GUILD_ID_NEMESIS))
      .filter((c) => c.id !== GUILD_ID_NEMESIS && !c.managed)
      .sort((a, b) => b.position - a.position)
      .map((c) => ({ id: c.id, nome: c.name }));
  } catch (e) { console.error("Falha ao listar cargos:", e); }
  try {
    canais = (await listarCanais(GUILD_ID_NEMESIS))
      .filter((c) => c.type === 0)
      .map((c) => ({ id: c.id, nome: c.name }));
  } catch (e) { console.error("Falha ao listar canais:", e); }

  return json(200, { formularios: dados.formularios, respostas: dados.respostas, cargos, canais });
};