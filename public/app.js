let servidorAtual = null;

async function api(caminho, opcoes = {}) {
  const resposta = await fetch(caminho, { ...opcoes, headers: { "Content-Type": "application/json", ...(opcoes.headers || {}) } });
  if (resposta.status === 401) { window.location.href = "/"; throw new Error("não autenticado"); }
  const dados = await resposta.json();
  if (!resposta.ok) throw new Error(dados.erro || "erro desconhecido");
  return dados;
}

async function iniciar() {
  try {
    const { usuario, servidores } = await api("/api/me");
    document.getElementById("nome-usuario").textContent = usuario.nome;
    renderizarListaServidores(servidores);
  } catch (e) {
    console.error(e);
    document.getElementById("lista-servidores").innerHTML = `<p style="color:var(--signal); font-size:0.82rem;">Erro ao carregar: ${e.message}</p>`;
  }
}

function renderizarListaServidores(servidores) {
  const container = document.getElementById("lista-servidores");
  if (!servidores.length) { container.innerHTML = "<p style='color:var(--steel);font-size:0.85rem'>Nenhum servidor onde você é admin.</p>"; return; }
  container.innerHTML = "";
  servidores.forEach((s) => {
    const div = document.createElement("div");
    div.className = "item-servidor";
    div.id = `servidor-${s.id}`;
    div.innerHTML = `${s.icone ? `<img src="${s.icone}">` : `<div class="sem-icone"></div>`}<div><div>${s.nome}</div>${!s.bot_presente ? `<div class="tag-ausente">bot não está aqui</div>` : ""}</div>`;
    div.onclick = () => selecionarServidor(s.id, s.nome, s.bot_presente);
    container.appendChild(div);
  });
}

async function selecionarServidor(guildId, nome, botPresente) {
  document.querySelectorAll(".item-servidor").forEach((el) => el.classList.remove("ativo"));
  document.getElementById(`servidor-${guildId}`).classList.add("ativo");
  servidorAtual = guildId;

  const conteudo = document.getElementById("conteudo");
  conteudo.innerHTML = "<p style='color:var(--steel)'>Carregando...</p>";

  if (!botPresente) {
    conteudo.innerHTML = `<div class="card-bot-ausente"><h3>O bot não está em "${nome}"</h3><p>Convide o bot pro servidor primeiro, depois volte aqui.</p></div>`;
    return;
  }

  try {
    const dados = await api(`/api/guild-detail?guildId=${guildId}`);
    renderizarPainel(dados);
  } catch (e) {
    conteudo.innerHTML = `<p class="aviso erro">Erro ao carregar: ${e.message}</p>`;
  }
}

function opcoesCanais(canais, tipos, valorAtual) {
  return `<option value="">— nenhum —</option>` + canais.filter((c) => tipos.includes(c.tipo)).map((c) => `<option value="${c.id}" ${String(valorAtual) === c.id ? "selected" : ""}>${c.nome}</option>`).join("");
}
function opcoesCargos(cargos, valorAtual) {
  return `<option value="">— nenhum —</option>` + cargos.map((c) => `<option value="${c.id}" ${String(valorAtual) === c.id ? "selected" : ""}>${c.nome}</option>`).join("");
}

const ABAS = ["geral", "autocargo", "contadores", "guerras", "patentes", "denuncias", "parcerias", "embeds", "roblox", "sorteios", "backup"];
const NOMES_ABAS = { geral: "Geral", autocargo: "Cargo Automático", contadores: "Contadores", guerras: "Guerras", patentes: "Patentes & Ranking", denuncias: "Denúncias", parcerias: "Parcerias", embeds: "Embeds", roblox: "Roblox", sorteios: "Sorteios", backup: "Backup" };

