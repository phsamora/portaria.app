/* ============================================================
   PORTAFÁCIL – app.js
   Main application controller
   ============================================================ */

import {
  fbSignIn, fbSignOut, fbOnAuthChange, fbCurrentUser, _useDemo,
  fbListenVisitors, fbAddVisitor, fbCheckOutVisitor,
  fbListenPackages, fbAddPackage, fbDeliverPackage,
  fbListenResidents, fbAddResident, fbDeleteResident,
  formatTime, formatDate, isToday, initials
} from "./firebase.js";

/* ============================================================
   STATE
   ============================================================ */
let state = {
  user: null,
  visitors: [],
  packages: [],
  residents: [],
  visitorFilter: "all",
  packageFilter: "all",
  residentSearch: "",
  unsubs: []
};

/* ============================================================
   BOOT
   ============================================================ */
fbOnAuthChange(user => {
  if (user) {
    state.user = user;
    bootApp();
  } else {
    showScreen("login-screen");
  }
});

/* ============================================================
   AUTH
   ============================================================ */
window.doLogin = async function() {
  const email = qs("#login-email").value.trim();
  const pass  = qs("#login-password").value;
  const btn   = qs("#login-btn");
  const err   = qs("#login-error");

  err.classList.add("hidden");

  if (!email || !pass) {
    showErr(err, "Preencha e-mail e senha.");
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span class="material-icons-round" style="animation:spin 1s linear infinite">refresh</span> Entrando...';

  try {
    const { user } = await fbSignIn(email, pass);
    state.user = user;
    bootApp();
  } catch (e) {
    showErr(err, e.message.includes("invalid") || e.message.includes("credential")
      ? "E-mail ou senha incorretos."
      : e.message
    );
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span class="material-icons-round">login</span> Entrar';
  }
};

window.doLogout = async function() {
  state.unsubs.forEach(u => u());
  state.unsubs = [];
  await fbSignOut();
  showScreen("login-screen");
  qs("#login-email").value = "";
  qs("#login-password").value = "";
};

// Enter key on login
qs("#login-password").addEventListener("keydown", e => {
  if (e.key === "Enter") doLogin();
});
qs("#login-email").addEventListener("keydown", e => {
  if (e.key === "Enter") qs("#login-password").focus();
});

/* ============================================================
   APP BOOT
   ============================================================ */
function bootApp() {
  showScreen("app-screen");

  const email = state.user?.email || state.user?.displayName || "";
  qs("#topbar-user").textContent = _useDemo ? "👀 Modo Demo" : email;
  qs("#sidebar-user-info").innerHTML = `<strong>${email.split("@")[0] || "Porteiro"}</strong>${email}`;

  // Date
  const now = new Date();
  qs("#section-date").textContent = now.toLocaleDateString("pt-BR", {
    weekday: "long", day: "numeric", month: "long"
  });

  // Listeners
  const u1 = fbListenVisitors(v => { state.visitors = v; renderAll(); });
  const u2 = fbListenPackages(p => { state.packages = p; renderAll(); });
  const u3 = fbListenResidents(r => { state.residents = r; renderResidents(); renderDash(); });
  state.unsubs = [u1, u2, u3];

  // Show demo banner
  if (_useDemo) {
    setTimeout(() => showToast("🎭 Modo Demo ativo. Dados em memória.", ""), 500);
  }
}

/* ============================================================
   SECTION NAVIGATION
   ============================================================ */
window.showSection = function(section) {
  // Content sections
  qsa(".content-section").forEach(s => s.classList.remove("active"));
  qs(`#sec-${section}`).classList.add("active");

  // Titles
  const titles = {
    dashboard: "Dashboard",
    visitors:  "Visitantes",
    packages:  "Encomendas",
    residents: "Moradores"
  };
  qs("#section-title").textContent = titles[section] || "";

  // Sidebar active
  qsa(".nav-item").forEach(b => {
    b.classList.toggle("active", b.dataset.section === section);
  });

  // Bottom nav active
  qsa(".bnav-item").forEach(b => {
    b.classList.toggle("active", b.dataset.section === section);
  });
};

/* ============================================================
   RENDER ALL
   ============================================================ */
function renderAll() {
  renderDash();
  renderVisitors();
  renderPackages();
}

/* ============================================================
   DASHBOARD
   ============================================================ */
function renderDash() {
  const todayVisitors = state.visitors.filter(v => isToday(v.entryTime));
  const insideNow     = state.visitors.filter(v => v.status === "inside");
  const pending       = state.packages.filter(p => p.status === "pending");

  qs("#stat-visitors").textContent  = todayVisitors.length;
  qs("#stat-inside").textContent    = insideNow.length;
  qs("#stat-packages").textContent  = pending.length;
  qs("#stat-residents").textContent = state.residents.length;

  // Recent visitors (last 5 today)
  const recentEl = qs("#dash-recent-visitors");
  const recent   = todayVisitors.slice(0, 5);
  if (!recent.length) {
    recentEl.innerHTML = `<div class="mini-empty">Nenhuma entrada hoje</div>`;
  } else {
    recentEl.innerHTML = recent.map(v => `
      <div class="mini-item">
        <div class="mini-avatar ${v.status === 'inside' ? 'av-green' : 'av-gray'}">${initials(v.name)}</div>
        <div class="mini-info">
          <div class="mini-name">${esc(v.name)}</div>
          <div class="mini-sub">${esc(v.apt)} · ${formatTime(v.entryTime)}</div>
        </div>
        <span class="badge ${v.status === 'inside' ? 'badge-green' : 'badge-gray'}">
          <span class="material-icons-round">${v.status === 'inside' ? 'meeting_room' : 'exit_to_app'}</span>
          ${v.status === 'inside' ? 'Dentro' : 'Saiu'}
        </span>
      </div>
    `).join("");
  }

  // Pending packages
  const pkgEl = qs("#dash-pending-packages");
  if (!pending.length) {
    pkgEl.innerHTML = `<div class="mini-empty">Nenhuma encomenda pendente</div>`;
  } else {
    pkgEl.innerHTML = pending.slice(0, 5).map(p => `
      <div class="mini-item">
        <div class="mini-avatar av-amber"><span class="material-icons-round" style="font-size:18px">inventory_2</span></div>
        <div class="mini-info">
          <div class="mini-name">${esc(p.recipientName)}</div>
          <div class="mini-sub">${esc(p.apt)} · ${esc(p.sender || "–")}</div>
        </div>
        <span class="badge badge-amber">
          <span class="material-icons-round">schedule</span> Pendente
        </span>
      </div>
    `).join("");
  }
}

/* ============================================================
   VISITORS
   ============================================================ */
function renderVisitors() {
  let list = [...state.visitors];

  if (state.visitorFilter === "inside")  list = list.filter(v => v.status === "inside");
  if (state.visitorFilter === "outside") list = list.filter(v => v.status === "outside");

  const el = qs("#visitors-list");

  if (!list.length) {
    el.innerHTML = `<div class="empty-state">
      <span class="material-icons-round">directions_walk</span>
      <p>Nenhum visitante encontrado</p>
    </div>`;
    return;
  }

  el.innerHTML = list.map(v => {
    const inside = v.status === "inside";
    return `
    <div class="item-card" id="vc-${v.id}">
      <div class="item-avatar ${inside ? 'av-green' : 'av-gray'}">${initials(v.name)}</div>
      <div class="item-info">
        <div class="item-name">${esc(v.name)}</div>
        <div class="item-sub">${esc(v.apt)}${v.reason ? ' · ' + esc(v.reason) : ''}</div>
        <div class="item-meta">
          <span class="material-icons-round" style="font-size:12px;vertical-align:middle">login</span>
          Entrada: ${formatTime(v.entryTime)}
          ${v.exitTime ? `&nbsp;·&nbsp;<span class="material-icons-round" style="font-size:12px;vertical-align:middle">logout</span> Saída: ${formatTime(v.exitTime)}` : ''}
        </div>
      </div>
      <div class="item-actions">
        <span class="badge ${inside ? 'badge-green' : 'badge-gray'}">
          <span class="material-icons-round">${inside ? 'meeting_room' : 'exit_to_app'}</span>
          ${inside ? 'Dentro' : 'Saiu'}
        </span>
        ${inside ? `
          <button class="btn btn-sm btn-danger" onclick="checkOut('${v.id}')">
            <span class="material-icons-round">logout</span>
            <span class="hide-xs">Registrar Saída</span>
          </button>
        ` : ''}
      </div>
    </div>`;
  }).join("");
}

window.filterVisitors = function(f) {
  state.visitorFilter = f;
  qsa("[id^='vf-']").forEach(b => b.classList.remove("active"));
  qs(`#vf-${f}`).classList.add("active");
  renderVisitors();
};

window.checkOut = async function(id) {
  try {
    await fbCheckOutVisitor(id);
    showToast("Saída registrada!", "success");
  } catch (e) {
    showToast("Erro ao registrar saída.", "error");
  }
};

window.addVisitor = async function() {
  const name   = qs("#v-name").value.trim();
  const apt    = qs("#v-apt").value.trim();
  const reason = qs("#v-reason").value.trim();

  if (!name || !apt) { showToast("Nome e apartamento são obrigatórios.", "error"); return; }

  try {
    await fbAddVisitor({ name, apt, reason });
    closeModal("modal-visitor");
    clearFields(["v-name","v-apt","v-reason"]);
    showToast("Entrada registrada! ✅", "success");
    if (getCurrentSection() !== "visitors") showSection("visitors");
  } catch (e) {
    showToast("Erro ao registrar visitante.", "error");
  }
};

/* ============================================================
   PACKAGES
   ============================================================ */
function renderPackages() {
  let list = [...state.packages];

  if (state.packageFilter === "pending")   list = list.filter(p => p.status === "pending");
  if (state.packageFilter === "delivered") list = list.filter(p => p.status === "delivered");

  const el = qs("#packages-list");

  if (!list.length) {
    el.innerHTML = `<div class="empty-state">
      <span class="material-icons-round">inventory_2</span>
      <p>Nenhuma encomenda encontrada</p>
    </div>`;
    return;
  }

  el.innerHTML = list.map(p => {
    const pending = p.status === "pending";
    return `
    <div class="item-card" id="pc-${p.id}">
      <div class="item-avatar ${pending ? 'av-amber' : 'av-green'}">
        <span class="material-icons-round" style="font-size:22px">inventory_2</span>
      </div>
      <div class="item-info">
        <div class="item-name">${esc(p.recipientName)}</div>
        <div class="item-sub">${esc(p.apt)}${p.description ? ' · ' + esc(p.description) : ''}</div>
        <div class="item-meta">
          ${p.sender ? `<span class="material-icons-round" style="font-size:12px;vertical-align:middle">local_shipping</span> ${esc(p.sender)} · ` : ''}
          Recebida: ${formatDate(p.receivedAt)} ${formatTime(p.receivedAt)}
          ${p.deliveredAt ? ` · Entregue: ${formatTime(p.deliveredAt)}` : ''}
        </div>
      </div>
      <div class="item-actions">
        <span class="badge ${pending ? 'badge-amber' : 'badge-green'}">
          <span class="material-icons-round">${pending ? 'schedule' : 'check_circle'}</span>
          ${pending ? 'Pendente' : 'Entregue'}
        </span>
        ${pending ? `
          <button class="btn btn-sm btn-success" onclick="deliverPackage('${p.id}')">
            <span class="material-icons-round">check</span>
            <span class="hide-xs">Entregue</span>
          </button>
        ` : ''}
      </div>
    </div>`;
  }).join("");
}

window.filterPackages = function(f) {
  state.packageFilter = f;
  qsa("[id^='pf-']").forEach(b => b.classList.remove("active"));
  qs(`#pf-${f}`).classList.add("active");
  renderPackages();
};

window.deliverPackage = async function(id) {
  try {
    await fbDeliverPackage(id);
    showToast("Encomenda marcada como entregue! ✅", "success");
  } catch (e) {
    showToast("Erro ao atualizar encomenda.", "error");
  }
};

window.addPackage = async function() {
  const recipientName = qs("#p-name").value.trim();
  const apt           = qs("#p-apt").value.trim();
  const description   = qs("#p-desc").value.trim();
  const sender        = qs("#p-sender").value.trim();

  if (!recipientName || !apt) { showToast("Destinatário e apartamento são obrigatórios.", "error"); return; }

  try {
    await fbAddPackage({ recipientName, apt, description, sender });
    closeModal("modal-package");
    clearFields(["p-name","p-apt","p-desc","p-sender"]);
    showToast("Encomenda registrada! 📦", "success");
    if (getCurrentSection() !== "packages") showSection("packages");
  } catch (e) {
    showToast("Erro ao registrar encomenda.", "error");
  }
};

/* ============================================================
   RESIDENTS
   ============================================================ */
function renderResidents() {
  const search = state.residentSearch.toLowerCase();
  let list = [...state.residents];
  if (search) {
    list = list.filter(r =>
      r.name.toLowerCase().includes(search) ||
      (r.apt||"").toLowerCase().includes(search) ||
      (r.block||"").toLowerCase().includes(search) ||
      (r.phone||"").includes(search)
    );
  }

  const el = qs("#residents-list");

  if (!list.length) {
    el.innerHTML = `<div class="empty-state">
      <span class="material-icons-round">people</span>
      <p>${search ? 'Nenhum morador encontrado' : 'Nenhum morador cadastrado'}</p>
    </div>`;
    return;
  }

  const colors = ["av-blue","av-green","av-amber","av-red"];

  el.innerHTML = list.map((r, i) => `
    <div class="item-card">
      <div class="item-avatar ${colors[i%4]}">${initials(r.name)}</div>
      <div class="item-info">
        <div class="item-name">${esc(r.name)}</div>
        <div class="item-sub">
          Bloco ${esc(r.block||'–')} · Apt ${esc(r.apt)}
        </div>
        ${r.phone ? `<div class="item-meta">
          <span class="material-icons-round" style="font-size:12px;vertical-align:middle">phone</span>
          ${esc(r.phone)}
        </div>` : ''}
      </div>
      <div class="item-actions">
        ${r.phone ? `
          <a class="btn btn-sm btn-ghost" href="tel:${esc(r.phone)}" title="Ligar">
            <span class="material-icons-round">phone</span>
          </a>` : ''}
        <button class="btn btn-sm btn-ghost" onclick="deleteResident('${r.id}','${esc(r.name)}')" title="Remover" style="color:var(--red)">
          <span class="material-icons-round">delete</span>
        </button>
      </div>
    </div>
  `).join("");
}

window.searchResidents = function() {
  state.residentSearch = qs("#resident-search").value;
  renderResidents();
};

window.addResident = async function() {
  const name  = qs("#r-name").value.trim();
  const block = qs("#r-block").value.trim();
  const apt   = qs("#r-apt").value.trim();
  const phone = qs("#r-phone").value.trim();

  if (!name || !apt) { showToast("Nome e apartamento são obrigatórios.", "error"); return; }

  try {
    await fbAddResident({ name, block, apt, phone });
    closeModal("modal-resident");
    clearFields(["r-name","r-block","r-apt","r-phone"]);
    showToast("Morador cadastrado! 👤", "success");
  } catch (e) {
    showToast("Erro ao cadastrar morador.", "error");
  }
};

window.deleteResident = async function(id, name) {
  if (!confirm(`Remover "${name}" do cadastro?`)) return;
  try {
    await fbDeleteResident(id);
    showToast("Morador removido.", "");
  } catch (e) {
    showToast("Erro ao remover morador.", "error");
  }
};

/* ============================================================
   MODALS
   ============================================================ */
window.openModal = function(id) {
  const m = qs("#" + id);
  m.classList.add("open");
  // Focus first input
  setTimeout(() => {
    const inp = m.querySelector("input");
    if (inp) inp.focus();
  }, 100);
};

window.closeModal = function(id) {
  qs("#" + id).classList.remove("open");
};

window.closeModalOutside = function(e, id) {
  if (e.target.id === id) closeModal(id);
};

// ESC to close modals
document.addEventListener("keydown", e => {
  if (e.key === "Escape") {
    qsa(".modal-overlay.open").forEach(m => m.classList.remove("open"));
  }
});

/* ============================================================
   UTILS
   ============================================================ */
function showScreen(id) {
  qsa(".screen").forEach(s => s.classList.remove("active"));
  qs("#" + id).classList.add("active");
}

function showErr(el, msg) {
  el.textContent = msg;
  el.classList.remove("hidden");
}

let toastTimer;
window.showToast = function(msg, type) {
  const t = qs("#toast");
  t.textContent = msg;
  t.className = "toast" + (type ? ` toast-${type}` : "");
  t.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add("hidden"), 3000);
};

function clearFields(ids) {
  ids.forEach(id => { const el = qs("#" + id); if (el) el.value = ""; });
}

function getCurrentSection() {
  const active = qs(".content-section.active");
  return active ? active.id.replace("sec-","") : "dashboard";
}

function qs(sel) { return document.querySelector(sel); }
function qsa(sel) { return document.querySelectorAll(sel); }
function esc(str) {
  return String(str||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

// CSS spin animation
const styleTag = document.createElement("style");
styleTag.textContent = `@keyframes spin { to { transform: rotate(360deg); } } .hide-xs { } @media(max-width:480px){.hide-xs{display:none}}`;
document.head.appendChild(styleTag);
