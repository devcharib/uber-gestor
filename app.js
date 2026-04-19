/* ═══════════════════════════════════════════════════════
   ROTA CERTA — app.js
   Frontend logic — comunica com Apps Script via fetch
═══════════════════════════════════════════════════════ */

// !! ALTERE ESTA URL PARA A URL DO SEU APPS SCRIPT PUBLICADO !!
const API_URL = "https://script.google.com/macros/s/AKfycbyOw3r7ku9EocMhVvb7VLfDTGuz-_Pn5luBcna7nOihsWJzNzSFEHil-8NbxGy98dbJ/exec";

// ── Estado global ──
let currentUser  = null;
let histTab      = "corridas";

// ══════════════════════ INIT ══════════════════════

document.addEventListener("DOMContentLoaded", () => {
  // Verifica sessão salva
  const saved = sessionStorage.getItem("rc_user");
  if (saved) {
    currentUser = saved;
    showApp();
  }

  // Preenche selects de data
  populateDateSelects();

  // Data padrão nos formulários
  setDefaultDates();
});

function populateDateSelects() {
  const meses = [
    "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
    "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"
  ];
  const now = new Date();
  const anoAtual = now.getFullYear();

  ["dash-mes","hist-mes"].forEach(id => {
    const sel = document.getElementById(id);
    meses.forEach((m, i) => {
      const opt = document.createElement("option");
      opt.value = i + 1;
      opt.textContent = m;
      if (i + 1 === now.getMonth() + 1) opt.selected = true;
      sel.appendChild(opt);
    });
  });

  ["dash-ano","hist-ano"].forEach(id => {
    const sel = document.getElementById(id);
    for (let y = anoAtual; y >= anoAtual - 3; y--) {
      const opt = document.createElement("option");
      opt.value = y;
      opt.textContent = y;
      sel.appendChild(opt);
    }
  });
}

function setDefaultDates() {
  const today = new Date().toISOString().split("T")[0];
  ["corrida-data","gasto-data"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = today;
  });
}

// ══════════════════════ AUTH ══════════════════════

async function doLogin() {
  const user = document.getElementById("inp-user").value.trim();
  const pass = document.getElementById("inp-pass").value.trim();
  const errEl = document.getElementById("login-error");
  const btn   = document.getElementById("btn-login");

  if (!user || !pass) { showError(errEl, "Preencha usuário e senha."); return; }

  btn.innerHTML = '<div class="spinner"></div>';
  btn.disabled = true;
  errEl.classList.add("hidden");

  try {
    const res = await apiCall({ action: "login", usuario: user, senha: pass });
    if (res.ok) {
      currentUser = user;
      sessionStorage.setItem("rc_user", user);
      showApp();
    } else {
      showError(errEl, res.msg || "Usuário ou senha incorretos.");
    }
  } catch (e) {
    showError(errEl, "Erro de conexão. Tente novamente.");
  } finally {
    btn.innerHTML = '<span>Entrar</span><span class="btn-arrow">→</span>';
    btn.disabled = false;
  }
}

function doLogout() {
  sessionStorage.removeItem("rc_user");
  currentUser = null;
  document.getElementById("screen-app").classList.add("hidden");
  document.getElementById("screen-app").classList.remove("active");
  document.getElementById("screen-login").classList.remove("hidden");
  document.getElementById("screen-login").classList.add("active");
  document.getElementById("inp-user").value = "";
  document.getElementById("inp-pass").value = "";
}

function showApp() {
  document.getElementById("screen-login").classList.add("hidden");
  document.getElementById("screen-login").classList.remove("active");
  document.getElementById("screen-app").classList.remove("hidden");
  document.getElementById("screen-app").classList.add("active");
  document.getElementById("topbar-user").textContent = currentUser;
  loadDashboard();
}

function showError(el, msg) {
  el.textContent = msg;
  el.classList.remove("hidden");
}

// ══════════════════════ NAVEGAÇÃO ══════════════════════

function switchTab(tab) {
  document.querySelectorAll(".tab-content").forEach(el => {
    el.classList.remove("active");
    el.classList.add("hidden");
  });
  document.querySelectorAll(".nav-btn").forEach(btn => btn.classList.remove("active"));

  document.getElementById("tab-" + tab).classList.add("active");
  document.getElementById("tab-" + tab).classList.remove("hidden");
  document.querySelector(`[data-tab="${tab}"]`).classList.add("active");
}

function switchHistTab(tab) {
  histTab = tab;
  document.querySelectorAll(".hist-tab").forEach((el, i) => {
    el.classList.toggle("active", (i === 0 && tab === "corridas") || (i === 1 && tab === "gastos"));
  });
  document.getElementById("hist-list").innerHTML = '<div class="empty-state">Clique em Carregar.</div>';
}

