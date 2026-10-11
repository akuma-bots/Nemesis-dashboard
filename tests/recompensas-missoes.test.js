const test = require("node:test");
const assert = require("node:assert/strict");
const { aplicarRecompensaMissao, LIMITE_CREDITOS_REGISTRADOS } = require("../netlify/functions/lib/recompensas-missoes");

test("aplica uma recompensa uma única vez por submissão", () => {
  const perfil = { pontos: 20, recompensas_missoes: [] };
  const primeira = aplicarRecompensaMissao(perfil, "sub-1", 15);
  assert.equal(primeira.aplicada, true);
  assert.equal(perfil.pontos, 35);

  const repetida = aplicarRecompensaMissao(perfil, "sub-1", 15);
  assert.equal(repetida.aplicada, false);
  assert.equal(perfil.pontos, 35);
});

test("normaliza IDs repetidos e mantém o limite do registro", () => {
  const anteriores = Array.from({ length: LIMITE_CREDITOS_REGISTRADOS + 2 }, (_, i) => `sub-${i}`);
  const perfil = { pontos: 0, recompensas_missoes: anteriores };
  const resultado = aplicarRecompensaMissao(perfil, "nova", 1);
  assert.equal(resultado.aplicada, true);
  assert.equal(perfil.recompensas_missoes.length, LIMITE_CREDITOS_REGISTRADOS);
  assert.equal(perfil.recompensas_missoes.at(-1), "nova");
});

test("rejeita recompensas fracionárias, negativas e pontuação corrompida", () => {
  assert.throws(() => aplicarRecompensaMissao({ pontos: 0 }, "sub", 1.5), /inteiro seguro/);
  assert.throws(() => aplicarRecompensaMissao({ pontos: 0 }, "sub", -1), /inteiro seguro/);
  assert.throws(() => aplicarRecompensaMissao({ pontos: "NaN" }, "sub", 1), /pontuação atual.*inválida/);
});

test("rejeita total que ultrapassa o limite numérico seguro", () => {
  assert.throws(() => aplicarRecompensaMissao({ pontos: Number.MAX_SAFE_INTEGER }, "sub", 1), /ultrapassa o limite/);
});