function renderizarPainel(d) {
  const conteudo = document.getElementById("conteudo");
  conteudo.innerHTML = `
    <div class="abas">${ABAS.map((a, i) => `<div class="aba ${i === 0 ? "ativa" : ""}" data-aba="${a}">${NOMES_ABAS[a]}</div>`).join("")}</div>
    ${ABAS.map((a, i) => `<div class="painel-aba ${i === 0 ? "ativa" : ""}" id="aba-${a}"></div>`).join("")}
  `;
  document.querySelectorAll(".aba").forEach((aba) => {
    aba.onclick = () => {
      document.querySelectorAll(".aba").forEach((a) => a.classList.remove("ativa"));
      document.querySelectorAll(".painel-aba").forEach((p) => p.classList.remove("ativa"));
      aba.classList.add("ativa");
      document.getElementById(`aba-${aba.dataset.aba}`).classList.add("ativa");
    };
  });

  renderizarGeral(d);
  renderizarAutocargo(d);
  renderizarContadores(d);
  renderizarGuerras(d);
  renderizarPatentes(d);
  renderizarDenuncias(d);
  renderizarParcerias(d);
  renderizarEmbeds(d);
  renderizarRoblox(d);
  renderizarSorteios(d);
  renderizarBackup(d);
}

function mostrarAviso(idPainel, texto, tipo) {
  let el = document.querySelector(`#${idPainel} .aviso`);
  if (!el) { el = document.createElement("p"); el.className = "aviso"; document.getElementById(idPainel).appendChild(el); }
  el.textContent = texto;
  el.className = `aviso ${tipo}`;
}

// ---------------- Geral ----------------
function renderizarGeral(d) {
  const { canais, cargos, config } = d;
  const el = document.getElementById("aba-geral");
  el.innerHTML = `
    <div class="campo"><label>Cargo de suporte</label><select id="g-support-role">${opcoesCargos(cargos, config.support_role_id)}</select></div>
    <div class="campo"><label>Canal de logs</label><select id="g-log-channel">${opcoesCanais(canais, [0], config.log_channel_id)}</select></div>
    <div class="campo"><label>Categoria de tickets</label><select id="g-ticket-category">${opcoesCanais(canais, [4], config.ticket_category_id)}</select></div>
    <div class="campo"><label>Canal de eventos/guerras agendadas</label><select id="g-canal-eventos">${opcoesCanais(canais, [0], config.canal_eventos_id)}</select></div>
    <div class="campo"><label>Canal de parcerias</label><select id="g-canal-parcerias">${opcoesCanais(canais, [0], config.canal_parcerias_id)}</select></div>
    <div class="campo"><label>Canal de denúncias</label><select id="g-canal-denuncias">${opcoesCanais(canais, [0], config.canal_denuncias_id)}</select></div>
    <div class="campo"><label>Categoria de Mod Mail (conversas de DM)</label><select id="g-categoria-modmail">${opcoesCanais(canais, [4], config.categoria_modmail_id)}</select></div>
    <button class="botao botao-primario" id="g-salvar">Salvar</button>
  `;
  document.getElementById("g-salvar").onclick = async () => {
    try {
      await api("/api/config-save", { method: "POST", body: JSON.stringify({
        guildId: servidorAtual,
        support_role_id: document.getElementById("g-support-role").value,
        log_channel_id: document.getElementById("g-log-channel").value,
        ticket_category_id: document.getElementById("g-ticket-category").value,
        canal_eventos_id: document.getElementById("g-canal-eventos").value,
        canal_parcerias_id: document.getElementById("g-canal-parcerias").value,
        canal_denuncias_id: document.getElementById("g-canal-denuncias").value,
        categoria_modmail_id: document.getElementById("g-categoria-modmail").value,
      })});
      mostrarAviso("aba-geral", "Salvo com sucesso.", "sucesso");
    } catch (e) { mostrarAviso("aba-geral", e.message, "erro"); }
  };
}

