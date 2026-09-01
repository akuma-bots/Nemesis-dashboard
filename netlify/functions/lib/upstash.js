async function comandoRedis(...args) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error("UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN não configurados no Netlify.");

  const resposta = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  const dados = await resposta.json();
  if (!resposta.ok) throw new Error(`Erro do Upstash (${resposta.status}): ${JSON.stringify(dados)}`);
  return dados.result;
}

async function carregarBlob(nomeArquivo, padrao) {
  const valor = await comandoRedis("GET", nomeArquivo);
  if (valor === null || valor === undefined) return padrao;
  return JSON.parse(valor);
}

async function salvarBlob(nomeArquivo, dados) {
  await comandoRedis("SET", nomeArquivo, JSON.stringify(dados));
}

module.exports = { carregarBlob, salvarBlob };
