# Résultats expérience 3 : coupure réseau 5 s

**Conditions** : 1 msg/s, trois protocoles connectés, coupure via `sudo ./utils/simulate-network-cut.sh 5`, reconnexion auto activée. App ouverte via `http://<IP>:4200` (pas `localhost`).

Analyse : `python3 data/analyze-experiments.py`

| Run | Fichier | WebSocket (ms) | SSE (ms) | WebTransport (ms) | Notes UI |
|-----|---------|----------------|----------|-------------------|----------|
| 1 | `exp3_log_*.csv` | | | | |
| 2 | `exp3_log_*.csv` | | | | |
| 3 | `exp3_log_*.csv` | | | | |
| **Moyenne** | | | | | |

## Comportement UI

| Protocole | Pendant la coupure | Après rétablissement réseau |
|-----------|-------------------|----------------------------|
| WebSocket | | |
| SSE | | |
| WebTransport | | |

## Interprétation

-

## Formulation pour le mémoire

>

## Fichiers journal

Exporter via le dashboard → `data/exp3_log_*.csv`  
(`Value` : -1 = coupure marquée, 0 = disconnect, 1 = reconnect ; `Latency(ms)` = durée de reconnexion)
