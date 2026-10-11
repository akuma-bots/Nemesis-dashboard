(() => {
  const elemento = document.getElementById("status-sincronizacao");
  if (!elemento) return;

  async function verificar() {
    try {
      const resposta = await fetch("/api/bot-sync-status", {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Accept": "application/json" }
      });

      if (resposta.status === 401 || resposta.status === 403) {
        elemento.hidden = true;
        return;
      }

      const dados = await resposta.json();
      if (!resposta.ok || !dados.ok) {
        elemento.textContent = "Sincronização indisponível";
        elemento.style.color = "#ff5964";
        return;
      }

      if (dados.botOnline && dados.redisConectado) {
        elemento.textContent = "Bot ↔ Site conectado";
        elemento.style.color = "#5bd49a";
        elemento.title = dados.ultimaAtualizacao
          ? "Último sinal: " + new Date(dados.ultimaAtualizacao).toLocaleString("pt-BR")
          : "Conexão compartilhada ativa";
      } else {
        elemento.textContent = "Bot ↔ Site aguardando conexão";
        elemento.style.color = "#f0b44d";
        elemento.title = dados.mensagem || "O bot ainda não enviou um sinal recente.";
      }
    } catch (erro) {
      elemento.textContent = "Falha ao verificar sincronização";
      elemento.style.color = "#ff5964";
    }
  }

  verificar();
  window.setInterval(verificar, 60000);
})();
