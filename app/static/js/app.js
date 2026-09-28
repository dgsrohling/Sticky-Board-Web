/**
 * Sticky Board — lógica do frontend.
 * JavaScript puro + Fetch API, sem frameworks.
 */
'use strict';

// ===== Constantes =====
const API_URL = '/api/notes';
const SAVE_DEBOUNCE_MS = 700;   // Intervalo do salvamento automático após digitação
const MIN_W = 180;              // Largura mínima da nota
const MIN_H = 150;              // Altura mínima da nota

const COLORS = ['yellow', 'blue', 'green', 'pink', 'orange', 'purple', 'gray'];

// ===== Estado =====
const notes = new Map();        // id -> dados da nota (espelho do banco)
const noteEls = new Map();      // id -> elemento DOM da nota
const saveTimers = new Map();   // id -> timer de debounce
let topZ = 1;                   // Maior z-index em uso

// ===== Elementos =====
const board = document.getElementById('board');
const searchInput = document.getElementById('search-input');
const btnNewNote = document.getElementById('btn-new-note');
const btnOrganize = document.getElementById('btn-organize');
const btnTheme = document.getElementById('btn-theme');

// ===== Utilidades =====
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function scheduleSave(id) {
  clearTimeout(saveTimers.get(id));
  saveTimers.set(id, setTimeout(() => {
    saveTimers.delete(id);
    saveNote(id);
  }, SAVE_DEBOUNCE_MS));
}

async function apiRequest(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    let msg = `Erro ${res.status}`;
    try {
      const data = await res.json();
      if (data && data.error) msg = data.error;
    } catch (_) { /* resposta sem JSON */ }
    throw new Error(msg);
  }
  return res.json();
}

// ===== Renderização =====
function createNoteElement(note) {
  const el = document.createElement('article');
  el.className = 'note';
  el.dataset.id = note.id;
  el.dataset.color = note.color;
  el.style.left = note.position_x + 'px';
  el.style.top = note.position_y + 'px';
  el.style.width = note.width + 'px';
  el.style.height = note.height + 'px';
  el.style.zIndex = note.z_index;

  el.innerHTML = `
    <div class="note-toolbar">
      <button class="note-btn note-btn-color" title="Cor">🎨</button>
      <button class="note-btn note-btn-delete" title="Excluir nota">×</button>
    </div>
    <div class="color-picker hidden"></div>
    <h3 class="note-title" contenteditable="true" spellcheck="false">${escapeHtml(note.title)}</h3>
    <div class="note-content" contenteditable="true" spellcheck="false"
         data-placeholder="Digite sua nota...">${escapeHtml(note.content)}</div>
    <div class="note-resize-handle" title="Redimensionar"></div>
  `;

  // --- Seletor de cores ---
  const picker = el.querySelector('.color-picker');
  COLORS.forEach((c) => {
    const swatch = document.createElement('button');
    swatch.className = 'color-swatch' + (c === note.color ? ' active' : '');
    swatch.dataset.color = c;
    swatch.title = c;
    swatch.addEventListener('click', (e) => {
      e.stopPropagation();
      el.dataset.color = c;
      picker.querySelectorAll('.color-swatch').forEach((s) =>
        s.classList.toggle('active', s.dataset.color === c)
      );
      picker.classList.add('hidden');
      patchNote(note.id, { color: c });
    });
    picker.appendChild(swatch);
  });

  // --- Eventos ---
  el.addEventListener('pointerdown', () => bringToFront(note.id));
  el.querySelector('.note-btn-color').addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    picker.classList.toggle('hidden');
  });
  el.querySelector('.note-btn-delete').addEventListener('click', (e) => {
    e.stopPropagation();
    deleteNote(note.id);
  });
  el.querySelector('.note-btn-delete').addEventListener('pointerdown', (e) => e.stopPropagation());
  el.querySelector('.note-resize-handle').addEventListener('pointerdown', (e) => startResize(e, note.id));

  // --- Edição com debounce ---
  const titleEl = el.querySelector('.note-title');
  const contentEl = el.querySelector('.note-content');
  titleEl.addEventListener('input', () => scheduleSave(note.id));
  contentEl.addEventListener('input', () => scheduleSave(note.id));
  titleEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); titleEl.blur(); }
  });
  contentEl.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') contentEl.blur();
  });

  // --- Arraste ---
  el.addEventListener('pointerdown', (e) => {
    // Ignora cliques em botões, alça de redimensionamento e áreas editáveis
    if (e.target.closest('.note-btn, .color-picker, .note-resize-handle, [contenteditable]')) return;
    startDrag(e, note.id);
  });

  return el;
}