// ---------------- Cargo Automático ----------------
function renderizarAutocargo(d) {
  const { canais, cargos, config } = d;
  const el = document.getElementById("aba-autocargo");
  el.innerHTML = `
    <p class="descricao-aba">Quem postar no canal escolhido recebe o cargo automaticamente.</p>
    <div class="linha-formulario">
      <div class="campo"><label>Canal</label><select id="ac-canal">${opcoesCanais(canais, [0], null)}</select></div>
      <div class="campo"><label>Cargo</label><select id="ac-cargo">${opcoesCargos(cargos, null)}</select></div>
    </div>
    <button class="botao botao-primario" id="ac-adicionar">Ativar</button>
    <div class="secao-titulo">Canais ativos</div>
    <div id="ac-lista"></div>
  `;
  function renderLista() {
    const lista = document.getElementById("ac-lista");
    lista.innerHTML = "";
    Object.entries(config.canais_cargo_automatico).forEach(([canalId, cargoId]) => {
      const canal = canais.find((c) => c.id === canalId);
      const cargo = cargos.find((c) => c.id === String(cargoId) || c.id === cargoId);
      const item = document.createElement("div");
      item.className = "lista-item";
      item.innerHTML = `<span class="info">#${canal ? canal.nome : canalId} → ${cargo ? cargo.nome : cargoId}</span><button>remover</button>`;
      item.querySelector("button").onclick = async () => {
        const r = await api("/api/autocargo-save", { method: "POST", body: JSON.stringify({ guildId: servidorAtual, canalId, acao: "remover" }) });
        config.canais_cargo_automatico = r.canais_cargo_automatico;
        renderLista();
      };
      lista.appendChild(item);
    });
  }
  renderLista();
  document.getElementById("ac-adicionar").onclick = async () => {
    const canalId = document.getElementById("ac-canal").value;
    const cargoId = document.getElementById("ac-cargo").value;
    if (!canalId || !cargoId) return mostrarAviso("aba-autocargo", "Escolha canal e cargo.", "erro");
    try {
      const r = await api("/api/autocargo-save", { method: "POST", body: JSON.stringify({ guildId: servidorAtual, canalId, cargoId, acao: "adicionar" }) });
      config.canais_cargo_automatico = r.canais_cargo_automatico;
      renderLista();
      mostrarAviso("aba-autocargo", "Ativado.", "sucesso");
    } catch (e) { mostrarAviso("aba-autocargo", e.message, "erro"); }
  };
}

// ---------------- Contadores ----------------
function renderizarContadores(d) {
  const { cargos, config } = d;
  const el = document.getElementById("aba-contadores");
  el.innerHTML = `
    <div class="linha-formulario">
      <div class="campo"><label>Tipo</label><select id="ct-tipo"><option value="membros">Membros</option><option value="online">Online</option><option value="bots">Bots</option><option value="boosts">Boosts</option><option value="cargo">Cargo específico</option></select></div>
      <div class="campo" id="ct-cargo-wrap" style="display:none;"><label>Cargo</label><select id="ct-cargo">${opcoesCargos(cargos, null)}</select></div>
    </div>
    <button class="botao botao-primario" id="ct-criar">Criar contador</button>
    <div class="secao-titulo">Contadores ativos</div>
    <div id="ct-lista"></div>
  `;
  document.getElementById("ct-tipo").onchange = (e) => { document.getElementById("ct-cargo-wrap").style.display = e.target.value === "cargo" ? "block" : "none"; };
  function renderLista() {
    const lista = document.getElementById("ct-lista");
    lista.innerHTML = "";
    config.contadores.forEach((c) => {
      const item = document.createElement("div");
      item.className = "lista-item";
      item.innerHTML = `<span class="info">tipo: ${c.tipo}</span><button>remover</button>`;
      item.querySelector("button").onclick = async () => {
        const r = await api("/api/contador-remove", { method: "POST", body: JSON.stringify({ guildId: servidorAtual, canalId: c.canal_id }) });
        config.contadores = r.contadores;
        renderLista();
      };
      lista.appendChild(item);
    });
  }
  renderLista();
  document.getElementById("ct-criar").onclick = async () => {
    const tipo = document.getElementById("ct-tipo").value;
    const cargoSelect = document.getElementById("ct-cargo");
    try {
      const r = await api("/api/contador-add", { method: "POST", body: JSON.stringify({
        guildId: servidorAtual, tipo,
        cargoId: tipo === "cargo" ? cargoSelect.value : undefined,
        cargoNome: tipo === "cargo" ? cargoSelect.options[cargoSelect.selectedIndex].text : undefined,
      })});
      config.contadores = r.contadores;
      renderLista();
      mostrarAviso("aba-contadores", r.aviso || "Criado.", "sucesso");
    } catch (e) { mostrarAviso("aba-contadores", e.message, "erro"); }
  };
}

