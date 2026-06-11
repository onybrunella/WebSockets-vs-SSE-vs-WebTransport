# Comparaison WebSocket / SSE / WebTransport

Banc de test pour mesurer latence et débit (dashboard Angular + 3 serveurs Node.js).

## Démarrage

```bash
# Terminaux 1–3 — backend
cd backend && npm install
npm run websocket    # port 3001
npm run sse          # port 3002
npm run webtransport # port 3003 (certificat requis)

# Terminal 4 — frontend
cd frontend && npm install
npm start            # http://localhost:4200
```

Certificat WebTransport (première fois) :

```bash
cd backend && npm run setup:wt
```

Sous WSL2 : voir [backend/utils/certificat.txt](backend/utils/certificat.txt) et `./backend/utils/launch-chrome-webtransport.sh`.

## Protocole des expériences

Les boutons **Préparer exp. N** règlent la fréquence et le préfixe du fichier CSV. Après chaque mesure : **Exporter CSV** (ou **Exporter journal exp. 3**).

| Exp. | Objectif | Déroulement dashboard | Analyse |
|------|----------|----------------------|---------|
| **1** | Baseline latence | Préparer exp. 1 → Connecter les 3 → 2 min → Exporter CSV | `python3 data/analyze-experiments.py` |
| **2** | Latence sous charge | Chaque palier (1/10/50/100 msg/s) → Reconnecter les 3 → 1 min → Exporter | idem |
| **3** | Coupure réseau 5 s | Préparer exp. 3 → Connecter → 30 s → Marquer coupure + `sudo ./utils/simulate-network-cut.sh 5` → Exporter journal | idem + noter comportement UI |
| **4** | Complexité intégration | Comparer le code et remplir [data/exp4-integration.md](data/exp4-integration.md) | grille qualitative |

### Expérience 3 — coupure réseau

```bash
cd backend
sudo ./utils/simulate-network-cut.sh 5
```

Détail : [data/exp3-protocol.md](data/exp3-protocol.md).

## Exports

Les CSV sont enregistrés dans `data/` :

- `exp1_*.csv` — latence (exp. 1)
- `exp2_1msg_*.csv`, `exp2_10msg_*.csv`, … — charge (exp. 2)
- `exp3_log_*.csv` — journal reconnexion (exp. 3)

## Structure

| Fichier | Rôle |
|---------|------|
| `backend/websocket-server.js` | Push WebSocket |
| `backend/sse-server.js` | Push SSE + API config / export |
| `backend/webtransport-server.js` | Push WebTransport |
| `backend/lib/` | Fréquence partagée, boucle d'envoi, export CSV |
| `frontend/src/app/dashboard/` | Interface de mesure |
| `data/analyze-experiments.py` | Résumé des métriques depuis les CSV |
