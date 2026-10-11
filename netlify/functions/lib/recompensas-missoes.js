const LIMITE_CREDITOS_REGISTRADOS = 5000;

function aplicarRecompensaMissao(perfilAtual, submissaoId, recompensa) {
  if (!perfilAtual || typeof perfilAtual !== "object" || Array.isArray(perfilAtual)) {
    throw new TypeError("Perfil competitivo inválido.");
  }

  const id = String(submissaoId ?? "").trim();
  if (!id) {
    throw new TypeError("O ID da submissão é obrigatório.");
  }

  if (!Number.isSafeInteger(recompensa) || recompensa < 0) {
    throw new TypeError("A recompensa deve ser um inteiro seguro não negativo.");
  }

  const pontosAtuais = Number(perfilAtual.pontos ?? 0);
  if (!Number.isSafeInteger(pontosAtuais) || pontosAtuais < 0) {
    throw new TypeError("A pontuação atual do perfil é inválida.");
  }

  const anteriores = Array.isArray(perfilAtual.recompensas_missoes)
    ? perfilAtual.recompensas_missoes.map(String).filter(Boolean)
    : [];
  const creditos = [...new Set(anteriores)];

  if (creditos.includes(id)) {
    perfilAtual.recompensas_missoes = creditos.slice(-LIMITE_CREDITOS_REGISTRADOS);
    return { perfil: perfilAtual, aplicada: false };
  }

  const novoTotal = pontosAtuais + recompensa;
  if (!Number.isSafeInteger(novoTotal)) {
    throw new RangeError("A pontuação resultante ultrapassa o limite numérico seguro.");
  }

  perfilAtual.pontos = novoTotal;
  creditos.push(id);
  perfilAtual.recompensas_missoes = creditos.slice(-LIMITE_CREDITOS_REGISTRADOS);

  return { perfil: perfilAtual, aplicada: true };
}

module.exports = { aplicarRecompensaMissao, LIMITE_CREDITOS_REGISTRADOS };
