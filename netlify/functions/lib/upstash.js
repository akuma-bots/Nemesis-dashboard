async function comandoRedis(...args) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    throw new Error("UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN não configurados no Netlify.");
  }

  let resposta;
  try {
    resposta = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(args),
      signal: AbortSignal.timeout(12000),
    });
  } catch (erro) {
    if (erro && (erro.name === "TimeoutError" || erro.name === "AbortError")) {
      throw new Error("Tempo limite excedido ao acessar o Upstash.");
    }
    throw new Error(`Falha de conexão com o Upstash: ${erro?.message || erro}`);
  }

  let dados;
  try {
    dados = await resposta.json();
  } catch {
    throw new Error(`O Upstash retornou uma resposta inválida (HTTP ${resposta.status}).`);
  }

  if (!resposta.ok) {
    throw new Error(`Erro do Upstash (HTTP ${resposta.status}): ${JSON.stringify(dados)}`);
  }
  if (!dados || typeof dados !== "object" || Array.isArray(dados)) {
    throw new Error("O Upstash retornou uma estrutura inesperada.");
  }
  if (dados.error) {
    throw new Error(`Erro retornado pelo Redis: ${dados.error}`);
  }

  return dados.result;
}

async function carregarBlob(nomeArquivo, padrao) {
  const valor = await comandoRedis("GET", nomeArquivo);
  if (valor === null || valor === undefined) return padrao;

  try {
    return JSON.parse(valor);
  } catch (erro) {
    throw new Error(`Os dados armazenados em ${nomeArquivo} são inválidos.`);
  }
}

async function salvarBlob(nomeArquivo, dados) {
  await comandoRedis("SET", nomeArquivo, JSON.stringify(dados));
}

async function verificarConexao() {
  const resultado = await comandoRedis("PING");
  if (String(resultado).toUpperCase() !== "PONG") {
    throw new Error("O Upstash não confirmou a conexão.");
  }
  return true;
}

module.exports = { carregarBlob, salvarBlob, verificarConexao };
