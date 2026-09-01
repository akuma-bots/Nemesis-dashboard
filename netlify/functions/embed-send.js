const { exigirGerenciaServidor } = require("./lib/autorizar");
const { buscarCanal, enviarEmbed } = require("./lib/discord");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  const { guildId, canalId, titulo, descricao, cor, imagem, rodape, botao1Texto, botao1Url, botao2Texto, botao2Url } = JSON.parse(event.body || "{}");
  const { erro } = await exigirGerenciaServidor(event, guildId);
  if (erro) return erro;

  const canal = await buscarCanal(canalId);
  if (!canal || canal.guild_id !== guildId) {
    return { statusCode: 400, body: JSON.stringify({ erro: "Esse canal não pertence a esse servidor." }) };
  }

  let corHex = 0x5865f2;
  if (cor) {
    const parsed = parseInt(cor.replace("#", ""), 16);
    if (!Number.isNaN(parsed)) corHex = parsed;
  }

  const embed = {
    title: titulo || undefined,
    description: descricao || undefined,
    color: corHex,
    image: imagem ? { url: imagem } : undefined,
    footer: rodape ? { text: rodape } : undefined,
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
