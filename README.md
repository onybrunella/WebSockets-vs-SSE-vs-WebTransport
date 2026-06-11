# Comparaison WebSocket / SSE / WebTransport

Petit banc de test pour mesurer latence et débit : dashboard Angular + 3 serveurs Node.

## Lancer le projet

Il faut 4 terminaux :

```bash
# backend (x3)
cd backend && npm install
npm run websocket      # 3001
npm run sse            # 3002 — config + export CSV
npm run webtransport   # 3003

# frontend
cd frontend && npm install
npm start              # http://localhost:4200
```

WebTransport : générer le certificat une fois avec `cd backend && npm run setup:wt`.  
Sous WSL, voir `backend/utils/certificat.txt` et `./backend/utils/launch-chrome-webtransport.sh`.

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

## Fichiers exportés

Tout part dans `data/` : `exp1_*.csv`, `exp2_*msg_*.csv`, `exp3_log_*.csv`

## Arborescence utile

- `backend/websocket-server.js`, `sse-server.js`, `webtransport-server.js` — les 3 push
- `backend/lib/` — fréquence partagée, boucle d'envoi, export
- `frontend/src/app/dashboard/` — interface de mesure
