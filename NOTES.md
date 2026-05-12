# Notatki sesji — Duuump

## Co już mamy (gotowe)

- ✅ Strona w stylu FFFFound — HTML + CSS + JS bez frameworków
- ✅ Lightbox (klik w obrazek → powiększenie)
- ✅ Hosting obrazków: Cloudinary (konto: `dlbjcgteq`)
- ✅ Repozytorium GitHub: <https://github.com/duuump/duuump>
- ✅ Live: <https://duuump.github.io/duuump/>
- ✅ Aktualne dane w `inspirations.json` (6 wpisów)

## Konfiguracja środowiska

- Folder projektu: `/Users/jacekrudzki/Documents/opencode/duuuump`
- Git skonfigurowany: `duuump` / `rudzkirudzki@gmail.com`
- Homebrew zainstalowany
- GitHub CLI (`gh`) zainstalowany i zalogowany jako `duuump`

## Aktualny workflow dodawania nowej inspiracji

1. Wgranie obrazka na Cloudinary (manualnie przez stronę)
2. Skopiowanie Delivery URL
3. Edycja `inspirations.json` — dodanie obiektu na końcu listy
4. W terminalu:

   ```bash
   cd /Users/jacekrudzki/Documents/opencode/duuuump
   git add inspirations.json
   git commit -m "Add new inspiration"
   git push
   ```

## TODO — następna sesja: AUTOMATYZACJA

Cel: jednym ruchem dodawać obrazek (zamiast 4 kroków manualnych).

### Wybrana ścieżka: do ustalenia

Opcje omówione:

#### Opcja A — skrypt CLI (REKOMENDOWANY START)

Plik `add.sh` w katalogu projektu. Użycie:

```bash
./add.sh ~/Downloads/obrazek.jpg "Podpis" "Autor" "https://link-autora"
```

Skrypt sam:

1. Wgrywa obrazek na Cloudinary (przez Cloudinary API)
2. Dodaje wpis do `inspirations.json`
3. Robi `git add` + `commit` + `push`

**Co potrzebne do wdrożenia:**

- Cloudinary API credentials (Cloud name, API Key, API Secret)
  - znajdziesz w Cloudinary Console → Settings → API Keys
- Skrypt bash używający `curl` (do uploadu) + `jq` (do edycji JSON)
  - `jq` zainstalujemy przez `brew install jq`
- Zapisanie sekretów w pliku `.env` (dodanym do `.gitignore`!)

#### Opcja B — lokalny panel admina (WYGODNIEJSZY)

`admin.html` (nie publikowany na GitHub) z drag & drop:

- Pole drop dla obrazka
- Pola: caption, author, authorUrl
- Po kliknięciu "Dodaj" — JS w przeglądarce uploaduje na Cloudinary (przez signed upload),
  a backend (mały skrypt Node lub Python) updatuje JSON i pushuje do gita

**Co potrzebne:**

- Cloudinary unsigned upload preset (skonfigurowany w Cloudinary)
- Mały lokalny serwer (Node.js + Express, lub Python + Flask) — kilkadziesiąt linii kodu
- Działa tylko gdy włączysz serwer komendą `npm start` lub podobną

#### Opcja C — macOS Shortcut

Skrót w aplikacji Skróty (Shortcuts) — prawy klik na pliku w Finderze
→ "Dodaj do Duuump" → formularz → automatyzacja.

#### Opcja D — aplikacja menubar

Pełna aplikacja w pasku menu Maca (Swift / Electron). Najwięcej pracy.

### Plan na następną sesję (sugerowany)

1. Wybrać Opcję A lub B
2. Pobrać/wygenerować Cloudinary API credentials
3. Napisać skrypt
4. Przetestować na nowym obrazku
5. Dodać dokumentację do README

## Pomocne komendy do zapamiętania

```bash
# Wejść do folderu projektu
cd /Users/jacekrudzki/Documents/opencode/duuuump

# Lokalny serwer (do testów)
python3 -m http.server 8000

# Sprawdzić co Git widzi
git status

# Zapisać i wysłać zmiany
git add . && git commit -m "Update" && git push

# Status GitHub Pages (czy zbudowana)
gh api repos/duuump/duuump/pages/builds/latest --jq '.status'
```

## Walidacja JSON

Jeśli strona przestanie się ładować po edycji `inspirations.json`:

```bash
python3 -c "import json; json.load(open('inspirations.json')); print('OK')"
```

Lub wklej zawartość na <https://jsonlint.com>.

## Linki i adresy

- **Strona live:** <https://duuump.github.io/duuump/>
- **Repo GitHub:** <https://github.com/duuump/duuump>
- **Cloudinary Console:** <https://console.cloudinary.com>
- **Cloud name:** `dlbjcgteq`
