const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const ignorar = new Set([".git", "node_modules", ".netlify", "dist", "build"]);
const arquivos = [];

function percorrer(diretorio) {
  for (const entrada of fs.readdirSync(diretorio, { withFileTypes: true })) {
    if (entrada.isDirectory() && ignorar.has(entrada.name)) continue;
    const caminho = path.join(diretorio, entrada.name);
    if (entrada.isDirectory()) {
      percorrer(caminho);
    } else if (entrada.isFile() && (/\.js$/i.test(entrada.name) || /\.json$/i.test(entrada.name))) {
      arquivos.push(caminho);
    }
  }
}

percorrer(root);
const erros = [];

for (const arquivo of arquivos) {
  if (/\.json$/i.test(arquivo)) {
    try {
      JSON.parse(fs.readFileSync(arquivo, "utf8"));
    } catch (erro) {
      erros.push(`JSON inválido: ${path.relative(root, arquivo)} — ${erro.message}`);
    }
    continue;
  }

  const resultado = spawnSync(process.execPath, ["--check", arquivo], {
    encoding: "utf8",
  });
  if (resultado.status !== 0) {
    erros.push(
      `JavaScript inválido: ${path.relative(root, arquivo)}\n${resultado.stderr || resultado.stdout}`
    );
  }
}

if (erros.length) {
  console.error(erros.join("\n\n"));
  process.exitCode = 1;
} else {
  console.log(`Validação concluída: ${arquivos.length} arquivos JavaScript/JSON verificados.`);
}
