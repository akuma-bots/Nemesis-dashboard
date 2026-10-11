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
  const descricaoLimpa = typeof descricao === "string" ? descricao.trim() : "";
  const rodapeLimpo = typeof rodape === "string" ? rodape.trim().slice(0, 2048) : "";

  if (descricaoLimpa.length > 20000) {
    return { statusCode: 400, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ erro: "A descrição pode ter no máximo 20.000 caracteres." }) };
  }

  // O Discord limita a descrição de cada embed a 4.096 caracteres.
  // Textos longos são divididos em mensagens sequenciais, sem truncar o conteúdo.
  function dividirDescricao(texto, limite = 4000) {
    if (!texto) return [""];
    const partes = [];
    let restante = texto;
    while (restante.length > limite) {
      let corte = restante.lastIndexOf("\n", limite);
      if (corte < Math.floor(limite * 0.6)) corte = restante.lastIndexOf(" ", limite);
      if (corte < Math.floor(limite * 0.6)) corte = limite;
      partes.push(restante.slice(0, corte));
      restante = restante.slice(corte);
      if (restante.startsWith("\n") || restante.startsWith(" ")) restante = restante.slice(1);
    }
    if (restante.length || !partes.length) partes.push(restante);
    return partes;
  }

  const partesDescricao = dividirDescricao(descricaoLimpa);
  const botoes = [];
  if (botao1Texto && botao1Url) botoes.push({ type: 2, style: 5, label: botao1Texto.slice(0, 80), url: botao1Url });
  if (botao2Texto && botao2Url) botoes.push({ type: 2, style: 5, label: botao2Texto.slice(0, 80), url: botao2Url });
  const components = botoes.length ? [{ type: 1, components: botoes }] : undefined;

  try {
    for (let i = 0; i < partesDescricao.length; i++) {
      const tituloParte = i === 0
        ? tituloLimpo
        : (tituloLimpo ? `${tituloLimpo.slice(0, 240)} — continuação ${i + 1}/${partesDescricao.length}` : `Continuação ${i + 1}/${partesDescricao.length}`);
      const embed = {
        title: tituloParte || undefined,
        description: partesDescricao[i] || undefined,
        color: corHex,
        image: i === 0 && imagem ? { url: String(imagem).trim() } : undefined,
        footer: i === 0 && rodapeLimpo ? { text: rodapeLimpo } : undefined,
      };
      await enviarEmbed(canalId, embed, i === 0 ? components : undefined);
    }
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ erro: e.message }) };
  }

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ok: true, mensagens: partesDescricao.length, caracteres: descricaoLimpa.length })
  };
};