// ══════════════════════ DASHBOARD ══════════════════════

async function loadDashboard() {
  const mes = document.getElementById("dash-mes").value;
  const ano = document.getElementById("dash-ano").value;

  document.getElementById("dash-loading").classList.remove("hidden");

  try {
    const res = await apiCall({ action: "dashboard", usuario: currentUser, mes, ano });
    if (res.ok) renderDashboard(res.data);
    else toast("Erro ao carregar painel: " + (res.msg || ""), "err");
  } catch (e) {
    toast("Erro de conexão.", "err");
  } finally {
    document.getElementById("dash-loading").classList.add("hidden");
  }
}

function renderDashboard(d) {
  const fmt = v => "R$ " + Number(v || 0).toFixed(2).replace(".", ",");
  const fmtKm = v => Number(v || 0).toFixed(1) + " km";
  const fmtH  = v => Number(v || 0).toFixed(1) + " h";

  document.getElementById("kpi-bruto").textContent  = fmt(d.bruto);
  document.getElementById("kpi-gastos").textContent = fmt(d.gastos_total);
  document.getElementById("kpi-liquido").textContent= fmt(d.liquido);
  document.getElementById("kpi-bonus").textContent  = fmt(d.bonus);

  document.getElementById("stat-ganho-km").textContent  = d.ganho_km   ? "R$ " + Number(d.ganho_km).toFixed(2).replace(".",",") + "/km" : "—";
  document.getElementById("stat-custo-km").textContent  = d.custo_km   ? "R$ " + Number(d.custo_km).toFixed(2).replace(".",",") + "/km" : "—";
  document.getElementById("stat-ganho-hora").textContent= d.ganho_hora ? "R$ " + Number(d.ganho_hora).toFixed(2).replace(".",",") + "/h"  : "—";
  document.getElementById("stat-km-total").textContent  = d.km_total   ? fmtKm(d.km_total)  : "—";
  document.getElementById("stat-horas").textContent     = d.horas_total ? fmtH(d.horas_total) : "—";
  document.getElementById("stat-corridas").textContent  = d.qtd_corridas || "—";

  // Breakdown de gastos
  const list = document.getElementById("breakdown-list");
  if (!d.gastos_cats || !d.gastos_cats.length) {
    list.innerHTML = '<div class="empty-state">Nenhum gasto registrado no período.</div>';
    return;
  }
  const max = Math.max(...d.gastos_cats.map(g => g.valor));
  list.innerHTML = d.gastos_cats.map(g => `
    <div class="breakdown-item">
      <div class="breakdown-name">${g.categoria}</div>
      <div class="breakdown-bar-wrap">
        <div class="breakdown-bar" style="width:${(g.valor/max*100).toFixed(0)}%"></div>
      </div>
      <div class="breakdown-val">R$ ${Number(g.valor).toFixed(2).replace(".",",")}</div>
    </div>
  `).join("");
}

// ══════════════════════ SALVAR CORRIDA ══════════════════════

async function salvarCorrida() {
  const data       = document.getElementById("corrida-data").value;
  const plataforma = document.getElementById("corrida-plataforma").value;
  const valor      = parseFloat(document.getElementById("corrida-valor").value) || 0;
  const km         = parseFloat(document.getElementById("corrida-km").value)    || 0;
  const inicio     = document.getElementById("corrida-inicio").value;
  const fim        = document.getElementById("corrida-fim").value;
  const bonus      = parseFloat(document.getElementById("corrida-bonus").value) || 0;
  const obs        = document.getElementById("corrida-obs").value.trim();
  const statusEl   = document.getElementById("corrida-status");

  if (!data || !valor) {
    showStatusMsg(statusEl, "Preencha ao menos Data e Valor.", "err");
    return;
  }

  // Calcula horas trabalhadas
  let horas = 0;
  if (inicio && fim) {
    const [hi, mi] = inicio.split(":").map(Number);
    const [hf, mf] = fim.split(":").map(Number);
    horas = ((hf * 60 + mf) - (hi * 60 + mi)) / 60;
    if (horas < 0) horas += 24;
  }

  const payload = {
    action: "salvarCorrida",
    usuario: currentUser,
    data, plataforma, valor, km, inicio, fim, horas: horas.toFixed(2), bonus, obs
  };

  showStatusMsg(statusEl, "Salvando...", "");
  try {
    const res = await apiCall(payload);
    if (res.ok) {
      showStatusMsg(statusEl, "✓ Corrida salva com sucesso!", "ok");
      clearForm(["corrida-valor","corrida-km","corrida-inicio","corrida-fim","corrida-bonus","corrida-obs"]);
      toast("Corrida registrada!");
    } else {
      showStatusMsg(statusEl, "Erro: " + (res.msg || ""), "err");
    }
  } catch(e) {
    showStatusMsg(statusEl, "Erro de conexão.", "err");
  }
}

