# Résultats expérience 3 : coupure réseau 5 s

**Conditions** : 1 msg/s, trois protocoles connectés, coupure via `sudo ./utils/simulate-network-cut.sh 5`, reconnexion auto activée. App ouverte via `http://192.168.1.194:4200`.

| Run | Fichier | WebSocket (ms) | SSE (ms) | WebTransport (ms) | Notes UI |
|-----|---------|----------------|----------|-------------------|----------|
| 1 | `exp3_log_2026-06-11T22-44-42.csv` | 3065 | 2058 | 3066 | SSE repasse bleu en premier |
| 2 | `exp3_log_2026-06-11T22-45-31.csv` | 2880 | 2070 | 2884 | idem |
| 3 | `exp3_log_2026-06-11T22-46-25.csv` | 5400 | 2053 | 4444 | WS/WT plus lents au run 3 |
| **Moyenne** | | **3782** | **2060** | **3465** | |

## Comportement UI

| Protocole | Pendant la coupure | Après rétablissement réseau |
|-----------|-------------------|----------------------------|
| WebSocket | Graphique figé, pastille orange « Reconnexion… » | Pastille bleue « Reconnecté · ~3–5 s », puis flux repris |
| SSE | Graphique figé, pastille orange brève | **Premier** en bleu (~2 s), reprise la plus rapide visuellement |
| WebTransport | Graphique figé, pastille orange | Bleu après WS/SSE (~3–4 s en moyenne) |

## Interprétation

- **SSE** se reconnecte le plus vite et de façon **très stable** (~2,06 s sur les 3 runs, écart < 20 ms). Cohérent avec la reconnexion native de `EventSource` côté navigateur.
- **WebSocket** et **WebTransport** affichent des temps plus élevés et plus variables (moy. ~3,8 s et ~3,5 s), avec un pic à 5,4 s pour WS au run 3. Les deux passent par une logique client (détection silence + retry 1 s).
- Visuellement, la pastille bleue **SSE** apparaît toujours **avant** WS et WT, ce qui correspond aux mesures du journal.
- Pendant la coupure, les trois protocoles se comportent de façon similaire côté UI (gel des graphiques, pastille orange). La différence se joue surtout à la **reprise**.

## Fichiers journal

`data/exp3_log_*.csv` — `Value` : -1 = coupure marquée, 0 = disconnect, 1 = reconnect (`Latency(ms)` = durée de reconnexion).
