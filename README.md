# Duuump

Prosta strona z inspiracjami w stylu FFFFound.

🌐 **Live:** <https://duuump.github.io/duuump/>

## Dodawanie nowej inspiracji (jedna komenda)

Z dowolnego folderu w terminalu:

```bash
duuump ~/Downloads/zdjecie.jpg "Podpis" "Autor" "https://link-autora"
```

Wszystkie argumenty oprócz pliku są opcjonalne. Skrypt sam:

1. Wgra obrazek na Cloudinary
2. Doda wpis do `inspirations.json`
3. Zacommituje i zpushuje na GitHub

Po ~1 minucie nowy wpis pojawi się na <https://duuump.github.io/duuump/>.

### Pro tip: drag & drop

Zamiast wpisywać ścieżkę pliku — przeciągnij plik z Findera bezpośrednio do okna terminala.

### Bez aliasu (z folderu projektu)

Jeśli alias nie działa, można wywołać skrypt bezpośrednio:

```bash
cd /Users/jacekrudzki/Documents/opencode/duuuump
./add.sh ~/Downloads/zdjecie.jpg "Podpis" "Autor" "https://link"
```

## Pierwsze uruchomienie / nowy komputer

1. Sklonuj repo:

   ```bash
   git clone https://github.com/duuump/duuump.git
   cd duuump
   ```

2. Skopiuj `.env.example` do `.env` i wypełnij credentialami z Cloudinary:

   ```bash
   cp .env.example .env
   ```

   Edytuj `.env` (Cloudinary Console → Settings → API Keys).

3. Zainstaluj wymagane narzędzia (jednorazowo):

   ```bash
   brew install jq gh
   gh auth login
   gh auth setup-git
   ```

4. Dodaj alias do `~/.zshrc`:

   ```bash
   echo 'alias duuump="/sciezka/do/duuump/add.sh"' >> ~/.zshrc
   source ~/.zshrc
   ```

## Manualna edycja `inspirations.json` (jeśli wolisz)

Format:

```json
{
  "url": "https://res.cloudinary.com/.../obrazek.jpg",
  "caption": "Krótki opis",
  "author": "Imię Nazwisko",
  "authorUrl": "https://link-do-autora"
}
```

Pola `caption`, `author`, `authorUrl` są opcjonalne.

Po edycji:

```bash
git add inspirations.json
git commit -m "Add new inspiration"
git push
```

## Kolejność wpisów

Najnowsze (te dodane na końcu pliku JSON) wyświetlają się **u góry** strony.

## Lokalne uruchomienie strony

```bash
python3 -m http.server 8000
```

Otwórz <http://localhost:8000>. Zatrzymanie: `Ctrl + C`.

## Struktura projektu

```
duuuump/
├── index.html          struktura strony
├── style.css           wygląd
├── app.js              wczytywanie JSON-a + lightbox
├── inspirations.json   dane o inspiracjach
├── add.sh              ← skrypt automatyzujący dodawanie
├── .env                ← sekrety Cloudinary (NIE w gicie)
├── .env.example        szablon dla .env
├── README.md
└── .gitignore
```

## Walidacja JSON-a

Jeśli strona przestanie się ładować po manualnej edycji, sprawdź JSON:

```bash
python3 -c "import json; json.load(open('inspirations.json')); print('OK')"
```

Lub wklej zawartość na <https://jsonlint.com>.
