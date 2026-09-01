const { exigirGerenciaServidor } = require("./lib/autorizar");
const { carregarBlob, salvarBlob } = require("./lib/upstash");
const { comPadrao } = require("./lib/config-padrao");
const { enviarEmbed } = require("./lib/discord");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  const { guildId, nome, convite, descricao, banner } = JSON.parse(event.body || "{}");
  const { erro } = await exigirGerenciaServidor(event, guildId);
  if (erro) return erro;

  if (!nome || !convite || !descricao) {
    return { statusCode: 400, body: JSON.stringify({ erro: "nome, convite e descricao são obrigatórios" }) };
  }

  const configs = await carregarBlob("guild_configs.json", {});
  const config = comPadrao(configs[guildId]);
  if (!config.canal_parcerias_id) {
    return { statusCode: 400, body: JSON.stringify({ erro: "Configure o canal de parcerias na aba Geral primeiro." }) };
  }

  const embed = {
    title: `🤝 Nova parceria: ${nome}`,
    description: descricao,
    color: 0x57f287,
    fields: [{ name: "Convite", value: convite }],
    image: banner ? { url: banner } : undefined,
  };
  await enviarEmbed(config.canal_parcerias_id, embed);

  const todas = await carregarBlob("parcerias.json", {});
  const lista = todas[guildId] || [];
  lista.push({ nome, convite, descricao, banner: banner || null });
  todas[guildId] = lista;
  await salvarBlob("parcerias.json", todas);

  return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ok: true, parcerias: lista }) };
};
