# Résultats expérience 2 : latence sous charge croissante

Durée par run : **~1 min**. Analyse : `python3 data/analyze-experiments.py`

| Fréquence cible | Fichier | Protocole | n | Latence moy. (ms) | Min | Max | Débit reçu (msg/s) | % de la cible |
|-----------------|---------|-----------|---|-------------------|-----|-----|---------------------|---------------|
| 1 msg/s | `exp2_1msg_2026-06-11T21-52-21.csv` | WebSocket | 71 | 0,35 | 0 | 1 | 1,01 | 101 % |
| 1 msg/s | | SSE | 71 | 0,24 | 0 | 5 | 1,01 | 101 % |
| 1 msg/s | | WebTransport | 71 | 0,30 | 0 | 1 | 1,01 | 101 % |
| 10 msg/s | `exp2_10msg_2026-06-11T21-53-43.csv` | WebSocket | 647 | 0,39 | 0 | 5 | 9,98 | 100 % |
| 10 msg/s | | SSE | 647 | 0,39 | 0 | 5 | 9,98 | 100 % |
| 10 msg/s | | WebTransport | 646 | 0,46 | 0 | 2 | 9,97 | 100 % |
| 50 msg/s | `exp2_50msg_2026-06-11T21-54-59.csv` | WebSocket | 3178 | 0,30 | 0 | 9 | 49,46 | 99 % |
| 50 msg/s | | SSE | 3177 | 0,35 | 0 | 13 | 49,44 | 99 % |
| 50 msg/s | | WebTransport | 3178 | 0,51 | 0 | 7 | 49,46 | 99 % |
| 100 msg/s | `exp2_100msg_2026-06-11T21-56-20.csv` | WebSocket | 6317 | 0,28 | 0 | 4 | 98,48 | 98 % |
| 100 msg/s | | SSE | 6310 | 0,31 | 0 | 4 | 98,37 | 98 % |
| 100 msg/s | | WebTransport | 6296 | 0,39 | 0 | 5 | 98,15 | 98 % |

## Synthèse latence moyenne (ms)

| Fréquence | WebSocket | SSE | WebTransport |
|-----------|-----------|-----|--------------|
| 1 msg/s | 0,35 | 0,24 | 0,30 |
| 10 msg/s | 0,39 | 0,39 | 0,46 |
| 50 msg/s | 0,30 | 0,35 | 0,51 |
| 100 msg/s | 0,28 | 0,31 | 0,39 |

## Synthèse débit reçu (msg/s)

| Fréquence | WebSocket | SSE | WebTransport |
|-----------|-----------|-----|--------------|
| 1 msg/s | 1,01 | 1,01 | 1,01 |
| 10 msg/s | 9,98 | 9,98 | 9,97 |
| 50 msg/s | 49,46 | 49,44 | 49,46 |
| 100 msg/s | 98,48 | 98,37 | 98,15 |

## Interprétation

- Les trois protocoles suivent la charge cible sur tous les paliers (98 à 101 % du débit visé), y compris à 100 msg/s en local.
- Les latences moyennes restent **sous la milliseconde** sur l'ensemble des paliers : la machine locale absorbe la charge sans saturation visible.
- **WebTransport** affiche systématiquement la latence moyenne la plus élevée dès 10 msg/s (écart modeste : +0,07 à +0,23 ms selon le palier).
- **WebSocket** est le plus bas à 50 et 100 msg/s ; à 1 msg/s, **SSE** est légèrement en tête (0,24 ms), dans la marge de bruit observée à l'exp. 1.
- Les max restent faibles (≤ 13 ms) ; aucun protocole ne montre de dégradation brutale de la latence avec la montée en charge, ce qui confirme que le goulot n'est pas le protocole mais l'environnement local (localhost / WSL).
- Légère perte de messages à 100 msg/s (~2 %, n légèrement inférieur pour WT) : acceptable pour ce banc de test.
