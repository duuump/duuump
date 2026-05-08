# Duuump

Prosta strona z inspiracjami w stylu FFFFound.

## Jak dodać nową inspirację?

1. Wgraj obrazek na Cloudinary (lub inny hosting), skopiuj jego URL.
2. Otwórz plik `inspirations.json`.
3. Dodaj nowy obiekt **na końcu listy** (przed ostatnim `]`):

   ```json
   {
     "url": "https://res.cloudinary.com/twoje-konto/image/upload/v123/obrazek.jpg",
     "caption": "Krótki opis inspiracji",
     "author": "Imię Nazwisko",
     "authorUrl": "https://example.com/autor"
   }
   ```

   Pola:
   - `url` (wymagane) — link do obrazka
   - `caption` (opcjonalne) — krótki podpis
   - `author` (opcjonalne) — autor / źródło
   - `authorUrl` (opcjonalne) — link do profilu autora

   **Pamiętaj o przecinku** po poprzednim obiekcie!

4. Zapisz plik, zacommituj zmiany do GitHuba — strona się zaktualizuje automatycznie.

## Kolejność

Najnowsze inspiracje (te dodane na końcu pliku JSON) wyświetlają się **u góry** strony.

## Lokalne uruchomienie

Otwórz `index.html` w przeglądarce. Jeśli `fetch` nie działa z `file://`, uruchom prosty serwer:

```bash
python3 -m http.server 8000
```

I otwórz <http://localhost:8000>.
