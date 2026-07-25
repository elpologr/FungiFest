// FungiFest Morelia — comportamiento base

// ══════════════════════════════════════════════════════════════════
// FIREBASE — configuración e inicialización
// (SDK "compat" cargado con <script> en index.html, igual que en Fer)
// ══════════════════════════════════════════════════════════════════
const firebaseConfig = {
  apiKey: "AIzaSyAkyPOwwU-HoDAVqNcMKIkiI7pkBhpTRmw",
  authDomain: "yesos-kukumita.firebaseapp.com",
  projectId: "yesos-kukumita",
  storageBucket: "yesos-kukumita.firebasestorage.app",
  messagingSenderId: "784730667884",
  appId: "1:784730667884:web:60657f707e01dea1379149",
  measurementId: "G-WW1RXPVB65"
};

firebase.initializeApp(firebaseConfig);
if (firebase.analytics) {
  firebase.analytics();
}
// Si más adelante necesitas Firestore/Auth, agrega el <script> compat
// correspondiente en index.html y descomenta la línea que ocupes:
// const db = firebase.firestore();
// const auth = firebase.auth();

// ══════════════════════════════════════════════════════════════════
// GOOGLE SHEETS — catálogo de Proyectos y Publicaciones
// ══════════════════════════════════════════════════════════════════
// 🔧 CONFIGURACIÓN — cambia solo esto si mueves la hoja:
const SHEET_ID = '1iRTADxCo5_onvbWhJxIDURrcmWCAFuGxvNh1gucFNZY';
const SHEET_NAME = 'Hoja 1';

// La fila 1 se asume como encabezado (títulos de columna) y se omite.
const OMITIR_ENCABEZADO = true;

// Índices de columna (A=0, B=1, C=2 ...). Ajusta si tu hoja usa otro orden.
// Tu hoja "FungiFest" tiene: A="Nombre", B="Tipo", C="imgbb" (link de imagen),
// D="descripcion". E-F quedan listas para Contenido y Enlace.
const COLUMNAS = {
  TITULO: 0,        // A
  TIPO: 1,          // B — debe decir "Proyecto" o "Publicación"
  IMAGEN: 2,          // C — link de imgbb
  DESCRIPCION: 3,     // D
  CONTENIDO: 4,       // E
  ENLACE: 5           // F
};

function normalizarTexto(texto) {
  return (texto ?? '')
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // quita acentos: "publicación" -> "publicacion"
}

