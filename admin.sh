#!/usr/bin/env bash
# Uruchamia lokalny panel admina dla Duuump.
# Po uruchomieniu otworz: http://localhost:4000

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/admin"

# Zaladuj brew do PATH (jesli niedostepny)
if ! command -v node &> /dev/null; then
  if [[ -x /opt/homebrew/bin/brew ]]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
  fi
fi

if ! command -v node &> /dev/null; then
  echo "✗ Brak Node.js. Zainstaluj: brew install node"
  exit 1
fi

# Zainstaluj zaleznosci jesli brakuje
if [[ ! -d node_modules ]]; then
  echo "==> Instaluje zaleznosci (jednorazowo)..."
  npm install
fi

echo ""
echo "==> Uruchamiam panel admina..."
echo "    Po starcie otwiera sie automatycznie w przegladarce"
echo ""

# Otworz przegladarke po chwili
(sleep 1 && open http://localhost:4000) &

# Uruchom serwer
exec node server.js
