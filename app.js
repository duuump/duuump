// ============================================================
// Duuump — prosta strona z inspiracjami w stylu FFFFound
// ============================================================
//
// Co robi ten skrypt?
// 1. Wczytuje listę inspiracji z pliku inspirations.json
// 2. Renderuje je w siatce (grid)
// 3. Po kliknięciu w obrazek otwiera "lightbox" (powiększenie)
//
// Kolejność wpisów: NAJNOWSZE NA GÓRZE (odwracamy listę).
// ============================================================

const grid = document.getElementById('grid');
const collageCanvas = document.getElementById('collage');
const frameBody = document.getElementById('frameBody');
const emptyMessage = document.getElementById('empty');
const modal = document.getElementById('modal');
const modalImg = document.getElementById('modalImg');
const modalCaption = document.getElementById('modalCaption');
const modalAuthor = document.getElementById('modalAuthor');
const modalClose = document.getElementById('modalClose');

// ---------- Przełącznik trybu wyświetlania ----------
const VIEW_MODE_KEY = 'duuump-view-mode';
const viewToggle = document.getElementById('viewToggle');
const viewButtons = viewToggle.querySelectorAll('.view-btn');

let currentMode = 'collage';

// Deklaracje globalne — muszą być przed setViewMode (wywoływanym synchronicznie przy starcie)
let currentCategory = 'all';
let allItems = [];
let categories = [];

function setViewMode(mode, persist = true) {
  currentMode = mode;

  if (mode === 'collage') {
    grid.hidden = true;
    collageCanvas.hidden = false;
    frameBody.classList.add('mode-collage');
    grid.classList.remove('mode-single', 'mode-large', 'mode-small');
    if (allItems.length > 0) renderCollage(getFilteredItems());
  } else {
    grid.hidden = false;
    collageCanvas.hidden = true;
    frameBody.classList.remove('mode-collage');
    grid.classList.remove('mode-single', 'mode-large', 'mode-small');
    grid.classList.add('mode-' + mode);
    if (allItems.length > 0) renderGrid(allItems);
  }

  // Zapisz w localStorage tylko gdy user kliknął
  if (persist) {
    localStorage.setItem(VIEW_MODE_KEY, mode);
  }

  // Aktualizuj aktywny przycisk
  viewButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });
}

// Obsługa kliknięcia przycisków (zapisujemy preferencję)
viewButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    setViewMode(btn.dataset.mode, true);
  });
});

// Na mobile (≤480px) zawsze wymuszamy tryb 'single' — bez zapisu do localStorage
// Na desktop przywracamy zapamiętany tryb (domyślnie 'collage')
const isMobile = window.matchMedia('(max-width: 480px)').matches;
if (isMobile) {
  setViewMode('single', false);
} else {
  setViewMode(localStorage.getItem(VIEW_MODE_KEY) || 'collage', false);
}

// ---------- Dark / light mode ----------
const THEME_KEY = 'duuump-theme';
const themeToggle = document.getElementById('themeToggle');

function applyTheme(theme) {
  if (theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    themeToggle.textContent = 'dark';
  } else {
    document.documentElement.removeAttribute('data-theme');
    themeToggle.textContent = 'light';
  }
}

const savedTheme = localStorage.getItem(THEME_KEY) || 'light';
applyTheme(savedTheme);

themeToggle.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  localStorage.setItem(THEME_KEY, next);
});

// ---------- Filtrowanie po kategoriach ----------
const categoryBar = document.getElementById('categoryBar');

function getFilteredItems() {
  if (currentCategory === 'all') return allItems;
  return allItems.filter(item => (item.category || 'other') === currentCategory);
}

// Ładuj kategorie z pliku konfiguracyjnego
async function loadCategories() {
  try {
    const res = await fetch('categories.json');
    categories = await res.json();
    renderCategoryButtons();
  } catch (e) {
    console.error('Nie udało się wczytać kategorii:', e);
  }
}

