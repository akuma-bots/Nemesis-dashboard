const { lerSessao } = require("./sessao");
const { usuarioGerenciaServidor } = require("./discord");

async function exigirGerenciaServidor(event, guildId) {
  const sessao = lerSessao(event);
  if (!sessao) {
    return { erro: { statusCode: 401, body: JSON.stringify({ erro: "não autenticado" }) } };
  }
  if (!guildId) {
    return { erro: { statusCode: 400, body: JSON.stringify({ erro: "guildId é obrigatório" }) } };
  }
  const gerencia = await usuarioGerenciaServidor(sessao.access_token, guildId);
  if (!gerencia) {
    return { erro: { statusCode: 403, body: JSON.stringify({ erro: "Você não gerencia esse servidor." }) } };
  }
  return { sessao };
}

module.exports = { exigirGerenciaServidor };