// ---------------- Guerras ----------------
function renderizarGuerras(d) {
  const { guerras, temporadaAtual, canais } = d;
  const el = document.getElementById("aba-guerras");
  el.innerHTML = `
    <p class="descricao-aba">Temporada atual: <strong>${temporadaAtual}</strong>. Pra registrar o placar com participantes, use <code>/guerra-registrar</code> no Discord (precisa marcar @membros).</p>
    <div class="secao-titulo">Anunciar guerra agendada</div>
    <div class="linha-formulario">
      <div class="campo"><label>Gangue A</label><input id="gu-gangue-a"></div>
      <div class="campo"><label>Gangue B</label><input id="gu-gangue-b"></div>
    </div>
    <div class="campo"><label>Quando (texto livre)</label><input id="gu-quando" placeholder="ex: sábado 20h"></div>
    <button class="botao botao-primario" id="gu-anunciar">Anunciar no canal de eventos</button>

    <div class="secao-titulo">Agendar campeonato (Evento Discord de verdade)</div>
    <div class="campo"><label>Nome do campeonato</label><input id="camp-nome"></div>
    <div class="campo"><label>Descrição</label><textarea id="camp-descricao"></textarea></div>
    <div class="linha-formulario">
      <div class="campo"><label>Data e hora</label><input type="datetime-local" id="camp-data"></div>
      <div class="campo"><label>Canal de voz (opcional)</label><select id="camp-canal-voz">${opcoesCanais(canais, [2], null)}</select></div>
    </div>
    <button class="botao botao-primario" id="camp-criar">Criar evento</button>

    <div class="secao-titulo">Histórico recente</div>
    <div id="gu-historico"></div>
  `;
  const hist = document.getElementById("gu-historico");
  if (!guerras.length) {
    hist.innerHTML = `<p class="descricao-aba">Nenhuma guerra registrada ainda.</p>`;
  } else {
    hist.innerHTML = guerras.map((g) => `<div class="lista-item"><span class="info"><strong>${g.gangue_a}</strong> ${g.placar_a} x ${g.placar_b} <strong>${g.gangue_b}</strong> — vencedor: ${g.vencedor} (temporada ${g.temporada})</span></div>`).join("");
  }

  document.getElementById("gu-anunciar").onclick = async () => {
    try {
      await api("/api/guerra-agendar", { method: "POST", body: JSON.stringify({
        guildId: servidorAtual,
        gangueA: document.getElementById("gu-gangue-a").value,
        gangueB: document.getElementById("gu-gangue-b").value,
        quando: document.getElementById("gu-quando").value,
      })});
      mostrarAviso("aba-guerras", "Anunciado.", "sucesso");
    } catch (e) { mostrarAviso("aba-guerras", e.message, "erro"); }
  };

  document.getElementById("camp-criar").onclick = async () => {
    const dataInput = document.getElementById("camp-data").value;
    try {
      await api("/api/campeonato-agendar", { method: "POST", body: JSON.stringify({
        guildId: servidorAtual,
        nome: document.getElementById("camp-nome").value,
        descricao: document.getElementById("camp-descricao").value,
        inicio: dataInput ? new Date(dataInput).toISOString() : null,
        canalVozId: document.getElementById("camp-canal-voz").value || null,
      })});
      mostrarAviso("aba-guerras", "Campeonato criado como Evento Agendado do Discord.", "sucesso");
    } catch (e) { mostrarAviso("aba-guerras", e.message, "erro"); }
  };
}

