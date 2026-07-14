#!/usr/bin/env bash
# Démarre frontend + WebSocket + SSE + WebTransport via Docker Compose.
set -euo pipefail
cd "$(dirname "$0")/.."

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker n'est pas installé."
  echo "  → https://docs.docker.com/get-docker/"
  echo "Sinon lance sans Docker (4 terminaux) : voir README.md § « Lancer le projet »"
  exit 1
fi

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Fichier .env créé depuis .env.example (localhost)."
  echo "Sur un VPS, édite .env avec ton IP/domaine avant de relancer."
fi

echo "Build + démarrage des 4 services…"
docker compose up -d --build
echo
docker compose ps
echo
echo "Dashboard : http://localhost:8080"
echo "SSE health : curl http://localhost:3002/health"
echo "Logs       : docker compose logs -f"
