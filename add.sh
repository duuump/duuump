#!/usr/bin/env bash
# ============================================================
# Duuump - skrypt do dodawania nowej inspiracji jednym ruchem.
#
# Uzycie:
#   ./add.sh <plik> "<podpis>" "<autor>" "<link-autora>"
#
# Przyklad:
#   ./add.sh ~/Downloads/plakat.jpg "Riso plakat" "Kimchi" "https://instagram.com/kimchi"
#
# Wszystkie argumenty oprocz pliku sa opcjonalne.
# ============================================================

set -euo pipefail  # Zatrzymaj skrypt na bledzie

# ---------- Kolory dla czytelnosci ----------
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

info()  { echo -e "${BLUE}==>${NC} $1"; }
ok()    { echo -e "${GREEN}✓${NC} $1"; }
warn()  { echo -e "${YELLOW}!${NC} $1"; }
err()   { echo -e "${RED}✗${NC} $1" >&2; }

# ---------- Idz do katalogu projektu ----------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ---------- Wczytaj sekrety ----------
if [[ ! -f .env ]]; then
  err "Brak pliku .env. Skopiuj .env.example do .env i wypelnij credentials Cloudinary."
  exit 1
fi

# shellcheck disable=SC1091
set -a
source .env
set +a

: "${CLOUDINARY_CLOUD_NAME:?Brak CLOUDINARY_CLOUD_NAME w .env}"
: "${CLOUDINARY_API_KEY:?Brak CLOUDINARY_API_KEY w .env}"
: "${CLOUDINARY_API_SECRET:?Brak CLOUDINARY_API_SECRET w .env}"

# ---------- Sprawdz argumenty ----------
if [[ $# -lt 1 ]]; then
  cat <<'USAGE'
Uzycie: ./add.sh <plik> "<podpis>" "<autor>" "<link-autora>"

Przyklad:
  ./add.sh ~/Downloads/plakat.jpg "Riso plakat" "Kimchi" "https://instagram.com/kimchi"

Wszystkie argumenty oprocz pliku sa opcjonalne (mozesz pominac).
USAGE
  exit 1
fi

FILE="$1"
CAPTION="${2:-}"
AUTHOR="${3:-}"
AUTHOR_URL="${4:-}"

if [[ ! -f "$FILE" ]]; then
  err "Plik nie istnieje: $FILE"
  exit 1
fi

info "Plik:      $FILE"
[[ -n "$CAPTION" ]]    && info "Podpis:    $CAPTION"
[[ -n "$AUTHOR" ]]     && info "Autor:     $AUTHOR"
[[ -n "$AUTHOR_URL" ]] && info "Link:      $AUTHOR_URL"
echo

# ---------- Upload na Cloudinary ----------
# Cloudinary signed upload wymaga podpisanego zapytania (HMAC-SHA1).
# Podpisujemy tylko parametr "timestamp".

info "Wgrywam obrazek na Cloudinary..."

TIMESTAMP=$(date +%s)
SIGNATURE_STRING="timestamp=${TIMESTAMP}${CLOUDINARY_API_SECRET}"
SIGNATURE=$(printf '%s' "$SIGNATURE_STRING" | shasum -a 1 | awk '{print $1}')

UPLOAD_URL="https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload"

RESPONSE=$(curl -sS -X POST "$UPLOAD_URL" \
  -F "file=@${FILE}" \
  -F "api_key=${CLOUDINARY_API_KEY}" \
  -F "timestamp=${TIMESTAMP}" \
  -F "signature=${SIGNATURE}")

# Sprawdz blad
if echo "$RESPONSE" | jq -e '.error' >/dev/null 2>&1; then
  err "Cloudinary zwrocil blad:"
  echo "$RESPONSE" | jq '.error'
  exit 1
fi

SECURE_URL=$(echo "$RESPONSE" | jq -r '.secure_url // empty')
if [[ -z "$SECURE_URL" ]]; then
  err "Brak secure_url w odpowiedzi Cloudinary."
  echo "$RESPONSE"
  exit 1
fi

ok "Wgrane: $SECURE_URL"
echo

# ---------- Dodaj wpis do inspirations.json ----------
info "Aktualizuje inspirations.json..."

JSON_FILE="inspirations.json"

# Zbuduj nowy obiekt - z opcjonalnymi polami (pomijamy puste)
NEW_ENTRY=$(jq -n \
  --arg url "$SECURE_URL" \
  --arg caption "$CAPTION" \
  --arg author "$AUTHOR" \
  --arg authorUrl "$AUTHOR_URL" \
  '{url: $url}
   + (if $caption    != "" then {caption: $caption}     else {} end)
   + (if $author     != "" then {author: $author}       else {} end)
   + (if $authorUrl  != "" then {authorUrl: $authorUrl} else {} end)')

# Dolacz nowy wpis na koncu listy (jq tworzy zaktualizowana wersje)
TMP_FILE=$(mktemp)
jq --argjson entry "$NEW_ENTRY" '. + [$entry]' "$JSON_FILE" > "$TMP_FILE"
mv "$TMP_FILE" "$JSON_FILE"

ok "Wpis dodany"
echo

# ---------- Git: commit + push ----------
info "Wysylam zmiany na GitHub..."

# Krotki opis commita - z podpisem jesli istnieje, inaczej z nazwa pliku
COMMIT_DESC="${CAPTION:-$(basename "$FILE")}"
[[ -n "$AUTHOR" ]] && COMMIT_DESC="${COMMIT_DESC} - ${AUTHOR}"

git add "$JSON_FILE"
git commit -m "Add inspiration: ${COMMIT_DESC}" >/dev/null
git push >/dev/null 2>&1

ok "Wyslane na GitHub"
echo

# ---------- Podsumowanie ----------
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}  Gotowe! Strona zaktualizuje sie za ~1 min:${NC}"
echo -e "${GREEN}  https://duuump.github.io/duuump/${NC}"
echo -e "${GREEN}=========================================${NC}"
