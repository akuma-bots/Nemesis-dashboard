const { exigirGerenciaServidor } = require("./lib/autorizar");
const { carregarBlob, salvarBlob } = require("./lib/upstash");

const ARQUIVOS_COM_DADOS = [
  "guild_configs.json", "perfis.json", "patentes_config.json", "guerras.json",
  "punicoes.json", "denuncias.json", "parcerias.json", "roblox_vinculos.json",
  "roblox_grupo_config.json", "modmail_canais.json",
];

const json = (statusCode, corpo) => ({
  statusCode,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  body: JSON.stringify(corpo),
});

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { erro: "Método não permitido." });

  let corpo;
  try { corpo = JSON.parse(event.body || "{}"); }
  catch { return json(400, { erro: "JSON inválido." }); }

  const guildId = String(corpo.guildId || "").trim();
  const dados = corpo.dados;
  const { erro } = await exigirGerenciaServidor(event, guildId);
  if (erro) return erro;

  if (!dados || typeof dados !== "object" || Array.isArray(dados)) {
    return json(400, { erro: "Arquivo de backup inválido." });
  }

  const restaurados = [];
  try {
    for (const nomeArquivo of Object.keys(dados)) {
      if (!ARQUIVOS_COM_DADOS.includes(nomeArquivo)) continue;
      const todosOriginais = await carregarBlob(nomeArquivo, {});
      const todos = todosOriginais && typeof todosOriginais === "object" && !Array.isArray(todosOriginais)
        ? todosOriginais
        : {};
      todos[guildId] = dados[nomeArquivo];
      await salvarBlob(nomeArquivo, todos);
      restaurados.push(nomeArquivo);
    }
  } catch (erroRestauro) {
    console.error("[BACKUP-RESTAURAR]", erroRestauro);
    return json(500, {
      erro: "A restauração foi interrompida. Confira os dados e tente novamente; os arquivos já listados podem ter sido restaurados.",
      restaurados,
    });
  }

  if (!restaurados.length) {
    return json(400, { erro: "O arquivo não tinha nenhum dado reconhecido para restaurar." });
  }

  return json(200, { ok: true, restaurados });
};
