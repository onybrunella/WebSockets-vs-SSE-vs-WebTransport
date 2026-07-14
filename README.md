# Comparaison WebSocket / SSE / WebTransport

Petit banc de test pour mesurer latence et débit : dashboard Angular + 3 serveurs Node.

## Prérequis

- **Node.js ≥ 18** (testé avec Node 22/24) et npm
- **Google Chrome** ou **Edge** (WebTransport n'est pas supporté par Firefox)
- **OpenSSL** (pour générer le certificat WebTransport)
- **Python 3** (uniquement pour l'analyse des CSV et la génération des figures)
- **Docker** (optionnel, pour le déploiement)

WebSocket et SSE fonctionnent sans configuration. **WebTransport** nécessite en plus un certificat
local (voir plus bas) et que Chrome accepte ce certificat.

## Lancer le projet (local)

Il faut 4 terminaux :

```bash
# backend (x3)
cd backend && npm install
npm run websocket      # 3001
npm run sse            # 3002, config + export CSV
npm run webtransport   # 3003

# frontend
cd frontend && npm install
npm start              # http://localhost:4200
```

WebTransport : générer le certificat une fois avec `cd backend && npm run setup:wt`.  
Sous WSL, voir `backend/utils/certificat.txt` et `./backend/utils/launch-chrome-webtransport.sh`.

## Déploiement

> **Important** : Vercel (et la plupart des PaaS « serverless ») ne peuvent **pas** héberger
> les serveurs WebSocket / SSE / WebTransport longue durée. On déploie le **frontend** sur
> Vercel, et les **backends** via Docker (VPS, JPS/Jelastic, Railway, etc.).

### Option A — Tout-en-un avec Docker Compose (recommandé, VPS / JPS)

```bash
cp .env.example .env
# adaptez WS_URL / SSE_URL / WT_URL à l'IP ou au domaine public de la machine
docker compose up -d --build
```

- Frontend : http://localhost:8080  
- WebSocket : `ws://localhost:3001`  
- SSE : `http://localhost:3002`  
- WebTransport : `https://127.0.0.1:3003/webtransport` (UDP + TCP 3003)

Sur un VPS, ouvrez les ports **8080, 3001, 3002, 3003/tcp et 3003/udp**.

Manifeste **JPS / Jelastic** : `deploy/jps-manifest.yml` (installe Docker Compose sur un nœud Docker).

### Option B — Frontend sur Vercel + backends ailleurs

1. Déployez les backends (`docker compose up websocket sse webtransport`) sur un VPS / JPS.
2. Sur [vercel.com](https://vercel.com) : **Import** ce dépôt GitHub.
3. Variables d'environnement Vercel :

| Variable | Exemple |
|----------|---------|
| `WS_URL` | `wss://ws.mondomaine.com` |
| `SSE_URL` | `https://api.mondomaine.com` |
| `WT_URL` | `https://wt.mondomaine.com:3003` |

Le fichier `vercel.json` build le dashboard Angular et injecte ces URLs via `frontend/scripts/inject-env.mjs`.

### Limites WebTransport en cloud

WebTransport repose sur **HTTP/3 (QUIC/UDP)** et un certificat TLS. Un reverse-proxy classique
(HTTPS TCP seulement) ne suffit souvent pas. Pour une démo sérieuse de WT, privilégiez un VPS
avec le port UDP 3003 exposé, et Chrome/Edge avec le hash SPKI (`npm run setup:wt`).

## Les 4 expériences

| Exp | But |
|-----|-----|
| 1 | Latence à 1 msg/s, 2 min |
| 2 | Latence à 1 / 10 / 50 / 100 msg/s (1 min par palier) |
| 3 | Coupure réseau 5 s + temps de reconnexion |
| 4 | Comparaison qualitative du code → `data/exp4-integration.md` |

Le déroulé détaillé est dans le dashboard (onglets Exp. 1 / 2 / 3).  
Pour l'exp. 3, coupure réseau :

```bash
cd backend
sudo ./utils/simulate-network-cut.sh 5
```

Analyse des CSV : `python3 data/analyze-experiments.py`  
Figures LaTeX (PDF) : `python3 data/plot-experiments.py` → `data/figures/`

## Fichiers exportés

Tout part dans `data/` : `exp1_*.csv`, `exp2_*msg_*.csv`, `exp3_log_*.csv`

## Arborescence utile

- `backend/websocket-server.js`, `sse-server.js`, `webtransport-server.js` : les 3 push
- `backend/lib/` : fréquence partagée, boucle d'envoi, export
- `frontend/src/app/dashboard/` : interface de mesure
- `docker-compose.yml`, `deploy/` : déploiement Docker / JPS
- `vercel.json` : déploiement du frontend sur Vercel
