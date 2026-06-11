# Résultats expérience 1 — latence en conditions normales

**Protocole** : 1 message/s par serveur, trois protocoles connectés simultanément, export CSV après ~2 minutes.

**Fichier retenu** : `exp1-mesures_2026-05-22T12-01-35.csv` (durée effective ~122 s, 369 mesures).

| Protocole     | n   | Latence moy. (ms) | Min (ms) | Max (ms) | Débit observé (msg/s) |
|---------------|-----|-------------------|----------|----------|------------------------|
| WebSocket     | 123 | **0,68**          | 0        | 2        | 1,01                   |
| SSE           | 123 | **0,77**          | 0        | 3        | 1,01                   |
| WebTransport  | 123 | **1,55**          | 0        | 41       | 1,01                   |

*(Fichier alternatif `exp1-resultats.csv` : ~140 s, moyennes 0,75 / 0,66 / 1,19 ms — conclusions identiques.)*

## Interprétation

- **Baseline comparable** : les trois protocoles tiennent le rythme d’1 msg/s (≈123 messages par protocole sur la durée).
- **Latence très faible** : moyennes sous 2 ms ; écarts négligeables pour un usage temps réel léger en local.
- **WebTransport** : latence moyenne légèrement plus élevée et **pic à 41 ms** (probable jitter ponctuel QUIC/stack), sans impact sur le débit à cette charge.
- **Classement à 1 msg/s** : WebSocket ≈ SSE en moyenne ; WebTransport un peu plus variable.

## Formulation pour le mémoire (exemple)

> En conditions réseau idéales (localhost, 1 msg/s), la latence moyenne reste inférieure à 2 ms pour WebSocket et SSE, et à environ 1,5 ms pour WebTransport, avec des maximums occasionnels plus marqués sur WebTransport (41 ms). Aucun protocole ne se distingue nettement à cette charge.
