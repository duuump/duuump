# Duuump

Prosta strona z inspiracjami w stylu FFFFound.

🌐 **Live:** <https://duuump.github.io/duuump/>

## Dodawanie nowej inspiracji

Masz **dwie opcje** — wybierz, która Ci wygodniejsza:

### Opcja 1: Panel admina (drag & drop + edycja)

```bash
duuump-admin
```

Otworzy panel w przeglądarce na <http://localhost:4000>. Panel umożliwia:

- **Dodawanie** — przeciągnij obrazek (lub Cmd+V z schowka, lub kliknij), wpisz dane, klik
- **Edycja** — `[ edytuj ]` przy wpisie zmienia podpis/autora/link
- **Usuwanie** — `[ usun ]` usuwa wpis i plik z Cloudinary
- **Zmiana kolejności** — przeciągnij wpis za `[::]` w nową pozycję

Po `Ctrl+C` w terminalu serwer się zatrzyma.

### Opcja 2: Komenda CLI

```bash
duuump ~/Downloads/zdjecie.jpg "Podpis" "Autor" "https://link-autora"
```

Jedna linijka, też wszystko sam zrobi.

> **Pro tip:** zamiast wpisywać ścieżkę pliku, przeciągnij plik z Findera bezpośrednio do okna terminala.

## Co skrypty robią pod spodem

1. Wgrywają obrazek na **Cloudinary**
2. Dodają wpis do `inspirations.json`
3. Robią `git add` + `commit` + `push` do GitHuba

Po ~1 minucie nowy wpis pojawi się na <https://duuump.github.io/duuump/>.

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

3. Zainstaluj wymagane narzędzia:

   ```bash
   brew install jq node gh
   gh auth login
   gh auth setup-git
   ```

4. Zainstaluj zależności panelu admina:

   ```bash
   cd admin && npm install && cd ..
   ```

5. Dodaj aliasy do `~/.zshrc`:

   ```bash
   echo 'alias duuump="/sciezka/do/duuump/add.sh"' >> ~/.zshrc
   echo 'alias duuump-admin="/sciezka/do/duuump/admin.sh"' >> ~/.zshrc
   source ~/.zshrc
   ```

## Manualna edycja `inspirations.json`

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

## Lokalne uruchomienie strony publicznej

```bash
python3 -m http.server 8000
```

Otwórz <http://localhost:8000>. Zatrzymanie: `Ctrl + C`.

## Struktura projektu

```
duuuump/
├── index.html              strona publiczna
├── style.css
├── app.js
├── inspirations.json       dane o inspiracjach
├── add.sh                  CLI: dodawanie z terminala
├── admin.sh                CLI: uruchomienie panelu admina
├── admin/
│   ├── server.js           backend panelu (Express)
│   ├── admin.html          UI panelu
│   ├── admin.css
│   ├── admin.js
│   └── package.json        zaleznosci panelu
├── .env                    sekrety Cloudinary (NIE w gicie)
├── .env.example
├── README.md
└── .gitignore
```

## Bezpieczeństwo

Panel admina (`admin.sh`) nasłuchuje **tylko na localhost** (127.0.0.1).
Nikt z internetu nie ma do niego dostępu — działa wyłącznie z Twojego Maca.

Plik `.env` z kluczami Cloudinary **nigdy nie trafia na GitHub** — jest w `.gitignore`.

## Walidacja JSON-a

Jeśli strona przestanie się ładować po manualnej edycji:

```bash
python3 -c "import json; json.load(open('inspirations.json')); print('OK')"
```

Lub wklej zawartość na <https://jsonlint.com>.
