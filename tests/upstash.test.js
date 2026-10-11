const test = require("node:test");
const assert = require("node:assert/strict");
const {
  carregarBlob,
  salvarBlob,
  verificarConexao,
} = require("../netlify/functions/lib/upstash");

const urlOriginal = process.env.UPSTASH_REDIS_REST_URL;
const tokenOriginal = process.env.UPSTASH_REDIS_REST_TOKEN;
const fetchOriginal = global.fetch;

function configurar() {
  process.env.UPSTASH_REDIS_REST_URL = "https://redis.example.test";
  process.env.UPSTASH_REDIS_REST_TOKEN = "token-de-teste";
}

test("recusa conexão quando as credenciais do Upstash estão ausentes", async () => {
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  await assert.rejects(verificarConexao(), /não configurados no Netlify/);
});

test("confirma a conexão somente quando Redis responde PONG", async () => {
  configurar();
  global.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({ result: "PONG" }),
  });
  assert.equal(await verificarConexao(), true);

  global.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({ result: "NOPE" }),
  });
  await assert.rejects(verificarConexao(), /não confirmou a conexão/);
});

test("dados JSON corrompidos no Redis geram erro explícito", async () => {
  configurar();
  global.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({ result: "{json-invalido" }),
  });
  await assert.rejects(carregarBlob("teste.json", null), /dados armazenados.*inválidos/);
});

test("erros HTTP do Upstash não são tratados como sucesso", async () => {
  configurar();
  global.fetch = async () => ({
    ok: false,
    status: 503,
    json: async () => ({ error: "indisponível" }),
  });
  await assert.rejects(salvarBlob("teste.json", { ok: true }), /HTTP 503/);
});

test.after(() => {
  global.fetch = fetchOriginal;
  if (urlOriginal === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
  else process.env.UPSTASH_REDIS_REST_URL = urlOriginal;
  if (tokenOriginal === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
  else process.env.UPSTASH_REDIS_REST_TOKEN = tokenOriginal;
});
