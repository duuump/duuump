// ============================================================
// Duuump Admin - frontend (CRUD inspiracji)
// ============================================================

const $ = (id) => document.getElementById(id);
const $$ = (sel, root = document) => root.querySelector(sel);

// ============================================================
// FORM: dodawanie
// ============================================================
const form = $('form');
const drop = $('drop');
const fileInput = $('file');
const dropContent = $('dropContent');
const previewContent = $('previewContent');
const preview = $('preview');
const previewName = $('previewName');
const removeFileBtn = $('removeFile');
const submitBtn = $('submit');
const submitLabel = document.querySelector('.submit-label');
const submitSpinner = document.querySelector('.submit-spinner');
const status = $('status');

// URL input elements
const urlInput = $('urlInput');
const loadUrlBtn = $('loadUrlBtn');
const urlStatus = $('urlStatus');

let selectedFile = null;
let urlUploadMode = false; // true = using URL instead of file
let uploadedUrl = null;    // Cloudinary URL from URL upload

function setFile(file) {
  if (!file) return;
  if (!file.type.startsWith('image/')) return showStatus('error', 'To nie jest obrazek.');
  if (file.size > 25 * 1024 * 1024) return showStatus('error', 'Plik wiekszy niz 25 MB.');
  selectedFile = file;
  hideStatus();
  const reader = new FileReader();
  reader.onload = (e) => {
    preview.src = e.target.result;
    previewName.textContent = file.name;
    dropContent.hidden = true;
    previewContent.hidden = false;
    submitBtn.disabled = false;
  };
  reader.readAsDataURL(file);
}

function clearFile() {
  selectedFile = null;
  urlUploadMode = false;
  uploadedUrl = null;
  fileInput.value = '';
  preview.src = '';
  urlInput.value = '';
  dropContent.hidden = false;
  previewContent.hidden = true;
  submitBtn.disabled = true;
  hideUrlStatus();
}

// URL upload handler
async function loadFromUrl() {
  const url = urlInput.value.trim();
  if (!url) return showUrlStatus('error', 'Wklej URL obrazka');

  showUrlStatus('', 'Pobieranie obrazka...');
  loadUrlBtn.disabled = true;

  try {
    const res = await fetch('/api/upload-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    // Success - show preview with the Cloudinary URL
    urlUploadMode = true;
    uploadedUrl = data.url;
    preview.src = data.url;
    previewName.textContent = 'Z URL: ' + url.split('/').pop().split('?')[0].slice(0, 30);
    dropContent.hidden = true;
    previewContent.hidden = false;
    submitBtn.disabled = false;
    showUrlStatus('success', 'Gotowe');

  } catch (err) {
    showUrlStatus('error', err.message);
  } finally {
    loadUrlBtn.disabled = false;
  }
}

function showUrlStatus(type, text) {
  urlStatus.className = 'url-status ' + type;
  urlStatus.textContent = text;
  urlStatus.hidden = !text;
}

function hideUrlStatus() {
  urlStatus.hidden = true;
}

// URL input: Enter key to submit
urlInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    loadFromUrl();
  }
});

// URL button click
loadUrlBtn.addEventListener('click', loadFromUrl);

fileInput.addEventListener('change', (e) => e.target.files[0] && setFile(e.target.files[0]));
removeFileBtn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); clearFile(); });

['dragenter', 'dragover'].forEach((ev) =>
  drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('dragover'); })
);
['dragleave', 'drop'].forEach((ev) =>
  drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('dragover'); })
);
drop.addEventListener('drop', (e) => {
  const file = e.dataTransfer.files[0];
  if (file) setFile(file);
});

document.addEventListener('paste', (e) => {
  const items = e.clipboardData?.items;
  if (!items) return;
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      const file = item.getAsFile();
      if (file) { setFile(file); break; }
    }
  }
});