// Generuj przyciski kategorii
function renderCategoryButtons() {
  // Przycisk "all" - zawsze na początku
  const allBtn = document.createElement('button');
  allBtn.type = 'button';
  allBtn.className = 'cat-btn active';
  allBtn.dataset.category = 'all';
  allBtn.textContent = '[ all ]';
  categoryBar.appendChild(allBtn);

  // Przyciski z konfiguracji
  categories.forEach((cat) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cat-btn';
    btn.dataset.category = cat.id;
    btn.textContent = cat.label;
    categoryBar.appendChild(btn);
  });

  // Obsługa kliknięć
  const catButtons = categoryBar.querySelectorAll('.cat-btn');
  catButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      currentCategory = btn.dataset.category;
      catButtons.forEach((b) => b.classList.toggle('active', b === btn));
      renderCurrentView();
    });
  });
}

// ---------- Wczytywanie inspiracji ----------
async function loadInspirations() {
  try {
    // cache: 'no-cache' — wymusza pobranie świeżego pliku JSON
    const response = await fetch('inspirations.json', { cache: 'no-cache' });
    if (!response.ok) {
      throw new Error('Nie udało się wczytać inspirations.json');
    }
    const data = await response.json();
    allItems = data;
    renderCurrentView();
  } catch (error) {
    console.error(error);
    emptyMessage.textContent = 'Wystąpił błąd przy wczytywaniu inspiracji.';
    emptyMessage.hidden = false;
  }
}

// ---------- Dispatcher: siatka lub kolaż ----------
function renderCurrentView() {
  if (currentMode === 'collage') {
    renderCollage(getFilteredItems());
  } else {
    renderGrid(allItems);
  }
}

// ---------- Kolaż ----------
const COLLAGE_PALETTE = [
  '#e8c547', '#c4aa7a', '#7a8fa6', '#b5c4b1',
  '#c97d6e', '#d4a5b5', '#8ba3c7', '#a8b89a',
  '#e8c0b0', '#6b8c6b', '#c8b4a0', '#9aafb8',
];

function renderCollage(items) {
  collageCanvas.innerHTML = '';
  emptyMessage.hidden = true;

  if (!items || items.length === 0) {
    emptyMessage.hidden = false;
    return;
  }

  const shuffled = [...items].sort(() => Math.random() - 0.5);
  const count = Math.min(shuffled.length, 16);
  const selected = shuffled.slice(0, count);

  // Kolorowe prostokąty w tle
  const blockCount = 2 + Math.floor(Math.random() * 4);
  for (let i = 0; i < blockCount; i++) {
    const block = document.createElement('div');
    block.className = 'collage-block';
    const isPortrait = Math.random() > 0.4;
    const w = isPortrait ? (4 + Math.random() * 10) : (15 + Math.random() * 30);
    const h = isPortrait ? (25 + Math.random() * 55) : (4 + Math.random() * 12);
    const x = Math.random() * 88;
    const y = Math.random() * 85;
    const color = COLLAGE_PALETTE[Math.floor(Math.random() * COLLAGE_PALETTE.length)];
    const opacity = 0.55 + Math.random() * 0.45;
    const z = Math.floor(Math.random() * 8);
    block.style.cssText = `width:${w}%;height:${h}%;left:${x}%;top:${y}%;background:${color};opacity:${opacity};z-index:${z};`;
    collageCanvas.appendChild(block);
  }

  // Zdjęcia — losowe pozycje, trzy klasy rozmiarów
  selected.forEach((item, i) => {
    const r = Math.random();
    let w;
    if (r < 0.25)      w = 10 + Math.random() * 8;   // mały: 10–18%
    else if (r < 0.65) w = 20 + Math.random() * 14;  // średni: 20–34%
    else               w = 32 + Math.random() * 22;  // duży: 32–54%

    // Pozycja — może lekko wychodzić poza krawędź
    const x = -4 + Math.random() * 84;
    const y = -4 + Math.random() * 88;
    const rot = (Math.random() - 0.5) * 18; // –9° do +9°
    const z = 10 + i;

    const div = document.createElement('div');
    div.className = 'collage-item';
    div.style.cssText = `--r:${rot}deg;width:${w}%;left:${x}%;top:${y}%;transform:rotate(${rot}deg);z-index:${z};`;

    const img = document.createElement('img');
    img.src = item.url;
    img.alt = item.caption || '';
    img.loading = 'lazy';

    div.appendChild(img);
    div.addEventListener('click', () => openModal(item));
    collageCanvas.appendChild(div);
  });
}

