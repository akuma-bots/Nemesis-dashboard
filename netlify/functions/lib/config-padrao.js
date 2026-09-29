const PADRAO = {
  support_role_id: null,
  log_channel_id: null,
  ticket_category_id: null,
  canais_cargo_automatico: {},
  canal_eventos_id: null,
  canal_parcerias_id: null,
  contadores: [],
  canal_denuncias_id: null,
  categoria_modmail_id: null,
  ticket_painel_titulo: null,
  ticket_painel_descricao: null,
  ticket_painel_banner_url: null,
  cargos_moderacao_total: [],
  cargos_moderacao_basico: [],
};

function comPadrao(config) {
  return {
    ...PADRAO,
    ...config,
    canais_cargo_automatico: (config && config.canais_cargo_automatico) || {},
    contadores: (config && config.contadores) || [],
    cargos_moderacao_total: (config && config.cargos_moderacao_total) || [],
    cargos_moderacao_basico: (config && config.cargos_moderacao_basico) || [],
  };
}

module.exports = { PADRAO, comPadrao };