function showStatus(type, text) {
  status.className = `status ${type}`;
  status.textContent = text;
  status.hidden = false;
}
function hideStatus() { status.hidden = true; }

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!selectedFile && !urlUploadMode) return;

  submitBtn.disabled = true;
  submitLabel.hidden = true;
  submitSpinner.hidden = false;
  showStatus('loading', 'Zapisuję...');

  try {
    // Two try modes: file upload OR URL mode (already uploaded to Cloudinary)
    let res, data;

    if (urlUploadMode && uploadedUrl) {
      // URL mode: just add to JSON with the Cloudinary URL we already have
      res = await fetch('/api/add-from-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: uploadedUrl,
          caption: $('caption').value.trim(),
          author: $('author').value.trim(),
          authorUrl: $('authorUrl').value.trim(),
        }),
      });
      data = await res.json();
    } else {
      // File mode: upload file to Cloudinary and add to JSON
      const fd = new FormData();
      fd.append('image', selectedFile);
      fd.append('caption', $('caption').value.trim());
      fd.append('author', $('author').value.trim());
      fd.append('authorUrl', $('authorUrl').value.trim());
      res = await fetch('/api/add', { method: 'POST', body: fd });
      data = await res.json();
    }

    if (!res.ok) throw new Error(data.error || 'Nieznany blad');

    showStatus('success', 'Dodano! Strona zaktualizuje sie za ~1 min.');
    form.reset();
    clearFile();
    loadList(); // odswiez liste
  } catch (err) {
    showStatus('error', err.message);
  } finally {
    submitBtn.disabled = !selectedFile && !urlUploadMode;
    submitLabel.hidden = false;
    submitSpinner.hidden = true;
  }
});

// ============================================================
// LISTA: wczytywanie + render
// ============================================================
const listEl = $('list');
const listCountEl = $('listCount');
const listStatusEl = $('listStatus');
const itemTemplate = $('itemTemplate');
const editTemplate = $('editTemplate');

let items = []; // aktualna lista (kolejnosc wyswietlania, najnowsze pierwsze)

async function loadList() {
  listEl.innerHTML = '<li class="list-loading">Ladowanie...</li>';
  try {
    const res = await fetch('/api/list');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    items = data.items;
    renderList();
  } catch (err) {
    listEl.innerHTML = '';
    listStatus('error', `Nie udalo sie wczytac listy: ${err.message}`);
  }
}

function renderList() {
  listEl.innerHTML = '';
  listCountEl.textContent = `(${items.length})`;
  if (items.length === 0) {
    listEl.innerHTML = '<li class="list-loading">Brak wpisow</li>';
    return;
  }
  for (const item of items) {
    listEl.appendChild(renderItem(item));
  }
}

function renderItem(item) {
  const li = itemTemplate.content.firstElementChild.cloneNode(true);
  li.dataset.url = item.url;
  $$('.item-thumb', li).src = item.url;
  $$('.item-thumb', li).alt = item.caption || '';
  $$('.item-caption', li).textContent = item.caption || '';
  const authorEl = $$('.item-author', li);
  if (item.author) {
    authorEl.textContent = item.author;
  } else {
    authorEl.textContent = '';
  }

  $$('.item-edit', li).addEventListener('click', () => enterEditMode(li, item));
  $$('.item-delete', li).addEventListener('click', () => deleteItem(li, item));

  attachDragHandlers(li);
  return li;
}

function listStatus(type, text) {
  listStatusEl.className = `status ${type}`;
  listStatusEl.textContent = text;
  listStatusEl.hidden = false;
  // Auto-hide success/error po 4s
  if (type !== 'loading') {
    setTimeout(() => { listStatusEl.hidden = true; }, 4000);
  }
}
function hideListStatus() { listStatusEl.hidden = true; }

// ============================================================
// EDIT
// ============================================================
function enterEditMode(li, item) {
  const editForm = editTemplate.content.firstElementChild.cloneNode(true);
  $$('.item-thumb', editForm).src = item.url;
  $$('input[name="caption"]', editForm).value = item.caption || '';
  $$('input[name="author"]', editForm).value = item.author || '';
  $$('input[name="authorUrl"]', editForm).value = item.authorUrl || '';

  editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    await saveEdit(li, item, editForm);
  });
  $$('.item-cancel', editForm).addEventListener('click', () => {
    li.replaceWith(renderItem(item));
  });

  li.replaceWith(editForm);
  $$('input[name="caption"]', editForm).focus();
}

