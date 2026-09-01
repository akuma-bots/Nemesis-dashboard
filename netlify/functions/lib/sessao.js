const NOME_COOKIE = "shinku_session";

function parseCookies(headerCookie) {
  const resultado = {};
  if (!headerCookie) return resultado;
  headerCookie.split(";").forEach((par) => {
    const [chave, ...resto] = par.trim().split("=");
    resultado[chave] = decodeURIComponent(resto.join("="));
  });
  return resultado;
}

function lerSessao(event) {
  const cookies = parseCookies(event.headers.cookie || event.headers.Cookie);
  const bruto = cookies[NOME_COOKIE];
  if (!bruto) return null;
  try {
    const dados = JSON.parse(Buffer.from(bruto, "base64").toString("utf-8"));
    if (!dados.access_token || !dados.expires_at) return null;
    if (Date.now() > dados.expires_at) return null;
    return dados;
  } catch {
    return null;
  }
}

function criarCookieSessao(accessToken, expiresInSegundos) {
  const dados = { access_token: accessToken, expires_at: Date.now() + expiresInSegundos * 1000 };
  const valor = Buffer.from(JSON.stringify(dados)).toString("base64");
  const maxAge = Math.min(expiresInSegundos, 60 * 60 * 24 * 7);
  return `${NOME_COOKIE}=${encodeURIComponent(valor)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
}

function cookieLogout() {
  return `${NOME_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

module.exports = { lerSessao, criarCookieSessao, cookieLogout };
