#!/usr/bin/env bash
# Démarre frontend + WebSocket + SSE + WebTransport via Docker Compose.
set -euo pipefail
cd "$(dirname "$0")/.."

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker n'est pas installé (ou pas dans le PATH)."
  echo "Sans Docker, lance les 3–4 terminaux Node : voir README.md"
  exit 1
fi

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Fichier .env créé (localhost). Sur un VPS, édite-le avec ton IP/domaine."
fi

echo "Build + démarrage…"
docker compose up -d --build
docker compose ps
echo
echo "Dashboard : http://localhost:8080"
echo "Health SSE : curl http://localhost:3002/health"
echo "Logs       : docker compose logs -f"
