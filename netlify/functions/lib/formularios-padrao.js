const GUILD_ID_NEMESIS = "1543381737961160910";

const PADRAO = {
  [GUILD_ID_NEMESIS]: [],
};

function comPadrao(conteudo) {
  const dados =
    conteudo &&
    typeof conteudo === "object" &&
    !Array.isArray(conteudo)
      ? conteudo
      : {};

  if (
    Array.isArray(dados.formularios) &&
    !Array.isArray(dados[GUILD_ID_NEMESIS])
  ) {
    dados[GUILD_ID_NEMESIS] =
      dados.formularios.map((formulario) => ({
        ...formulario,
        guild_id:
          formulario.guild_id ||
          GUILD_ID_NEMESIS,
      }));

    delete dados.formularios;
  }

  if (
    !Array.isArray(dados[GUILD_ID_NEMESIS])
  ) {
    dados[GUILD_ID_NEMESIS] = [];
  }

  return dados;
}

function obterGuild(conteudo) {
  const dados = comPadrao(conteudo);

  return dados[GUILD_ID_NEMESIS];
}

function normalizarFormulario(formulario) {
  const agora = Date.now();

  const original =
    formulario &&
    typeof formulario === "object"
      ? formulario
      : {};

  const id =
    String(
      original.id ||
        `form-${agora}`
    );

  return {
    id,

    guild_id:
      String(
        original.guild_id ||
          GUILD_ID_NEMESIS
      ),

    nome:
      String(
        original.nome ||
          original.titulo ||
          ""
      ).slice(0, 120),

    titulo_painel:
      String(
        original.titulo_painel ||
          original.titulo ||
          original.nome ||
          ""
      ).slice(0, 120),

    descricao_painel:
      String(
        original.descricao_painel ||
          original.descricao ||
          ""
      ).slice(0, 500),

    banner_url:
      String(
        original.banner_url ||
          ""
      ).slice(0, 1000),

    paginas:
      Array.isArray(original.paginas)
        ? original.paginas
        : [],

    cargos_notificar:
      Array.isArray(
        original.cargos_notificar
      )
        ? original.cargos_notificar.map(String)
        : Array.isArray(
            original.cargosNotificar
          )
          ? original.cargosNotificar.map(String)
          : [],

    canal_notificacao_id:
      original.canal_notificacao_id ||
      original.canalNotificacaoId ||
      null,

    ativo:
      original.ativo !== false,

    criado_por:
      original.criado_por ||
      original.criadoPor ||
      null,

    timestamp:
      original.timestamp ||
      agora,

    criado_em:
      original.criado_em ||
      agora,

    atualizado_em:
      agora,
  };
}

module.exports = {
  GUILD_ID_NEMESIS,
  PADRAO,
  comPadrao,
  obterGuild,
  normalizarFormulario,
};