# Résultats expérience 2 — latence sous charge croissante

Durée par run : **~60–80 s** (export manuel). **Débit reçu** = nombre de messages enregistrés / durée effective du fichier.

| Fréquence cible | Fichier | Protocole | n | Latence moy. (ms) | Min | Max | Débit reçu (msg/s) | % de la cible |
|-----------------|---------|-----------|---|-------------------|-----|-----|---------------------|---------------|
| 1 msg/s | `exp2_1msg_s_2026-05-22T12-34-52.csv` | WebSocket | 69 | 0,46 | 0 | 1 | 1,01 | 101 % |
| 1 msg/s | | SSE | 69 | 0,59 | 0 | 1 | 1,01 | 101 % |
| 1 msg/s | | WebTransport | 69 | 0,54 | 0 | 1 | 1,01 | 101 % |
| 10 msg/s | `exp2_10msg_s_2026-05-22T12-22-49.csv` | WebSocket | 655 | 1,37 | 0 | 8 | 9,05 | 91 % |
| 10 msg/s | | SSE | 655 | 1,45 | 1 | 12 | 9,05 | 91 % |
| 10 msg/s | | WebTransport | 653 | 1,93 | 1 | 43 | 9,02 | 90 % |
| 50 msg/s | `exp2_50msg_s_2026-05-22T12-24-10.csv` | WebSocket | 3159 | 6,01 | 0 | 259 | 48,05 | 96 % |
| 50 msg/s | | SSE | 3155 | **3,65** | 0 | 107 | 47,99 | 96 % |
| 50 msg/s | | WebTransport | 3130 | 7,22 | 0 | 257 | 47,61 | 95 % |
| 100 msg/s | `exp2_100msg_s_2026-05-22T12-25-43.csv` | WebSocket | 4961 | 2145 | 0 | 13043 | 63,1 | 63 % |
| 100 msg/s | | SSE | 7337 | **1208** | 0 | 6828 | **93,3** | **93 %** |
| 100 msg/s | | WebTransport | 4872 | 2296 | 1 | 13361 | 62,0 | 62 % |

## Synthèse latence moyenne (ms)

| Fréquence | WebSocket | SSE | WebTransport |
|-----------|-----------|-----|--------------|
| 1 msg/s | 0,46 | 0,59 | 0,54 |
| 10 msg/s | 1,37 | 1,45 | 1,93 |
| 50 msg/s | 6,01 | **3,65** | 7,22 |
| 100 msg/s | 2145 | **1208** | 2296 |

## Synthèse débit reçu (msg/s)

| Fréquence | WebSocket | SSE | WebTransport |
|-----------|-----------|-----|--------------|
| 1 msg/s | 1,01 | 1,01 | 1,01 |
| 10 msg/s | 9,05 | 9,05 | 9,02 |
| 50 msg/s | 48,05 | 47,99 | 47,61 |
| 100 msg/s | 63,1 | **93,3** | 62,0 |

## Interprétation

### Seuil de différenciation

1. **1 et 10 msg/s** : latences proches (< 2 ms en moyenne) ; léger retard de débit à 10 msg/s (~90 % de la cible), probablement lié à la charge cumulée des **trois connexions simultanées** et au thread navigateur.
2. **50 msg/s** : les protocoles restent proches en débit (~96 %). **SSE affiche la latence moyenne la plus basse** (3,7 ms vs 6–7 ms).
3. **100 msg/s** : **saturation nette** — la latence moyenne explose (file d’attente côté client : `receivedAt - timestamp` inclut le retard de traitement). **SSE absorbe mieux la charge** (93 msg/s reçus) ; WebSocket et WebTransport plafonnent autour de **62–63 msg/s** avec latences moyennes > 2 s.

### Points de vigilance méthodologiques

- Mesurer **un protocole à la fois** à 100 msg/s permettrait de séparer limite du protocole et contention navigateur.
- Les **max très élevés** à forte charge (plusieurs secondes) reflètent des messages « en retard » dans le buffer, pas un RTT réseau pur.
- Rejouer chaque palier 2–3 fois et moyenner renforcerait la robustesse statistique.

## Formulation pour le mémoire (exemple)

> Jusqu’à 50 messages/s, les trois protocoles conservent un débit proche de la cible (~96 %) et des latences moyennes inférieures à 10 ms, avec un avantage léger pour SSE. À 100 messages/s, le système atteint ses limites : SSE maintient le meilleur débit (93 msg/s) et la latence moyenne la plus faible parmi les trois, tandis que WebSocket et WebTransport chutent à environ 62 msg/s et voient leur latence moyenne dépasser 2 secondes, signe d’accumulation de messages non traités à temps.
