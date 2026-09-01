const { exigirGerenciaServidor } = require("./lib/autorizar");
const { carregarBlob } = require("./lib/upstash");

const ARQUIVOS_COM_DADOS = [
  "guild_configs.json", "perfis.json", "patentes_config.json", "guerras.json",
  "punicoes.json", "denuncias.json", "parcerias.json", "roblox_vinculos.json",
  "roblox_grupo_config.json", "modmail_canais.json",
];

exports.handler = async (event) => {
  const guildId = event.queryStringParameters && event.queryStringParameters.guildId;
  const { erro } = await exigirGerenciaServidor(event, guildId);
  if (erro) return erro;

  const resultado = {};
  for (const nomeArquivo of ARQUIVOS_COM_DADOS) {
    const todos = await carregarBlob(nomeArquivo, {});
    if (todos[guildId] !== undefined) resultado[nomeArquivo] = todos[guildId];
  }

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="backup-${guildId}.json"`,
    },
    body: JSON.stringify(resultado, null, 2),
  };
};
