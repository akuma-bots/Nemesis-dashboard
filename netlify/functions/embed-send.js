const { exigirGerenciaServidor } = require("./lib/autorizar");
const { buscarCanal, enviarEmbed } = require("./lib/discord");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  let corpo;
  try { corpo = JSON.parse(event.body || "{}"); }
  catch { return { statusCode: 400, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ erro: "JSON inválido." }) }; }
  const { guildId, canalId, titulo, descricao, cor, imagem, rodape, botao1Texto, botao1Url, botao2Texto, botao2Url } = corpo;
  const { erro } = await exigirGerenciaServidor(event, guildId);
  if (erro) return erro;
  if (!/^\d{17,20}$/.test(String(canalId || ""))) {
    return { statusCode: 400, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ erro: "canalId inválido." }) };
  }
  for (const [nome, url] of [["imagem", imagem], ["botao1Url", botao1Url], ["botao2Url", botao2Url]]) {
    if (url && !/^https?:\/\//i.test(String(url).trim())) {
      return { statusCode: 400, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ erro: `${nome} precisa ser uma URL HTTP ou HTTPS.` }) };
    }
  }

  const canal = await buscarCanal(canalId);
  if (!canal || canal.guild_id !== guildId) {
    return { statusCode: 400, body: JSON.stringify({ erro: "Esse canal não pertence a esse servidor." }) };
  }

  let corHex = 0x5865f2;
  if (cor) {
    const parsed = parseInt(cor.replace("#", ""), 16);
    if (!Number.isNaN(parsed)) corHex = parsed;
  }

  const tituloLimpo = typeof titulo === "string" ? titulo.trim().slice(0, 256) : "";
  const descricaoLimpa = typeof descricao === "string" ? descricao.trim().slice(0, 4000) : "";
  const rodapeLimpo = typeof rodape === "string" ? rodape.trim().slice(0, 2048) : "";
  const embed = {
    title: tituloLimpo || undefined,
    description: descricaoLimpa || undefined,
    color: corHex,
    image: imagem ? { url: String(imagem).trim() } : undefined,
    footer: rodapeLimpo ? { text: rodapeLimpo } : undefined,
  };

  const botoes = [];
  if (botao1Texto && botao1Url) botoes.push({ type: 2, style: 5, label: botao1Texto.slice(0, 80), url: botao1Url });
  if (botao2Texto && botao2Url) botoes.push({ type: 2, style: 5, label: botao2Texto.slice(0, 80), url: botao2Url });
  const components = botoes.length ? [{ type: 1, components: botoes }] : undefined;

  try {
    await enviarEmbed(canalId, embed, components);
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ erro: e.message }) };
  }

  return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ok: true }) };
};
