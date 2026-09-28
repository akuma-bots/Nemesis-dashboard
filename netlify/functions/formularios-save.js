const { lerSessao } = require("./lib/sessao");
const { usuarioGerenciaServidor } = require("./lib/discord");
const { carregarBlob, salvarBlob } = require("./lib/upstash");
const { PADRAO, comPadrao } = require("./lib/formularios-padrao");

const GUILD_ID_NEMESIS = "1543381737961160910";
const TIPOS = ["curta", "longa", "escolha"];
const json = (status, corpo) => ({ statusCode: status, headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) });
const lista = (v) => (Array.isArray(v) ? v : []);

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  const sessao = lerSessao(event);
  if (!sessao) return json(401, { erro: "não autenticado" });
  if (!(await usuarioGerenciaServidor(sessao.access_token, GUILD_ID_NEMESIS))) {
    return json(403, { erro: "Você não gerencia o servidor da NÊMESIS." });
  }

  const corpo = JSON.parse(event.body || "{}");
  if (!Array.isArray(corpo.formularios)) return json(400, { erro: "formularios precisa ser uma lista." });

  const formularios = corpo.formularios.map((f) => ({
    id: String(f.id),
    titulo: String(f.titulo || "").slice(0, 120),
    descricao: String(f.descricao || "").slice(0, 500),
    ativo: !!f.ativo,
    cargosNotificar: lista(f.cargosNotificar).map(String),
    canalNotificacaoId: String(f.canalNotificacaoId || ""),
    paginas: lista(f.paginas).map((p) => ({
      titulo: String(p.titulo || "").slice(0, 120),
      perguntas: lista(p.perguntas).map((q) => ({
        id: String(q.id),
        texto: String(q.texto || "").slice(0, 300),
        tipo: TIPOS.includes(q.tipo) ? q.tipo : "curta",
        obrigatoria: !!q.obrigatoria,
        opcoes: lista(q.opcoes).map((o) => String(o).trim()).filter(Boolean).slice(0, 25),
      })),
    })),
  }));

  const atual = comPadrao(await carregarBlob("formularios.json", PADRAO));
  await salvarBlob("formularios.json", { ...atual, formularios });

  return json(200, { ok: true });
};