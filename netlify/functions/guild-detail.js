const { lerSessao } = require("./lib/sessao");
const { usuarioGerenciaServidor, botEstaNoServidor, listarCanais, listarCargos } = require("./lib/discord");
const { carregarBlob } = require("./lib/upstash");
const { comPadrao } = require("./lib/config-padrao");

exports.handler = async (event) => {
  const sessao = lerSessao(event);
  if (!sessao) return { statusCode: 401, body: JSON.stringify({ erro: "não autenticado" }) };

  const guildId = event.queryStringParameters && event.queryStringParameters.guildId;
  if (!guildId) return { statusCode: 400, body: JSON.stringify({ erro: "guildId é obrigatório" }) };

  try {
    const gerencia = await usuarioGerenciaServidor(sessao.access_token, guildId);
    if (!gerencia) return { statusCode: 403, body: JSON.stringify({ erro: "Você não gerencia esse servidor." }) };

    const presente = await botEstaNoServidor(guildId);
    if (!presente) {
      return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bot_presente: false }) };
    }

    const [
      canais, cargos, configs,
      parceriasTudo, perfisTudo, patentesTudo, guerrasTudo,
      denunciasTudo, robloxGrupoTudo, sorteiosTudo,
    ] = await Promise.all([
      listarCanais(guildId),
      listarCargos(guildId),
      carregarBlob("guild_configs.json", {}),
      carregarBlob("parcerias.json", {}),
      carregarBlob("perfis.json", {}),
      carregarBlob("patentes_config.json", {}),
      carregarBlob("guerras.json", {}),
      carregarBlob("denuncias.json", {}),
      carregarBlob("roblox_grupo_config.json", {}),
      carregarBlob("sorteios.json", {}),
    ]);

    const config = comPadrao(configs[guildId]);
    const perfisGuild = perfisTudo[guildId] || {};
    const rankingVitorias = Object.entries(perfisGuild)
      .map(([userId, p]) => ({ userId, vitorias: p.vitorias || 0, xp: p.xp || 0, patente: p.patente || null }))
      .sort((a, b) => b.vitorias - a.vitorias)
      .slice(0, 10);

    const guerrasGuild = (guerrasTudo[guildId] && guerrasTudo[guildId].guerras) || [];
    const guerrasRecentes = [...guerrasGuild].sort((a, b) => b.timestamp - a.timestamp).slice(0, 10);

    const denunciasGuild = denunciasTudo[guildId] || [];
    const denunciasPendentes = denunciasGuild.filter((d) => d.status === "pendente").sort((a, b) => b.timestamp - a.timestamp);

    const sorteiosGuild = Object.values(sorteiosTudo).filter((s) => s.guild_id === Number(guildId) && !s.encerrado);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bot_presente: true,
        canais: canais
          .filter((c) => c.type === 0 || c.type === 2 || c.type === 4)
          .map((c) => ({ id: c.id, nome: c.name, tipo: c.type })),
        cargos: cargos
          .filter((r) => r.name !== "@everyone")
          .map((r) => ({ id: r.id, nome: r.name, posicao: r.position })),
        config,
        parcerias: parceriasTudo[guildId] || [],
        ranking: rankingVitorias,
        patentes: (patentesTudo[guildId] || []).sort((a, b) => a.xp_minimo - b.xp_minimo),
        guerras: guerrasRecentes,
        temporadaAtual: (guerrasTudo[guildId] && guerrasTudo[guildId].temporada_atual) || 1,
        denuncias: denunciasPendentes,
        robloxGrupo: robloxGrupoTudo[guildId] || { grupo_id: null, mapeamentos: {} },
        sorteios: sorteiosGuild,
      }),
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ erro: e.message }) };
  }
};
