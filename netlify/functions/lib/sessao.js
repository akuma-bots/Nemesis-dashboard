const crypto = require("node:crypto");

const NOME_COOKIE = "shinku_session";
const NOME_COOKIE_OAUTH = "shinku_oauth_state";

function parseCookies(headerCookie) {
  const resultado = {};
  if (!headerCookie) return resultado;

  for (const par of String(headerCookie).split(";")) {
    const separador = par.indexOf("=");
    if (separador < 0) continue;

    const chave = par.slice(0, separador).trim();
    const valor = par.slice(separador + 1).trim();
    if (!chave) continue;

    try {
      resultado[chave] = decodeURIComponent(valor);
    } catch {
      // Cookie malformado é ignorado sem derrubar a função.
    }
  }
  return resultado;
}

function lerSessao(event) {
  const cookies = parseCookies(event.headers?.cookie || event.headers?.Cookie);
  const bruto = cookies[NOME_COOKIE];
  if (!bruto) return null;

  try {
    const dados = JSON.parse(Buffer.from(bruto, "base64").toString("utf-8"));
    if (typeof dados.access_token !== "string" || !dados.access_token) return null;

    const expiracao = Number(dados.expires_at);
    if (!Number.isFinite(expiracao) || expiracao <= Date.now()) return null;
    return dados;
  } catch {
    return null;
  }
}

function criarCookieSessao(accessToken, expiresInSegundos) {
  const duracao = Number(expiresInSegundos);
  if (typeof accessToken !== "string" || !accessToken || !Number.isFinite(duracao) || duracao <= 0) {
    throw new Error("Dados inválidos para criar a sessão OAuth.");
  }

  const dados = {
    access_token: accessToken,
    expires_at: Date.now() + duracao * 1000,
  };
  const valor = Buffer.from(JSON.stringify(dados)).toString("base64");
  const maxAge = Math.min(Math.floor(duracao), 60 * 60 * 24 * 7);
  return `${NOME_COOKIE}=${encodeURIComponent(valor)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
}

function criarEstadoOAuth() {
  return crypto.randomBytes(32).toString("hex");
}

function criarCookieEstadoOAuth(estado) {
  return `${NOME_COOKIE_OAUTH}=${encodeURIComponent(estado)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`;
}

function validarEstadoOAuth(event, estadoRecebido) {
  if (typeof estadoRecebido !== "string" || !estadoRecebido) return false;
  const cookies = parseCookies(event.headers?.cookie || event.headers?.Cookie);
  const estadoEsperado = cookies[NOME_COOKIE_OAUTH];
  if (typeof estadoEsperado !== "string") return false;

  const esperado = Buffer.from(estadoEsperado, "utf8");
  const recebido = Buffer.from(estadoRecebido, "utf8");
  if (esperado.length !== recebido.length) return false;

  return crypto.timingSafeEqual(esperado, recebido);
}

function cookieLimparEstadoOAuth() {
  return `${NOME_COOKIE_OAUTH}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

function cookieLogout() {
  return `${NOME_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

module.exports = {
  lerSessao,
  criarCookieSessao,
  cookieLogout,
  parseCookies,
  criarEstadoOAuth,
  criarCookieEstadoOAuth,
  validarEstadoOAuth,
  cookieLimparEstadoOAuth,
};
