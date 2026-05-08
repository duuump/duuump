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

// Ustaw rok w stopce
document.getElementById('year').textContent = new Date().getFullYear();

// ============================================================
// Zegar na żywo (CET/CEST)
// ============================================================
const clockEl = document.getElementById('clock');

function updateClock() {
  const now = new Date();
  // Timezone: Europe/Warsaw (CET/CEST automatic)
  const options = {
    timeZone: 'Europe/Warsaw',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  };
  clockEl.textContent = now.toLocaleTimeString('pl-PL', options);
}
updateClock();
setInterval(updateClock, 1000);

// ============================================================
// Pogoda w Krakowie (Open-Meteo API - darmowe, bez klucza)
// ============================================================
const weatherEl = document.getElementById('weather');
const WEATHER_KRAKOW = { lat: 50.0647, lon: 19.9450 };

// Mapa kodów pogody Open-Meteo na ASCII ikony
const WEATHER_CODES = {
  0:  '( )',  // Clear sky - sun
  1:  '(:)',  // Mainly clear
  2:  '(:',   // Partly cloudy
  3:  '[=]',  // Overcast - cloud
  45: '~ ~',  // Fog
  48: '~ ~',  // Fog
  51:  '| |', // Drizzle
  53:  '| |', // Drizzle
  55:  '===', // Drizzle dense
  61:  "' \"'", // Rain
  63:  "' \"'", // Rain
  65:  '~~~~', // Rain heavy
  80:  "'' ', // Rain showers
  81:  ''' ', // Rain showers
  82:  '~~~~', // Rain showers violent
  95:  '/!\', // Thunderstorm
};

function isNightTime() {
  const hour = new Date().getHours();
  // Dzień: 6:00-20:00, Noc: reszta
  return hour < 6 || hour >= 20;
}

function getTimeOfDay() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return '[morning]';
  if (hour >= 12 && hour < 17) return '[noon]';
  if (hour >= 17 && hour < 20) return '[evening]';
  return '[night]';
}

async function loadWeather() {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${WEATHER_KRAKOW.lat}&longitude=${WEATHER_KRAKOW.lon}&current=temperature_2m,weather_code`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    const temp = Math.round(data.current.temperature_2m);
    const code = data.current.weather_code;
    const icon = WEATHER_CODES[code] || '[?]';

    const dayNight = isNightTime() ? '[night]' : getTimeOfDay();

    weatherEl.innerHTML = `<span class="weather-icon">${icon}</span><span class="weather-temp">${temp}°</span><span class="day-night">${dayNight}</span>`;
  } catch (e) {
    weatherEl.innerHTML = '<span class="weather-loading">[--]</span>';
  }
}

loadWeather();
// Odśwież pogodę co 10 minut
setInterval(loadWeather, 10 * 60 * 1000);

// ---------- Przełącznik trybu wyświetlania ----------
const VIEW_MODE_KEY = 'duuump-view-mode';
const viewToggle = document.getElementById('viewToggle');
const viewButtons = viewToggle.querySelectorAll('.view-btn');

function setViewMode(mode) {
  // Usuń wszystkie klasy trybów
  grid.classList.remove('mode-single', 'mode-large', 'mode-small');

  // Dodaj nową klasę
  grid.classList.add('mode-' + mode);

  // Zapisz w localStorage
  localStorage.setItem(VIEW_MODE_KEY, mode);

  // Aktualizuj aktywny przycisk
  viewButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });
}

// Obsługa kliknięcia przycisków
viewButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    setViewMode(btn.dataset.mode);
  });
});

// Przywróć zapamiętany tryb (domyślnie 'small' = ikony)
const savedMode = localStorage.getItem(VIEW_MODE_KEY) || 'small';
setViewMode(savedMode);

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

  // Autor (z opcjonalnym linkiem)
  if (item.author) {
    const author = document.createElement('p');
    author.className = 'card-author';

    if (item.authorUrl) {
      const a = document.createElement('a');
      a.href = item.authorUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = item.author;
      author.appendChild(document.createTextNode('— '));
      author.appendChild(a);
    } else {
      author.textContent = '— ' + item.author;
    }

    li.appendChild(author);
  }

  // Data dodania
  if (item.date) {
    const date = document.createElement('p');
    date.className = 'card-date';
    // Format: YYYY-MM-DD z Cloudinary timestamp
    const dateStr = item.date.substring(0, 10);
    date.textContent = '[' + dateStr + ']';
    li.appendChild(date);
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