// ---------- Renderowanie siatki ----------
function renderGrid(items) {
  // Wyczyść grid przed renderowaniem
  grid.innerHTML = '';
  emptyMessage.hidden = true;

  if (!Array.isArray(items) || items.length === 0) {
    emptyMessage.hidden = false;
    return;
  }

  // Filtrowanie po kategorii
  let filtered = items;
  if (currentCategory !== 'all') {
    filtered = items.filter(item => (item.category || 'other') === currentCategory);
  }

  if (filtered.length === 0) {
    emptyMessage.textContent = 'Brak inspiracji w tej kategorii.';
    emptyMessage.hidden = false;
    return;
  }

  // Odwracamy kolejność, żeby najnowsze (ostatnio dodane do JSON-a) były na górze
  const ordered = [...filtered].reverse();

  const fragment = document.createDocumentFragment();

  ordered.forEach((item) => {
    const card = createCard(item);
    if (card) fragment.appendChild(card);
  });

  grid.appendChild(fragment);
}

function createCard(item) {
  if (!item || !item.url) return null;

  const li = document.createElement('li');
  li.className = 'card';

  // Klikalny obrazek (otwiera modal)
  const button = document.createElement('button');
  button.className = 'card-image-wrapper';
  button.type = 'button';
  button.setAttribute('aria-label', 'Powiększ obraz');

  const img = document.createElement('img');
  img.src = item.url;
  img.alt = item.caption || '';
  img.loading = 'lazy';
  button.appendChild(img);

  button.addEventListener('click', () => openModal(item));
  li.appendChild(button);

  // Podpis
  if (item.caption) {
    const caption = document.createElement('p');
    caption.className = 'card-caption';
    caption.textContent = item.caption;
    li.appendChild(caption);
  }

  // Linia autora + daty (autor po lewej, data po prawej)
  if (item.author || item.date) {
    const meta = document.createElement('p');
    meta.className = 'card-meta';

    // Autor (lewa strona)
    const authorSpan = document.createElement('span');
    authorSpan.className = 'card-author';
    if (item.author) {
      if (item.authorUrl) {
        const a = document.createElement('a');
        a.href = item.authorUrl;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.textContent = item.author;
        authorSpan.appendChild(document.createTextNode('— '));
        authorSpan.appendChild(a);
      } else {
        authorSpan.textContent = '— ' + item.author;
      }
    }
    meta.appendChild(authorSpan);

    // Data (prawa strona)
    if (item.date) {
      const dateSpan = document.createElement('span');
      dateSpan.className = 'card-date';
      const dateStr = item.date.substring(0, 10);
      dateSpan.textContent = '[' + dateStr + ']';
      meta.appendChild(dateSpan);
    }

    li.appendChild(meta);
  }

  return li;
}

// ---------- Modal (lightbox) ----------
function openModal(item) {
  modalImg.src = item.url;
  modalImg.alt = item.caption || '';
  modalCaption.textContent = item.caption || '';
  modalAuthor.textContent = item.author ? '— ' + item.author : '';
  modal.hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  modal.hidden = true;
  modalImg.src = '';
  document.body.style.overflow = '';
}

modalClose.addEventListener('click', closeModal);
modal.addEventListener('click', (e) => {
  // Kliknięcie poza obraz — zamknij
  if (e.target === modal) closeModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !modal.hidden) closeModal();
});

// Start
loadCategories().then(() => loadInspirations());
