const { lerSessao } = require("./lib/sessao");
const { usuarioGerenciaServidor } = require("./lib/discord");
const { carregarBlob, salvarBlob } = require("./lib/upstash");
const { PADRAO, comPadrao } = require("./lib/missoes-padrao");
const { PADRAO: PADRAO_COMPETITIVO, comPadrao: comPadraoCompetitivo } = require("./lib/competitivo-padrao");

const GUILD_ID_NEMESIS = "1543381737961160910";

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  const sessao = lerSessao(event);
  if (!sessao) return { statusCode: 401, body: JSON.stringify({ erro: "não autenticado" }) };

  const gerencia = await usuarioGerenciaServidor(sessao.access_token, GUILD_ID_NEMESIS);
  if (!gerencia) return { statusCode: 403, body: JSON.stringify({ erro: "Você não gerencia o servidor da NÊMESIS." }) };

  const corpo = JSON.parse(event.body || "{}");
  const { submissaoId, decisao, motivoRecusa } = corpo;
  if (!submissaoId || !["aprovada", "recusada"].includes(decisao)) {
    return { statusCode: 400, body: JSON.stringify({ erro: "submissaoId e decisao (aprovada/recusada) são obrigatórios." }) };
  }

  const atual = comPadrao(await carregarBlob("missoes.json", PADRAO));
  const submissao = atual.submissoes.find((s) => s.id === submissaoId);
  if (!submissao) return { statusCode: 404, body: JSON.stringify({ erro: "Submissão não encontrada." }) };
  if (submissao.status !== "pendente") {
    return { statusCode: 400, body: JSON.stringify({ erro: "Essa submissão já foi revisada." }) };
  }

  submissao.status = decisao;
  submissao.motivoRecusa = decisao === "recusada" ? (motivoRecusa || "Sem motivo informado.") : null;
  // A imagem não precisa mais ficar guardada depois de revisada — libera espaço no banco.
  delete submissao.imagemBase64;

  if (decisao === "aprovada") {
    const competitivo = comPadraoCompetitivo(await carregarBlob("competitivo.json", PADRAO_COMPETITIVO));
    const perfilAtual = competitivo.perfis[submissao.discordId] || {
      discordId: submissao.discordId, nome: submissao.nome, pontos: 0, elo: 1000, vitorias: 0, derrotas: 0,
    };
    perfilAtual.pontos = (perfilAtual.pontos || 0) + (submissao.missaoPontos || 0);
    perfilAtual.nome = submissao.nome || perfilAtual.nome;
    competitivo.perfis[submissao.discordId] = perfilAtual;
    await salvarBlob("competitivo.json", competitivo);
  }

  await salvarBlob("missoes.json", atual);

  return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ok: true }) };
};
