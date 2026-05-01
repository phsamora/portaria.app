function login() {
  const email = document.getElementById("email").value;
  const senha = document.getElementById("senha").value;

  auth.signInWithEmailAndPassword(email, senha)
    .then(() => {
      document.getElementById("login").style.display = "none";
      document.getElementById("app").style.display = "block";
      mostrar("home");
    })
    .catch(() => alert("Erro no login"));
}

function mostrar(tela) {
  const c = document.getElementById("conteudo");

  if (tela === "home") {
    c.innerHTML = `
      <div class="card-item">👋 Bem-vindo!</div>
      <div class="card-item">📊 Sistema ativo</div>
    `;
  }

  if (tela === "moradores") {
    c.innerHTML = `
      <input id="nomeMorador" placeholder="Nome">
      <input id="aptoMorador" placeholder="Apartamento">
      <button onclick="addMorador()">Cadastrar</button>
      <div id="lista"></div>
    `;
    carregarMoradores();
  }

  if (tela === "visitantes") {
    c.innerHTML = `
      <input id="nomeVisitante" placeholder="Nome">
      <input id="aptoVisitante" placeholder="Apartamento">
      <button onclick="entradaVisitante()">Registrar Entrada</button>
      <div id="lista"></div>
    `;
    carregarVisitantes();
  }

  if (tela === "encomendas") {
    c.innerHTML = `
      <input id="nomeEnc" placeholder="Morador">
      <input id="descEnc" placeholder="Descrição">
      <button onclick="addEncomenda()">Registrar</button>
      <div id="lista"></div>
    `;
    carregarEncomendas();
  }
}

// MORADORES
function addMorador() {
  const nome = nomeMorador.value;
  const apto = aptoMorador.value;

  db.collection("moradores").add({ nome, apto });
  carregarMoradores();
}

function carregarMoradores() {
  const lista = document.getElementById("lista");
  lista.innerHTML = "";

  db.collection("moradores").get().then(s => {
    s.forEach(doc => {
      const m = doc.data();
      lista.innerHTML += `
        <div class="card-item">
          👤 ${m.nome} <br> 🏠 ${m.apto}
        </div>`;
    });
  });
}

// VISITANTES
function entradaVisitante() {
  db.collection("visitantes").add({
    nome: nomeVisitante.value,
    apto: aptoVisitante.value,
    status: "dentro"
  });

  carregarVisitantes();
}

function carregarVisitantes() {
  const lista = document.getElementById("lista");
  lista.innerHTML = "";

  db.collection("visitantes").get().then(s => {
    s.forEach(doc => {
      const v = doc.data();
      lista.innerHTML += `
        <div class="card-item">
          🚶 ${v.nome} - ${v.apto}<br>
          <span class="status-ok">${v.status}</span>
        </div>`;
    });
  });
}

// ENCOMENDAS
function addEncomenda() {
  db.collection("encomendas").add({
    nome: nomeEnc.value,
    desc: descEnc.value,
    status: "pendente"
  });

  carregarEncomendas();
}

function carregarEncomendas() {
  const lista = document.getElementById("lista");
  lista.innerHTML = "";

  db.collection("encomendas").get().then(s => {
    s.forEach(doc => {
      const e = doc.data();
      lista.innerHTML += `
        <div class="card-item">
          📦 ${e.nome} - ${e.desc}<br>
          <span class="status-pendente">${e.status}</span>
          <button onclick="entregar('${doc.id}')">Entregar</button>
        </div>`;
    });
  });
}

function entregar(id) {
  db.collection("encomendas").doc(id).update({
    status: "entregue"
  });

  carregarEncomendas();
}3