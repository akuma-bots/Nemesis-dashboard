const { exigirGerenciaServidor } = require("./lib/autorizar");
const { carregarBlob, salvarBlob } = require("./lib/upstash");
const { comPadrao } = require("./lib/config-padrao");
const { enviarEmbed } = require("./lib/discord");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  let corpo;
  try { corpo = JSON.parse(event.body || "{}"); }
  catch { return { statusCode: 400, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ erro: "JSON inválido." }) }; }
  const { guildId, nome, convite, descricao, banner } = corpo;
  const { erro } = await exigirGerenciaServidor(event, guildId);
  if (erro) return erro;

  const nomeLimpo = typeof nome === "string" ? nome.trim().slice(0, 100) : "";
  const conviteLimpo = typeof convite === "string" ? convite.trim().slice(0, 500) : "";
  const descricaoLimpa = typeof descricao === "string" ? descricao.trim().slice(0, 3500) : "";
  if (!nomeLimpo || !conviteLimpo || !descricaoLimpa) {
    return { statusCode: 400, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ erro: "Nome, convite e descrição são obrigatórios." }) };
  }
  if (!/^https?:\/\//i.test(conviteLimpo)) {
    return { statusCode: 400, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ erro: "O convite precisa ser um link HTTP ou HTTPS." }) };
  }
  if (banner && !/^https?:\/\//i.test(String(banner))) {
    return { statusCode: 400, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ erro: "O banner precisa ser uma URL HTTP ou HTTPS." }) };
  }

  const configs = await carregarBlob("guild_configs.json", {});
  const config = comPadrao(configs[guildId]);
  if (!config.canal_parcerias_id) {
    return { statusCode: 400, body: JSON.stringify({ erro: "Configure o canal de parcerias na aba Geral primeiro." }) };
  }

  const embed = {
    title: `🤝 Nova parceria: ${nomeLimpo}`,
    description: descricaoLimpa,
    color: 0x57f287,
    fields: [{ name: "Convite", value: conviteLimpo.slice(0, 1024) }],
    image: banner ? { url: String(banner).trim() } : undefined,
  };
  await enviarEmbed(config.canal_parcerias_id, embed);

  const todas = await carregarBlob("parcerias.json", {});
  const lista = todas[guildId] || [];
  lista.push({ nome: nomeLimpo, convite: conviteLimpo, descricao: descricaoLimpa, banner: banner ? String(banner).trim() : null });
  todas[guildId] = lista;
  await salvarBlob("parcerias.json", todas);

  return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ok: true, parcerias: lista }) };
};
