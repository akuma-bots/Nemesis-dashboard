const { lerSessao } = require("./sessao");
const { usuarioGerenciaServidor, buscarUsuario, buscarMembro } = require("./discord");
const { carregarBlob } = require("./upstash");
const { comPadrao } = require("./config-padrao");

// nivelMinimo: "total" (banir/expulsar/mutar/advertir) ou "basico" (só mutar/advertir).
// Quem gerencia o servidor no Discord (dono/admin) sempre passa, mesmo sem
// estar marcado num dos cargos configurados abaixo — é o mesmo critério já
// usado pra acessar o resto do painel.
async function exigirCargoModeracao(event, guildId, nivelMinimo) {
  const sessao = lerSessao(event);
  if (!sessao) return { erro: { statusCode: 401, body: JSON.stringify({ erro: "não autenticado" }) } };
  if (!guildId) return { erro: { statusCode: 400, body: JSON.stringify({ erro: "guildId é obrigatório" }) } };

  const usuario = await buscarUsuario(sessao.access_token);

  const gerencia = await usuarioGerenciaServidor(sessao.access_token, guildId);
  if (gerencia) return { sessao, usuario };

  const membro = await buscarMembro(guildId, usuario.id);
  if (!membro) {
    return { erro: { statusCode: 403, body: JSON.stringify({ erro: "Você não está nesse servidor." }) } };
  }

  const configs = await carregarBlob("guild_configs.json", {});
  const config = comPadrao(configs[guildId]);
  const total = config.cargos_moderacao_total || [];
  const basico = config.cargos_moderacao_basico || [];
  const permitidos = nivelMinimo === "total" ? total : [...total, ...basico];

  const temCargo = membro.roles.some((id) => permitidos.includes(id));
  if (!temCargo) {
    return { erro: { statusCode: 403, body: JSON.stringify({ erro: "Você não tem um cargo de moderação com essa permissão." }) } };
  }

  return { sessao, usuario };
}

module.exports = { exigirCargoModeracao };
