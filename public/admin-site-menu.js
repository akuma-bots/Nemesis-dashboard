(function () {
  const itens = [
    { id: "formularios", nome: "Formulários", url: "/admin-formularios.html" },
    { id: "missoes", nome: "Missões", url: "/admin-missoes.html" },
    { id: "competitivo", nome: "Competitivo", url: "/admin-competitivo.html" },
    { id: "conteudo", nome: "Conteúdo do site", url: "/admin-site.html" },
  ];

  const barra = document.querySelector(".barra-lateral");
  if (!barra) return;

  const titulo = document.createElement("h3");
  titulo.textContent = "ADMINISTRAÇÃO DO SITE";
  titulo.style.marginTop = "34px";
  barra.appendChild(titulo);

  function abrir(item, elemento) {
    document.querySelectorAll(".item-servidor").forEach((el) => el.classList.remove("ativo"));
    elemento.classList.add("ativo");

    const quadro = document.createElement("iframe");
    quadro.src = item.url;
    quadro.style.cssText = "width:100%;border:0;min-height:80vh;display:block;background:transparent";

    function ajustar() {
      try {
        const doc = quadro.contentDocument;
        if (!doc || !doc.head) return;
        if (!doc.getElementById("estilo-embutido")) {
          const estilo = doc.createElement("style");
          estilo.id = "estilo-embutido";
          estilo.textContent = ".voltar,main>h1,main>.sub,main>.subtitulo{display:none!important}main{padding:8px 0 40px!important;max-width:none!important}";
          doc.head.appendChild(estilo);
        }
        quadro.style.height = doc.documentElement.scrollHeight + 20 + "px";
      } catch (e) { /* página de outro domínio: ignora */ }
    }

    quadro.onload = ajustar;
    document.getElementById("conteudo").replaceChildren(quadro);

    const relogio = setInterval(() => {
      if (!quadro.isConnected) return clearInterval(relogio);
      ajustar();
    }, 700);
  }

  itens.forEach((item) => {
    const div = document.createElement("div");
    div.className = "item-servidor";
    div.id = "adm-" + item.id;
    const texto = document.createElement("div");
    texto.textContent = item.nome;
    div.appendChild(texto);
    div.onclick = () => abrir(item, div);
    barra.appendChild(div);
  });

  // Permite abrir direto por link, ex: dashboard.html#formularios
  const alvo = itens.find((i) => "#" + i.id === window.location.hash);
  if (alvo) abrir(alvo, document.getElementById("adm-" + alvo.id));
})();