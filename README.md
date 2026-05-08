# Duuump

Prosta strona z inspiracjami w stylu FFFFound.

🌐 **Live:** <https://duuump.github.io/duuump/>

## Jak dodać nową inspirację?

### 1. Wgraj obrazek na Cloudinary

- Wejdź na <https://cloudinary.com>, zaloguj się
- Media Library → Upload → wybierz plik
- Skopiuj **Delivery URL** obrazka

### 2. Edytuj `inspirations.json`

Otwórz plik w edytorze i dodaj nowy obiekt **na końcu listy** (przed ostatnim `]`):

```json
,
{
  "url": "https://res.cloudinary.com/twoje-konto/image/upload/v123/obrazek.jpg",
  "caption": "Krótki opis inspiracji",
  "author": "Imię Nazwisko",
  "authorUrl": "https://example.com/autor"
}
```

**Pola:**

- `url` (wymagane) — link do obrazka z Cloudinary
- `caption` (opcjonalne) — krótki podpis
- `author` (opcjonalne) — autor / źródło
- `authorUrl` (opcjonalne) — link do profilu autora

**Pamiętaj o przecinku** po poprzednim obiekcie i o **braku przecinka** po ostatnim!

### 3. Wypchnij na GitHub

W terminalu:

```bash
cd /Users/jacekrudzki/Documents/opencode/duuuump
git add inspirations.json
git commit -m "Add new inspiration"
git push
```

Po ~1 minucie nowy wpis pojawi się na <https://duuump.github.io/duuump/>.

## Kolejność wpisów

Najnowsze (te dodane na końcu pliku JSON) wyświetlają się **u góry** strony.

## Lokalne uruchomienie

```bash
cd /Users/jacekrudzki/Documents/opencode/duuuump
python3 -m http.server 8000
```

Otwórz <http://localhost:8000>. Zatrzymanie: `Ctrl + C`.

## Struktura projektu

```
duuuump/
├── index.html          struktura strony
├── style.css           wygląd
├── app.js              wczytywanie JSON-a + lightbox
├── inspirations.json   ← TUTAJ dodajesz wpisy
├── README.md           ten plik
└── .gitignore
```

## Walidacja JSON-a

Jeśli strona przestanie się ładować po edycji, prawdopodobnie jest błąd w JSON-ie
(np. brakujący przecinek). Wklej zawartość `inspirations.json` na
<https://jsonlint.com> żeby znaleźć problem.
