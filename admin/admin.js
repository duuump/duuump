// ============================================================
// Duuump Admin - frontend
// ============================================================

const $ = (id) => document.getElementById(id);

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

let selectedFile = null;

// ---------- File selection ----------
function setFile(file) {
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    showStatus('error', 'To nie jest obrazek.');
    return;
  }
  if (file.size > 25 * 1024 * 1024) {
    showStatus('error', 'Plik jest większy niż 25 MB.');
    return;
  }

  selectedFile = file;
  hideStatus();

  // Preview
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
  fileInput.value = '';
  preview.src = '';
  dropContent.hidden = false;
  previewContent.hidden = true;
  submitBtn.disabled = true;
}

// Click to choose
fileInput.addEventListener('change', (e) => {
  if (e.target.files[0]) setFile(e.target.files[0]);
});

removeFileBtn.addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();
  clearFile();
});

// Drag & drop
['dragenter', 'dragover'].forEach((ev) => {
  drop.addEventListener(ev, (e) => {
    e.preventDefault();
    drop.classList.add('dragover');
  });
});
['dragleave', 'drop'].forEach((ev) => {
  drop.addEventListener(ev, (e) => {
    e.preventDefault();
    drop.classList.remove('dragover');
  });
});

drop.addEventListener('drop', (e) => {
  const file = e.dataTransfer.files[0];
  if (file) setFile(file);
});

// Paste from clipboard (Cmd+V)
document.addEventListener('paste', (e) => {
  const items = e.clipboardData?.items;
  if (!items) return;
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      const file = item.getAsFile();
      if (file) {
        setFile(file);
        break;
      }
    }
  }
});

// ---------- Status helpers ----------
function showStatus(type, text) {
  status.className = `status ${type}`;
  status.textContent = text;
  status.hidden = false;
}

function hideStatus() {
  status.hidden = true;
}

// ---------- Submit ----------
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!selectedFile) return;

  // UI: loading
  submitBtn.disabled = true;
  submitLabel.hidden = true;
  submitSpinner.hidden = false;
  showStatus('loading', 'Wgrywam obrazek i aktualizuję stronę...');

  try {
    const formData = new FormData();
    formData.append('image', selectedFile);
    formData.append('caption', $('caption').value.trim());
    formData.append('author', $('author').value.trim());
    formData.append('authorUrl', $('authorUrl').value.trim());

    const response = await fetch('/api/add', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Wystąpił nieznany błąd');
    }

    showStatus(
      'success',
      `✓ Dodano! Strona zaktualizuje się za ~1 min: https://duuump.github.io/duuump/`
    );

    // Reset
    form.reset();
    clearFile();
  } catch (err) {
    showStatus('error', `✗ Błąd: ${err.message}`);
  } finally {
    submitBtn.disabled = !selectedFile;
    submitLabel.hidden = false;
    submitSpinner.hidden = true;
  }
});

// Domyślnie strona ładuje się z głównym widokiem (drop zone aktywny)
// Submit jest disabled dopóki nie wybierzesz pliku