function renderNote(note) {
  let el = noteEls.get(note.id);
  if (!el) {
    el = createNoteElement(note);
    noteEls.set(note.id, el);
    board.appendChild(el);
  }
  notes.set(note.id, { ...note });
  return el;
}

function removeNoteElement(id) {
  const el = noteEls.get(id);
  if (el) {
    el.remove();
    noteEls.delete(id);
  }
  notes.delete(id);
  clearTimeout(saveTimers.get(id));
  saveTimers.delete(id);
  clearTimeout(saveTimers.get(id + ':z'));
  saveTimers.delete(id + ':z');
}

// ===== Comunicação com o backend =====
async function loadNotes() {
  try {
    const list = await apiRequest(API_URL);
    list.forEach(renderNote);
    topZ = list.reduce((max, n) => Math.max(max, n.z_index), 0);
  } catch (err) {
    console.error('Falha ao carregar notas:', err);
    alert('Não foi possível carregar as notas. Recarregue a página.');
  }
}

async function createNote() {
  try {
    // Posição com pequeno deslocamento para notas novas não ficarem empilhadas
    const offset = (notes.size % 8) * 24;
    const payload = {
      title: 'Nova nota',
      content: '',
      color: 'yellow',
      position_x: 40 + offset,
      position_y: 40 + offset,
      width: 240,
      height: 220,
      z_index: ++topZ,
    };
    const note = await apiRequest(API_URL, { method: 'POST', body: JSON.stringify(payload) });
    renderNote(note);
    bringToFront(note.id);
    // Foca o conteúdo para o usuário começar a digitar imediatamente
    noteEls.get(note.id).querySelector('.note-content').focus();
  } catch (err) {
    console.error('Falha ao criar nota:', err);
    alert('Não foi possível criar a nota.');
  }
}

/**
 * Envia ao backend apenas os campos alterados (PATCH parcial via PUT).
 * Lê os valores atuais dos elementos DOM.
 */
function saveNote(id) {
  const el = noteEls.get(id);
  if (!el) return;
  const title = el.querySelector('.note-title').textContent.trim().slice(0, 150);
  const content = el.querySelector('.note-content').innerText.slice(0, 10000);
  patchNote(id, { title, content });
}

/**
 * PATCH genérico: envia só os campos informados e atualiza o espelho local.
 */
