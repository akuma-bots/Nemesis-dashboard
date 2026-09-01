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
};

function comPadrao(config) {
  return {
    ...PADRAO,
    ...config,
    canais_cargo_automatico: (config && config.canais_cargo_automatico) || {},
    contadores: (config && config.contadores) || [],
  };
}

module.exports = { PADRAO, comPadrao };
