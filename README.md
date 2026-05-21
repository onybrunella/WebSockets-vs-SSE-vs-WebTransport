# Comparaison WebSocket / SSE / WebTransport

Banc de test pour mesurer latence et débit en push serveur vers client (dashboard Angular + 3 serveurs Node.js).

## Démarrage

```bash
# Terminal 1–3 — backend
cd backend && npm install
npm run websocket    # port 3001
npm run sse          # port 3002
npm run webtransport # port 3003 (certificat requis)

# Terminal 4 — frontend
cd frontend && npm install
npm start            # http://localhost:4200
```

Certificat WebTransport (première fois ou renouvellement) :

```bash
cd backend && npm run setup:wt
```

Sous WSL2, voir [backend/utils/certificat.txt](backend/utils/certificat.txt) et `./backend/utils/launch-chrome-webtransport.sh`.

## Exports

Les CSV sont enregistrés dans `data/` via le bouton **Exporter CSV** (API sur le serveur SSE).

## Structure

| Dossier / fichier | Rôle |
|-------------------|------|
| `backend/websocket-server.js` | Push WebSocket |
| `backend/sse-server.js` | Push SSE + API config / export |
| `backend/webtransport-server.js` | Push WebTransport (datagrammes) |
| `backend/lib/` | Config fréquence, boucle d'envoi, export CSV |
| `frontend/src/app/dashboard/` | Interface de mesure |
| `data/` | CSV et config d'intervalle |
