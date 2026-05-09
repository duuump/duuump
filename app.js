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

function setViewMode(mode, persist = true) {
  // Usuń wszystkie klasy trybów
  grid.classList.remove('mode-single', 'mode-large', 'mode-small');

  // Dodaj nową klasę
  grid.classList.add('mode-' + mode);

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
// Na desktop przywracamy zapamiętany tryb (domyślnie 'single')
const isMobile = window.matchMedia('(max-width: 480px)').matches;
if (isMobile) {
  setViewMode('single', false);
} else {
  setViewMode(localStorage.getItem(VIEW_MODE_KEY) || 'single', false);
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
    renderGrid(data);
  } catch (error) {
    console.error(error);
    emptyMessage.textContent = 'Wystąpił błąd przy wczytywaniu inspiracji.';
    emptyMessage.hidden = false;
  }
}

// ---------- Renderowanie siatki ----------
function renderGrid(items) {
  if (!Array.isArray(items) || items.length === 0) {
    emptyMessage.hidden = false;
    return;
  }

  // Odwracamy kolejność, żeby najnowsze (ostatnio dodane do JSON-a) były na górze
  const ordered = [...items].reverse();

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
loadInspirations();