// Descarga y convierte la hoja en un arreglo de objetos.
async function obtenerFilasDeLaHoja() {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(SHEET_NAME)}`;

  const respuesta = await fetch(url);
  if (!respuesta.ok) {
    throw new Error(`No se pudo leer la hoja (HTTP ${respuesta.status})`);
  }

  const texto = await respuesta.text();

  // La respuesta llega envuelta en: google.visualization.Query.setResponse({...});
  const inicio = texto.indexOf('{');
  const fin = texto.lastIndexOf('}');
  const json = JSON.parse(texto.substring(inicio, fin + 1));

  const filasCrudas = (json.table && json.table.rows) || [];

  let filas = filasCrudas.map((fila) => {
    const celda = (indice) => (fila.c[indice] ? fila.c[indice].v : '');
    return {
      titulo: celda(COLUMNAS.TITULO),
      tipo: celda(COLUMNAS.TIPO),
      descripcion: celda(COLUMNAS.DESCRIPCION),
      contenido: celda(COLUMNAS.CONTENIDO),
      imagen: celda(COLUMNAS.IMAGEN),
      enlace: celda(COLUMNAS.ENLACE)
    };
  });

  if (OMITIR_ENCABEZADO) {
    filas = filas.slice(1);
  }

  return filas;
}

// Separa las filas según el texto de la columna B.
function clasificarFilas(filas) {
  const proyectos = [];
  const publicaciones = [];

  filas.forEach((fila) => {
    const tipo = normalizarTexto(fila.tipo);
    if (tipo === 'proyecto') {
      proyectos.push(fila);
    } else if (tipo.startsWith('public')) {
      publicaciones.push(fila);
    }
  });

  return { proyectos, publicaciones };
}

// ══════════════════════════════════════════════════════════════════
// TARJETAS Y MODAL
// ══════════════════════════════════════════════════════════════════

// Evita inyección de HTML al mostrar texto que viene de la hoja de cálculo.
function escaparHTML(texto) {
  const contenedor = document.createElement('div');
  contenedor.textContent = texto ?? '';
  return contenedor.innerHTML;
}

function crearTarjetaProyecto(item) {
  const tarjeta = document.createElement('button');
  tarjeta.type = 'button';
  tarjeta.className = 'card card-proyecto';
  tarjeta.innerHTML = `
    ${item.imagen ? `<span class="card-img" style="background-image:url('${item.imagen}')"></span>` : ''}
    <span class="card-title">${escaparHTML(item.titulo)}</span>
    ${item.descripcion ? `<span class="card-summary">${escaparHTML(item.descripcion)}</span>` : ''}
  `;
  tarjeta.addEventListener('click', () => abrirModal(item));
  return tarjeta;
}

function crearTarjetaPublicacion(item) {
  const tarjeta = document.createElement('button');
  tarjeta.type = 'button';
  tarjeta.className = 'card card-publicacion';
  tarjeta.innerHTML = `
    ${item.imagen ? `<span class="card-img" style="background-image:url('${item.imagen}')"></span>` : ''}
    <span class="card-body">
      <span class="card-title">${escaparHTML(item.titulo)}</span>
      ${item.descripcion ? `<span class="card-summary">${escaparHTML(item.descripcion)}</span>` : ''}
    </span>
  `;
  tarjeta.addEventListener('click', () => abrirModal(item));
  return tarjeta;
}

let modalOverlay;
let modalBox;
let shareOverlay;
let shareCopyBtn;
let shareLinkInput;
let shareCopied;

function abrirModal(item) {
  modalBox.innerHTML = `
    <button class="modal-close" id="modal-close" aria-label="Cerrar" type="button">&times;</button>
    ${item.imagen ? `<img class="modal-img" src="${item.imagen}" alt="${escaparHTML(item.titulo)}">` : ''}
    <span class="modal-tag">${escaparHTML(item.tipo)}</span>
    <h3>${escaparHTML(item.titulo)}</h3>
    ${(item.descripcion || item.contenido) ? `<p>${escaparHTML(item.descripcion || item.contenido)}</p>` : ''}
    ${item.enlace ? `<a class="modal-link" href="${item.enlace}" target="_blank" rel="noopener">Ver más</a>` : ''}
  `;
  modalOverlay.classList.add('is-open');
  document.body.classList.add('modal-open');
  document.getElementById('modal-close').addEventListener('click', cerrarModal);
}

function cerrarModal() {
  modalOverlay.classList.remove('is-open');
  document.body.classList.remove('modal-open');
}

function abrirShare() {
  shareOverlay.classList.add('is-open');
  document.body.classList.add('modal-open');
}

function cerrarShare() {
  shareOverlay.classList.remove('is-open');
  document.body.classList.remove('modal-open');
}

async function copiarLinkPagina() {
  const enlace = shareLinkInput.value;

  try {
    await navigator.clipboard.writeText(enlace);
  } catch (error) {
    // Respaldo para navegadores sin soporte de Clipboard API
    shareLinkInput.select();
    shareLinkInput.setSelectionRange(0, enlace.length);
    document.execCommand('copy');
  }

  shareCopied.textContent = '¡Enlace copiado!';
  setTimeout(() => {
    shareCopied.textContent = '';
  }, 2000);
}

async function cargarContenidoDinamico() {
  const grid = document.getElementById('proyectos-grid');
  const lista = document.getElementById('publicaciones-list');
  if (!grid || !lista) return;

  try {
    const filas = await obtenerFilasDeLaHoja();
    const { proyectos, publicaciones } = clasificarFilas(filas);

    grid.innerHTML = '';
    if (proyectos.length === 0) {
      grid.innerHTML = '<p class="cards-empty">Aún no hay proyectos publicados.</p>';
    } else {
      proyectos.forEach((item) => grid.appendChild(crearTarjetaProyecto(item)));
    }

    lista.innerHTML = '';
    if (publicaciones.length === 0) {
      lista.innerHTML = '<p class="cards-empty">Aún no hay publicaciones.</p>';
    } else {
      publicaciones.forEach((item) => lista.appendChild(crearTarjetaPublicacion(item)));
    }
  } catch (error) {
    console.error('No se pudo leer la hoja de Google Sheets:', error);
    grid.innerHTML = '<p class="cards-empty">No se pudo cargar la información. Revisa la conexión con Google Sheets.</p>';
    lista.innerHTML = '';
  }
}

document.addEventListener('DOMContentLoaded', () => {

  // --- Modal / submenú de tarjetas ---
  modalOverlay = document.getElementById('modal-overlay');
  modalBox = document.getElementById('modal-box');

  if (modalOverlay) {
    modalOverlay.addEventListener('click', (evento) => {
      if (evento.target === modalOverlay) cerrarModal();
    });
  }

  // --- Submenú de Compartir (link + QR) ---
  shareOverlay = document.getElementById('share-overlay');
  shareCopyBtn = document.getElementById('share-copy-btn');
  shareLinkInput = document.getElementById('share-link-input');
  shareCopied = document.getElementById('share-copied');
  const shareOpenBtn = document.getElementById('share-open-btn');
  const shareCloseBtn = document.getElementById('share-close');

  if (shareOpenBtn) {
    shareOpenBtn.addEventListener('click', abrirShare);
  }

  if (shareCloseBtn) {
    shareCloseBtn.addEventListener('click', cerrarShare);
  }

  if (shareOverlay) {
    shareOverlay.addEventListener('click', (evento) => {
      if (evento.target === shareOverlay) cerrarShare();
    });
  }

  if (shareCopyBtn) {
    shareCopyBtn.addEventListener('click', copiarLinkPagina);
  }

  document.addEventListener('keydown', (evento) => {
    if (evento.key === 'Escape') {
      cerrarModal();
      cerrarShare();
    }
  });

  // --- Tarjetas dinámicas de Proyectos y Publicaciones ---
  cargarContenidoDinamico();

  // --- Navegación: solo muestra la sección del botón presionado ---
  const navButtons = document.querySelectorAll('.nav-btn');
  const allSections = document.querySelectorAll('.content-section');

  navButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const target = document.getElementById(targetId);
      if (!target) return;

      allSections.forEach((seccion) => seccion.classList.remove('is-active'));
      target.classList.add('is-active');

      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  // --- Respaldo visual si aún no se coloca la imagen de banner ---
  const bannerImg = document.getElementById('banner-img');
  const banner = bannerImg ? bannerImg.closest('.banner') : null;

  if (bannerImg && banner) {
    bannerImg.addEventListener('error', () => {
      bannerImg.classList.add('is-broken');
      banner.classList.add('show-fallback');
    });
  }

  // --- Respaldo simple si falta la imagen de perfil ---
  const profileImg = document.getElementById('profile-img');
  if (profileImg) {
    profileImg.addEventListener('error', () => {
      profileImg.style.display = 'none';
    });
  }

});
