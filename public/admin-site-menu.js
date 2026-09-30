(function () {
  const itens = [
    {
      id: "formularios",
      nome: "Formulários",
      url: "/admin-formularios.html"
    },
    {
      id: "missoes",
      nome: "Missões",
      url: "/admin-missoes.html"
    },
    {
      id: "competitivo",
      nome: "Competitivo",
      url: "/admin-competitivo.html"
    },
    {
      id: "conteudo",
      nome: "Conteúdo do site",
      url: "/admin-site.html"
    },
    {
      id: "perfil",
      nome: "Meu Perfil",
      url: "/perfil.html"
    },
    {
      id: "agenda",
      nome: "Agenda",
      url: "/agenda.html"
    }
  ];

  const barra = document.querySelector(".barra-lateral");

  if (!barra) return;

  // Título da área administrativa
  const titulo = document.createElement("h3");
  titulo.textContent = "ADMINISTRAÇÃO DO SITE";
  titulo.style.marginTop = "34px";

  barra.appendChild(titulo);

  // Abre uma página dentro do painel
  function abrir(item, elemento) {
    // Remove o destaque dos outros itens
    document
      .querySelectorAll(".item-servidor")
      .forEach((el) => el.classList.remove("ativo"));

    // Destaca o item selecionado
    if (elemento) {
      elemento.classList.add("ativo");
    }

    // Cria o iframe
    const quadro = document.createElement("iframe");

    quadro.src = item.url;

    quadro.style.cssText = `
      width: 100%;
      border: 0;
      min-height: 80vh;
      display: block;
      background: transparent;
    `;

    // Ajusta o conteúdo do iframe
    function ajustar() {
      try {
        const doc = quadro.contentDocument;

        if (!doc || !doc.head) return;

        // Evita inserir o mesmo estilo várias vezes
        if (!doc.getElementById("estilo-embutido")) {
          const estilo = doc.createElement("style");

          estilo.id = "estilo-embutido";

          estilo.textContent = `
            .voltar,
            main > h1,
            main > .sub,
            main > .subtitulo {
              display: none !important;
            }

            main {
              padding: 8px 0 40px !important;
              max-width: none !important;
            }
          `;

          doc.head.appendChild(estilo);
        }

        // Ajusta a altura conforme o conteúdo
        const altura = doc.documentElement.scrollHeight;

        if (altura > 0) {
          quadro.style.height = altura + 20 + "px";
        }
      } catch (erro) {
        // Ignora páginas que não permitem acesso ao conteúdo do iframe
      }
    }

    // Quando a página terminar de carregar
    quadro.onload = ajustar;

    // Coloca o iframe no conteúdo principal
    const conteudo = document.getElementById("conteudo");

    if (conteudo) {
      conteudo.replaceChildren(quadro);
    }

    // Continua verificando a altura enquanto a página estiver aberta
    const relogio = setInterval(() => {
      if (!quadro.isConnected) {
        clearInterval(relogio);
        return;
      }

      ajustar();
    }, 700);
  }

  // Cria os itens da administração
  itens.forEach((item) => {
    const div = document.createElement("div");

    div.className = "item-servidor";
    div.id = "adm-" + item.id;

    const texto = document.createElement("div");

    texto.textContent = item.nome;

    div.appendChild(texto);

    div.onclick = () => {
      abrir(item, div);

      // Atualiza o endereço sem recarregar a página
      if (window.history && window.history.replaceState) {
        window.history.replaceState(
          null,
          "",
          "#" + item.id
        );
      }
    };

    barra.appendChild(div);
  });

  // Permite abrir diretamente por hash.
  // Exemplos:
  // dashboard.html#formularios
  // dashboard.html#missoes
  // dashboard.html#competitivo
  // dashboard.html#conteudo
  // dashboard.html#perfil
  // dashboard.html#agenda

  const alvo = itens.find(
    (item) => "#" + item.id === window.location.hash
  );

  if (alvo) {
    const elemento = document.getElementById("adm-" + alvo.id);

    if (elemento) {
      abrir(alvo, elemento);
    }
  }
})();