// ---------------- Patentes & Ranking ----------------
function renderizarPatentes(d) {
  const { patentes, ranking, cargos } = d;
  const el = document.getElementById("aba-patentes");
  el.innerHTML = `
    <div class="secao-titulo">Top 10 — vitórias</div>
    <div id="pt-ranking"></div>
    <div class="secao-titulo">Patentes configuradas</div>
    <div class="linha-formulario">
      <div class="campo"><label>Nome</label><input id="pt-nome"></div>
      <div class="campo"><label>XP mínimo</label><input type="number" id="pt-xp"></div>
      <div class="campo"><label>Cargo (opcional)</label><select id="pt-cargo">${opcoesCargos(cargos, null)}</select></div>
    </div>
    <button class="botao botao-primario" id="pt-salvar">Salvar patente</button>
    <div id="pt-lista" style="margin-top:14px;"></div>
  `;

  const rankingEl = document.getElementById("pt-ranking");
  rankingEl.innerHTML = ranking.length
    ? ranking.map((r, i) => `<div class="lista-item"><span class="info"><span class="ranking-pos">#${i + 1}</span><@${r.userId}> — ${r.vitorias} vitórias (${r.patente || "sem patente"})</span></div>`).join("")
    : `<p class="descricao-aba">Ninguém com perfil registrado ainda.</p>`;

  function renderListaPatentes(lista) {
    const container = document.getElementById("pt-lista");
    container.innerHTML = lista.map((p) => `<div class="lista-item"><span class="info"><strong>${p.nome}</strong> — a partir de ${p.xp_minimo} XP${p.cargo_id ? ` (cargo: <@&${p.cargo_id}>)` : ""}</span><button data-nome="${p.nome}">remover</button></div>`).join("");
    container.querySelectorAll("button").forEach((btn) => {
      btn.onclick = async () => {
        const r = await api("/api/patente-remove", { method: "POST", body: JSON.stringify({ guildId: servidorAtual, nome: btn.dataset.nome }) });
        renderListaPatentes(r.patentes);
      };
    });
  }
  renderListaPatentes(patentes);

  document.getElementById("pt-salvar").onclick = async () => {
    try {
      const r = await api("/api/patente-save", { method: "POST", body: JSON.stringify({
        guildId: servidorAtual,
        nome: document.getElementById("pt-nome").value,
        xpMinimo: document.getElementById("pt-xp").value,
        cargoId: document.getElementById("pt-cargo").value || null,
      })});
      renderListaPatentes(r.patentes);
      mostrarAviso("aba-patentes", "Salvo.", "sucesso");
    } catch (e) { mostrarAviso("aba-patentes", e.message, "erro"); }
  };
}

// ---------------- Denúncias ----------------
function renderizarDenuncias(d) {
  const { denuncias } = d;
  const el = document.getElementById("aba-denuncias");
  el.innerHTML = `<p class="descricao-aba">Denúncias pendentes de revisão.</p><div id="dn-lista"></div>`;
  function renderLista(lista) {
    const container = document.getElementById("dn-lista");
    if (!lista.length) { container.innerHTML = `<p class="descricao-aba">Nenhuma denúncia pendente. 🎉</p>`; return; }
    container.innerHTML = lista.map((den) => `
      <div class="lista-item" style="flex-direction:column; align-items:stretch;">
        <span class="info"><strong>#${den.id}</strong> — <@${den.denunciado_id}> denunciado por <@${den.denunciante_id}><br>Motivo: ${den.motivo}</span>
        <div style="display:flex; gap:8px; margin-top:8px;">
          <input placeholder="ação tomada (ex: advertido)" data-id="${den.id}" class="input-resolucao" style="flex:1; background:var(--panel-2); border:1px solid var(--line); color:var(--phosphor); padding:6px 8px; font-size:0.8rem;">
          <button data-id="${den.id}" class="botao botao-pequeno botao-primario btn-resolver">Resolver</button>
        </div>
      </div>`).join("");
    container.querySelectorAll(".btn-resolver").forEach((btn) => {
      btn.onclick = async () => {
        const input = container.querySelector(`.input-resolucao[data-id="${btn.dataset.id}"]`);
        try {
          await api("/api/denuncia-resolver", { method: "POST", body: JSON.stringify({ guildId: servidorAtual, id: btn.dataset.id, acao: input.value || "Resolvida pelo painel" }) });
          const restante = denuncias.filter((x) => x.id !== btn.dataset.id);
          renderLista(restante);
        } catch (e) { mostrarAviso("aba-denuncias", e.message, "erro"); }
      };
    });
  }
  renderLista(denuncias);
}

// ---------------- Parcerias ----------------
function renderizarParcerias(d) {
  const el = document.getElementById("aba-parcerias");
  el.innerHTML = `
    <div class="campo"><label>Nome do servidor parceiro</label><input id="pc-nome"></div>
    <div class="campo"><label>Link de convite</label><input id="pc-convite"></div>
    <div class="campo"><label>Descrição</label><textarea id="pc-descricao"></textarea></div>
    <div class="campo"><label>Banner (URL, opcional)</label><input id="pc-banner"></div>
    <button class="botao botao-primario" id="pc-adicionar">Publicar parceria</button>
    <div class="secao-titulo">Parcerias registradas</div>
    <div id="pc-lista"></div>
  `;
  function renderLista(lista) {
    const container = document.getElementById("pc-lista");
    container.innerHTML = lista.map((p) => `<d
