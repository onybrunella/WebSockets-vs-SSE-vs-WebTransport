# Résultats expérience 3 — coupure réseau 5 s

**Conditions** : 1 msg/s, trois protocoles connectés, coupure via `sudo ./utils/simulate-network-cut.sh 5`.

| Run | WebSocket (ms) | SSE (ms) | WebTransport (ms) | Notes UI |
|-----|----------------|----------|-------------------|----------|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |
| **Moyenne** | | | | |

## Comportement UI (à compléter)

| Protocole | Pendant la coupure | Après rétablissement réseau |
|-----------|-------------------|----------------------------|
| WebSocket | | |
| SSE | | |
| WebTransport | | |

## Fichiers journal

Exporter via le dashboard → `data/exp3_log_*.csv`  
(`Value` : -1 = marque coupure, 0 = disconnect, 1 = reconnect ; `Latency(ms)` = durée de reconnexion)
