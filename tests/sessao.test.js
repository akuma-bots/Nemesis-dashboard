const test = require("node:test");
const assert = require("node:assert/strict");
const {
  parseCookies,
  criarEstadoOAuth,
  criarCookieEstadoOAuth,
  validarEstadoOAuth,
  lerSessao,
} = require("../netlify/functions/lib/sessao");

test("gera estado OAuth imprevisível e valida somente o cookie correspondente", () => {
  const estado = criarEstadoOAuth();
  assert.match(estado, /^[a-f0-9]{64}$/);

  const cookie = criarCookieEstadoOAuth(estado).split(";")[0];
  const event = { headers: { cookie } };

  assert.equal(validarEstadoOAuth(event, estado), true);
  assert.equal(validarEstadoOAuth(event, "a".repeat(64)), false);
  assert.equal(validarEstadoOAuth(event, undefined), false);
});

test("cookies malformados não derrubam a leitura da sessão", () => {
  assert.deepEqual(parseCookies("broken=%E0%A4%A; good=value"), { good: "value" });
  assert.equal(lerSessao({ headers: { cookie: "shinku_session=%E0%A4%A" } }), null);
});

test("recusa sessões sem token ou expiradas", () => {
  const expirado = Buffer.from(JSON.stringify({
    access_token: "token",
    expires_at: Date.now() - 1000,
  })).toString("base64");
  const semToken = Buffer.from(JSON.stringify({
    expires_at: Date.now() + 60000,
  })).toString("base64");

  assert.equal(lerSessao({ headers: { cookie: `shinku_session=${encodeURIComponent(expirado)}` } }), null);
  assert.equal(lerSessao({ headers: { cookie: `shinku_session=${encodeURIComponent(semToken)}` } }), null);
});