async function patchNote(id, fields) {
  try {
    const updated = await apiRequest(`${API_URL}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(fields),
    });
    notes.set(id, updated);
  } catch (err) {
    console.error('Falha ao salvar nota:', err);
    // Silencioso: evita interromper o usuário a cada falha de rede momentânea
  }
}

async function deleteNote(id) {
  if (!confirm('Excluir esta nota?')) return;
  try {
    await apiRequest(`${API_URL}/${id}`, { method: 'DELETE' });
    removeNoteElement(id);
  } catch (err) {
    console.error('Falha ao excluir nota:', err);
    alert('Não foi possível excluir a nota.');
  }
}

// ===== Arrastar =====
function startDrag(e, id) {
  const el = noteEls.get(id);
  if (!el) return;
  e.preventDefault();
  el.classList.add('dragging');
  bringToFront(id);

  const startX = e.clientX;
  const startY = e.clientY;
  const origX = parseInt(el.style.left, 10) || 0;
  const origY = parseInt(el.style.top, 10) || 0;

  function onMove(ev) {
    const nx = origX + (ev.clientX - startX);
    const ny = origY + (ev.clientY - startY);
    el.style.left = Math.max(0, nx) + 'px';
    el.style.top = Math.max(0, ny) + 'px';
  }

  function onUp() {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    el.classList.remove('dragging');
    const finalX = parseInt(el.style.left, 10);
    const finalY = parseInt(el.style.top, 10);
    patchNote(id, {
      position_x: finalX,
      position_y: finalY,
      z_index: parseInt(el.style.zIndex, 10) || 1,
    });
  }

  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
}

// ===== Redimensionar =====
function startResize(e, id) {
  e.preventDefault();
  e.stopPropagation();
  const el = noteEls.get(id);
  if (!el) return;
  bringToFront(id);

  const startX = e.clientX;
  const startY = e.clientY;
  const origW = el.offsetWidth;
  const origH = el.offsetHeight;

  function onMove(ev) {
    const w = Math.max(MIN_W, origW + (ev.clientX - startX));
    const h = Math.max(MIN_H, origH + (ev.clientY - startY));
    el.style.width = w + 'px';
    el.style.height = h + 'px';
  }

  function onUp() {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    patchNote(id, {
      width: el.offsetWidth,
      height: el.offsetHeight,
    });
  }

  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
}

// ===== Trazer para frente (z-index) =====
function bringToFront(id) {
  const el = noteEls.get(id);
  if (!el) return;
  const current = parseInt(el.style.zIndex, 10) || 0;
  if (current < topZ) {
    el.style.zIndex = ++topZ;
    // Persiste o z-index discretamente (opcional, mantém ordem após refresh)
    clearTimeout(saveTimers.get(id + ':z'));
    saveTimers.set(id + ':z', setTimeout(() => {
      saveTimers.delete(id + ':z');
      patchNote(id, { z_index: el.style.zIndex });
    }, 400));
  }
}

// ===== Pesquisa (frontend, em tempo real) =====
function filterNotes(query) {
  const q = query.trim().toLowerCase();
  noteEls.forEach((el, id) => {
    const note = notes.get(id);
    if (!note) return;
    const match = !q ||
      note.title.toLowerCase().includes(q) ||
      note.content.toLowerCase().includes(q);
    el.style.display = match ? '' : 'none';
  });
}

// ===== Organizar em grade =====
function organizeNotes() {
  const visible = [...noteEls.entries()].filter(([id]) => {
    const el = noteEls.get(id);
    return el.style.display !== 'none';
  });
  if (visible.length === 0) return;

  const margin = 24;
  // Usa a maior largura/altura entre as notas visíveis para calcular a grade
  const cellW = Math.max(...visible.map(([, el]) => el.offsetWidth)) + margin;
  const cellH = Math.max(...visible.map(([, el]) => el.offsetHeight)) + margin;
  const cols = Math.max(1, Math.floor((board.clientWidth - margin) / cellW));

  visible.forEach(([id, el], i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = margin + col * cellW;
    const y = margin + row * cellH;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    patchNote(id, { position_x: x, position_y: y });
  });
}

// ===== Modo escuro =====
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  btnTheme.textContent = theme === 'dark' ? '☀️' : '🌙';
  localStorage.setItem('sticky-theme', theme);
}

function initTheme() {
  const saved = localStorage.getItem('sticky-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(saved || (prefersDark ? 'dark' : 'light'));
}

// ===== Inicialização =====
btnNewNote.addEventListener('click', createNote);
btnOrganize.addEventListener('click', organizeNotes);
btnTheme.addEventListener('click', () => {
  const isDark = document.documentElement.dataset.theme === 'dark';
  applyTheme(isDark ? 'light' : 'dark');
});
searchInput.addEventListener('input', () => filterNotes(searchInput.value));

// Fecha o seletor de cores ao clicar fora
document.addEventListener('pointerdown', (e) => {
  if (!e.target.closest('.color-picker') && !e.target.closest('.note-btn-color')) {
    document.querySelectorAll('.color-picker').forEach((p) => p.classList.add('hidden'));
  }
});

initTheme();
loadNotes();
