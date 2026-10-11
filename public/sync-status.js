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
        const motivos = {
          HEARTBEAT_AUSENTE: "heartbeat ausente",
          TIMESTAMP_INVALIDO: "data do heartbeat inválida",
          GUILD_ID_DIFERENTE: "ID do servidor divergente",
          BOT_NAO_PRONTO_OU_SERVIDOR_NAO_ENCONTRADO: "bot não encontrou o servidor",
          HEARTBEAT_EXPIRADO: "heartbeat expirado"
        };
        const motivo = motivos[dados.diagnostico] || "aguardando heartbeat";
        elemento.textContent = "Bot ↔ Site: " + motivo;
        elemento.style.color = "#f0b44d";
        elemento.title = [
          dados.mensagem || "O bot ainda não enviou um sinal recente.",
          "Diagnóstico: " + (dados.diagnostico || "indisponível"),
          "Redis: " + (dados.redisConectado ? "conectado" : "desconectado"),
          "Heartbeat encontrado: " + (dados.heartbeatEncontrado ? "sim" : "não"),
          "Idade (segundos): " + (dados.idadeSegundos ?? "desconhecida"),
          "Guild ID confere: " + (dados.guildIdConfere ? "sim" : "não")
        ].join("\\n");
      }
    } catch (erro) {
      elemento.textContent = "Falha ao verificar sincronização";
      elemento.style.color = "#ff5964";
    }
  }

  verificar();
  window.setInterval(verificar, 60000);
})();
