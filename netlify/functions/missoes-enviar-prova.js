const { lerSessao } = require("./lib/sessao");
const { buscarUsuario } = require("./lib/discord");
const { carregarBlob, salvarBlob } = require("./lib/upstash");
const { PADRAO, comPadrao } = require("./lib/missoes-padrao");

// Limite de tamanho da imagem em base64 (~1.5MB de arquivo original vira
// bem mais em base64, então o limite aqui já é sobre o texto base64 em si).
const LIMITE_BASE64 = 2_100_000; // ~1.5MB de imagem original

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  const sessao = lerSessao(event);
  if (!sessao) return { statusCode: 401, body: JSON.stringify({ erro: "não autenticado" }) };

  const corpo = JSON.parse(event.body || "{}");
  const { missaoId, imagemBase64 } = corpo;
  if (!missaoId || !imagemBase64) {
    return { statusCode: 400, body: JSON.stringify({ erro: "missaoId e imagemBase64 são obrigatórios." }) };
  }
  if (imagemBase64.length > LIMITE_BASE64) {
    return { statusCode: 400, body: JSON.stringify({ erro: "Imagem muito grande. Envie um print de até 1.5MB." }) };
  }

  const usuario = await buscarUsuario(sessao.access_token);

  const atual = comPadrao(await carregarBlob("missoes.json", PADRAO));
  const missao = atual.missoes.find((m) => m.id === missaoId);
  if (!missao || !missao.ativa) {
    return { statusCode: 404, body: JSON.stringify({ erro: "Essa missão não existe ou não está mais ativa." }) };
  }

  const submissao = {
    id: `sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    missaoId,
    missaoTitulo: missao.titulo,
    missaoPontos: missao.pontos,
    discordId: usuario.id,
    nome: usuario.username,
    imagemBase64,
    status: "pendente",
    criadoEm: Date.now(),
  };

  atual.submissoes.push(submissao);
  await salvarBlob("missoes.json", atual);

  return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ok: true }) };
};