async function saveEdit(li, item, editForm) {
  const payload = {
    url: item.url,
    caption: $$('input[name="caption"]', editForm).value,
    author: $$('input[name="author"]', editForm).value,
    authorUrl: $$('input[name="authorUrl"]', editForm).value,
  };

  listStatus('loading', 'Zapisuje zmiany...');
  try {
    const res = await fetch('/api/update', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    // Zaktualizuj lokalna kopie i przerysuj
    const idx = items.findIndex((i) => i.url === item.url);
    if (idx !== -1) items[idx] = data.entry;
    renderList();
    listStatus('success', 'Zapisano. Strona zaktualizuje sie za ~1 min.');
  } catch (err) {
    listStatus('error', `Blad: ${err.message}`);
  }
}

// ============================================================
// DELETE
// ============================================================
async function deleteItem(li, item) {
  const desc = item.caption || item.author || 'ten wpis';
  const confirmed = confirm(`Usunac "${desc}"?\n\nObrazek zostanie tez usuniety z Cloudinary.`);
  if (!confirmed) return;

  listStatus('loading', 'Usuwam...');
  try {
    const res = await fetch('/api/delete', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: item.url, deleteFile: true }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    items = items.filter((i) => i.url !== item.url);
    renderList();
    listStatus('success', 'Usunieto. Strona zaktualizuje sie za ~1 min.');
  } catch (err) {
    listStatus('error', `Blad: ${err.message}`);
  }
}

// ============================================================
// DRAG & DROP REORDER
// ============================================================
let draggedEl = null;

function attachDragHandlers(li) {
  li.addEventListener('dragstart', (e) => {
    draggedEl = li;
    li.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    // Wymagane przez Firefox
    e.dataTransfer.setData('text/plain', li.dataset.url);
  });

  li.addEventListener('dragend', () => {
    li.classList.remove('dragging');
    document.querySelectorAll('.item').forEach((el) => {
      el.classList.remove('drag-over-top', 'drag-over-bottom');
    });
    draggedEl = null;
  });

  li.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (!draggedEl || draggedEl === li) return;
    e.dataTransfer.dropEffect = 'move';

    const rect = li.getBoundingClientRect();
    const isAbove = e.clientY < rect.top + rect.height / 2;
    li.classList.toggle('drag-over-top', isAbove);
    li.classList.toggle('drag-over-bottom', !isAbove);
  });

  li.addEventListener('dragleave', () => {
    li.classList.remove('drag-over-top', 'drag-over-bottom');
  });

  li.addEventListener('drop', async (e) => {
    e.preventDefault();
    if (!draggedEl || draggedEl === li) return;

    const rect = li.getBoundingClientRect();
    const isAbove = e.clientY < rect.top + rect.height / 2;
    li.classList.remove('drag-over-top', 'drag-over-bottom');

    if (isAbove) listEl.insertBefore(draggedEl, li);
    else listEl.insertBefore(draggedEl, li.nextSibling);

    await persistOrder();
  });
}

async function persistOrder() {
  // Wyczytaj nowa kolejnosc z DOM
  const urls = [...listEl.querySelectorAll('.item')].map((el) => el.dataset.url);
  // Zaktualizuj lokalna kopie
  items = urls.map((url) => items.find((i) => i.url === url)).filter(Boolean);

  listStatus('loading', 'Zapisuje kolejnosc...');
  try {
    const res = await fetch('/api/reorder', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urls }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    if (data.changed) {
      listStatus('success', 'Kolejnosc zapisana. Strona zaktualizuje sie za ~1 min.');
    } else {
      hideListStatus();
    }
  } catch (err) {
    listStatus('error', `Blad: ${err.message}`);
    // Cofnij - przeladuj ze swiezego stanu serwera
    loadList();
  }
}

// ============================================================
// Start
// ============================================================
loadList();