// ══════════════════════ SALVAR GASTO ══════════════════════

async function salvarGasto() {
  const data      = document.getElementById("gasto-data").value;
  const categoria = document.getElementById("gasto-categoria").value;
  const valor     = parseFloat(document.getElementById("gasto-valor").value) || 0;
  const km        = document.getElementById("gasto-km").value;
  const desc      = document.getElementById("gasto-desc").value.trim();
  const statusEl  = document.getElementById("gasto-status");

  if (!data || !valor) {
    showStatusMsg(statusEl, "Preencha Data e Valor.", "err");
    return;
  }

  const payload = {
    action: "salvarGasto",
    usuario: currentUser,
    data, categoria, valor, km, desc
  };

  showStatusMsg(statusEl, "Salvando...", "");
  try {
    const res = await apiCall(payload);
    if (res.ok) {
      showStatusMsg(statusEl, "✓ Gasto salvo com sucesso!", "ok");
      clearForm(["gasto-valor","gasto-km","gasto-desc"]);
      toast("Gasto registrado!");
    } else {
      showStatusMsg(statusEl, "Erro: " + (res.msg || ""), "err");
    }
  } catch(e) {
    showStatusMsg(statusEl, "Erro de conexão.", "err");
  }
}

// ══════════════════════ HISTÓRICO ══════════════════════

async function loadHistorico() {
  const mes = document.getElementById("hist-mes").value;
  const ano = document.getElementById("hist-ano").value;
  const list= document.getElementById("hist-list");
  const loading = document.getElementById("hist-loading");

  loading.classList.remove("hidden");
  list.innerHTML = "";

  try {
    const res = await apiCall({
      action: histTab === "corridas" ? "listarCorridas" : "listarGastos",
      usuario: currentUser, mes, ano
    });

    if (!res.ok) { toast("Erro: " + (res.msg || ""), "err"); return; }

    const items = res.data || [];
    if (!items.length) {
      list.innerHTML = '<div class="empty-state">Nenhum registro no período.</div>';
      return;
    }

    if (histTab === "corridas") {
      list.innerHTML = items.map(c => `
        <div class="hist-item">
          <div class="hist-item-info">
            <div class="hist-item-title">${c.plataforma} — ${formatDate(c.data)}</div>
            <div class="hist-item-sub">${c.km ? c.km + " km · " : ""}${c.horas ? c.horas + " h" : ""}${c.obs ? " · " + c.obs : ""}</div>
          </div>
          <div class="hist-item-val pos">R$ ${Number(c.valor).toFixed(2).replace(".",",")}${c.bonus > 0 ? '<br><span style="font-size:.7rem;color:var(--orange)">+R$ '+Number(c.bonus).toFixed(2).replace(".",",")+'</span>' : ""}</div>
        </div>
      `).join("");
    } else {
      list.innerHTML = items.map(g => `
        <div class="hist-item">
          <div class="hist-item-info">
            <div class="hist-item-title">${g.categoria} — ${formatDate(g.data)}</div>
            <div class="hist-item-sub">${g.desc || ""}${g.km ? " · KM " + g.km : ""}</div>
          </div>
          <div class="hist-item-val neg">- R$ ${Number(g.valor).toFixed(2).replace(".",",")}</div>
        </div>
      `).join("");
    }
  } catch(e) {
    toast("Erro de conexão.", "err");
  } finally {
    loading.classList.add("hidden");
  }
}

// ══════════════════════ HELPERS ══════════════════════

async function apiCall(payload) {
  const params = new URLSearchParams(payload);
  const res = await fetch(API_URL + "?" + params.toString(), { method: "GET" });
  if (!res.ok) throw new Error("HTTP " + res.status);
  return await res.json();
}

function showStatusMsg(el, msg, type) {
  el.textContent = msg;
  el.className = "status-msg " + (type === "ok" ? "ok" : type === "err" ? "err" : "");
  el.classList.remove("hidden");
  if (type === "ok") setTimeout(() => el.classList.add("hidden"), 3500);
}

function clearForm(ids) {
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return d ? `${d}/${m}/${y}` : dateStr;
}

function toast(msg, type) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.style.borderColor = type === "err" ? "var(--red)" : "var(--green)";
  el.style.color       = type === "err" ? "var(--red)" : "var(--green)";
  el.classList.remove("hidden");
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => el.classList.add("hidden"), 2800);
}

// Enter no login
document.addEventListener("keydown", e => {
  if (e.key === "Enter") {
    const loginScreen = document.getElementById("screen-login");
    if (!loginScreen.classList.contains("hidden")) doLogin();
  }
});