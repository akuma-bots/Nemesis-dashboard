const { exigirGerenciaServidor } = require("./lib/autorizar");
const { carregarBlob, salvarBlob } = require("./lib/upstash");

const ARQUIVOS_COM_DADOS = [
  "guild_configs.json", "perfis.json", "patentes_config.json", "guerras.json",
  "punicoes.json", "denuncias.json", "parcerias.json", "roblox_vinculos.json",
  "roblox_grupo_config.json", "modmail_canais.json",
];

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  const { guildId, dados } = JSON.parse(event.body || "{}");
  const { erro } = await exigirGerenciaServidor(event, guildId);
  if (erro) return erro;

  if (!dados || typeof dados !== "object") {
    return { statusCode: 400, body: JSON.stringify({ erro: "Arquivo de backup inválido." }) };
  }

  const restaurados = [];
  for (const nomeArquivo of Object.keys(dados)) {
    if (!ARQUIVOS_COM_DADOS.includes(nomeArquivo)) continue;

    const todos = await carregarBlob(nomeArquivo, {});
    todos[guildId] = dados[nomeArquivo];
    await salvarBlob(nomeArquivo, todos);
    restaurados.push(nomeArquivo);
  }

  if (!restaurados.length) {
    return { statusCode: 400, body: JSON.stringify({ erro: "O arquivo não tinha nenhum dado reconhecido pra restaurar." }) };
  }

  return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ok: true, restaurados }) };
};
