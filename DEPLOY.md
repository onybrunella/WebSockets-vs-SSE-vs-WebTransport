# Déploiement

Ce banc de test a **3 serveurs longue durée** (WebSocket, SSE, WebTransport).
Ils ne peuvent pas tourner correctement sur Vercel (serverless).  
→ **Docker / VPS** pour les backends (+ front optionnel), **Vercel** seulement pour le dashboard Angular.

## Option A — Tout-en-un (recommandé sur VPS / machine avec Docker)

```bash
cp .env.example .env
# Sur un VPS public, édite .env :
#   WS_URL=ws://TON_IP:3001
#   SSE_URL=http://TON_IP:3002
#   WT_URL=https://TON_IP:3003
./scripts/deploy-local.sh
```

| Service | URL |
|---------|-----|
| Dashboard | http://localhost:8080 |
| WebSocket | ws://localhost:3001 |
| SSE | http://localhost:3002 |
| WebTransport | https://127.0.0.1:3003 |

Ports à ouvrir sur un VPS : **8080, 3001, 3002, 3003/tcp, 3003/udp**.

Manifeste **JPS / Jelastic** : `deploy/jps-manifest.yml`.

## Option B — Frontend sur Vercel + backends sur un VPS

1. Sur le VPS :
   ```bash
   docker compose up -d --build websocket sse webtransport
   ```
2. Sur [vercel.com](https://vercel.com) → Import du dépôt GitHub.
3. Variables d’environnement Vercel :

| Variable | Exemple |
|----------|---------|
| `WS_URL` | `ws://TON_IP:3001` (ou `wss://…` si TLS) |
| `SSE_URL` | `http://TON_IP:3002` (ou `https://…`) |
| `WT_URL` | `https://TON_IP:3003` |

> Si le site Vercel est en **HTTPS**, le navigateur peut bloquer du `ws://` / `http://` (contenu mixte).  
> Dans ce cas, mets un reverse-proxy TLS devant les backends (`wss` / `https`), ou utilise l’option A (tout en HTTP sur le même VPS).

## Sans Docker (rappel local)

```bash
cd backend && npm i && npm run websocket   # 3001
cd backend && npm run sse                  # 3002
cd frontend && npm i && npm start          # 4200
```

Puis **Lancer les 3 connexions** dans le dashboard.
