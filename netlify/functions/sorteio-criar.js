const crypto = require("crypto");
const { exigirGerenciaServidor } = require("./lib/autorizar");
const { carregarBlob, salvarBlob } = require("./lib/upstash");
const { enviarEmbed } = require("./lib/discord");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  const { guildId, canalId, premio, duracaoMinutos, vencedores } = JSON.parse(event.body || "{}");
  const { erro } = await exigirGerenciaServidor(event, guildId);
  if (erro) return erro;

  if (!canalId || !premio || !duracaoMinutos) {
    return { statusCode: 400, body: JSON.stringify({ erro: "canalId, premio e duracaoMinutos são obrigatórios" }) };
  }

  const fim = Math.floor(Date.now() / 1000) + Number(duracaoMinutos) * 60;
  const qtdVencedores = Number(vencedores) || 1;

  const embed = {
    title: "🎉 SORTEIO!",
    description: `**Prêmio:** ${premio}\n**Vencedores:** ${qtdVencedores}\n**Termina:** <t:${fim}:R>\n\nClique no botão abaixo pra participar!`,
    color: 0xfee75c,
  };
  const components = [{ type: 1, components: [{ type: 2, style: 1, label: "🎉 Participar", custom_id: "sorteio_participar_btn" }] }];

  const mensagem = await enviarEmbed(canalId, embed, components);

  const sorteioId = crypto.randomUUID().slice(0, 8);
  const todos = await carregarBlob("sorteios.json", {});
  todos[sorteioId] = {
    id: sorteioId,
    guild_id: Number(guildId),
    canal_id: canalId,
    mensagem_id: mensagem.id,
    premio,
    fim,
    vencedores: qtdVencedores,
    participantes: [],
    encerrado: false,
  };
  await salvarBlob("sorteios.json", todos);

  return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ok: true, sorteioId }) };
};
