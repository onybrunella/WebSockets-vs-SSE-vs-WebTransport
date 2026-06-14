# Résultats expérience 1 : latence en conditions normales

**Protocole** : 1 message/s, trois protocoles connectés, export CSV après 2 minutes.

**Fichier retenu** : `exp1_2026-06-11T21-44-08.csv` (durée effective : ~136 s)

| Protocole     | n   | Latence moy. (ms) | Min (ms) | Max (ms) | Débit observé (msg/s) |
|---------------|-----|-------------------|----------|----------|------------------------|
| WebSocket     | 137 | 0,08              | 0        | 2        | 1,01                   |
| SSE           | 137 | 0,37              | 0        | 3        | 1,01                   |
| WebTransport  | 137 | 0,63              | 0        | 43       | 1,01                   |

## Rendu visuel (dashboard)

Graphiques du dashboard : **« Latence (30 derniers messages) »** — chaque barre = une mesure, hauteur **relative au max des 30 barres** de la carte (échelles différentes entre WS, SSE et WT).

| Protocole | Pendant la mesure (live) | Graphique (30 dernières barres) |
|-----------|--------------------------|----------------------------------|
| **WebSocket** | Pastille verte **Connecté**, débit **1/s** stable. Moy. affichée ~**1 ms** (arrondi UI ; 0,08 ms sur tout le CSV). | Barres **très basses** presque toute la fenêtre. **Un pic net** ponctuel (jusqu’à ~65 ms observé en fin de capture à l’écran) ; le reste du temps proche de 0. Comportement le plus **plat** des trois. |
| **SSE** | Pastille verte, débit **1/s**. Moy. affichée ~**1 ms** (0,37 ms sur le CSV). Min/max affichés 0 / 3 ms. | Profil plus **jittery** : nombreuses **petites pointes** réparties sur les 30 barres, sans pic unique dominant. Visuellement moins régulier que WebSocket, mais pics de moindre amplitude que WT. |
| **WebTransport** | Pastille verte, débit **1/s**. Moy. affichée **2–4 ms** (plus élevée que les deux autres à l’écran). Min/max **0 / 44 ms**. | Contraste le plus marqué : **pics hauts** au début de la connexion et/ou **grappe de barres élevées** en fin de fenêtre (~42–44 ms), le reste quasi à plat. C’est le seul protocole dont le graphique montre clairement des **événements extrêmes** visibles à l’œil nu. |

**À retenir visuellement** : sur 2 min à 1 msg/s, les trois cartes restent synchrones (même débit, connexion stable). La différence se voit surtout sur la **forme** des barres : WS plat avec rare spike, SSE légèrement irrégulier, WT avec pics isolés qui ressortent fortement malgré une moyenne CSV faible (0,63 ms).

**Figure rapport** (`data/figures/exp1_latence.pdf`, `python3 data/plot-experiments.py`) :
- **Zoom 0–6 ms** : chaque message en point + boîte (sans outlier lointain) ;
- **Histogramme** : quasi tout dans 0–1 ms ; WT seul dans la tranche 15+ ms ;
- **Barres** : médiane / moyenne / P95 (WT reste bas hors pic) ;
- **Outliers > 5 ms** : pic WebTransport ~43 ms isolé.

## Interprétation

- Les trois protocoles reçoivent le même nombre de messages (137) au débit cible (~1 msg/s) : la mesure est cohérente.
- En conditions locales (localhost / LAN), les latences sont très faibles (sous la milliseconde en moyenne pour WebSocket).
- **WebSocket** affiche la latence moyenne la plus basse (0,08 ms), suivi de **SSE** (0,37 ms) puis **WebTransport** (0,63 ms).
- L'écart reste modeste ; WebTransport présente un pic isolé à 43 ms (max), visible sur le graphique dashboard et confirmé par le boxplot.
- Ces valeurs reflètent surtout le coût du protocole sur une machine unique ; elles ne préjugent pas du comportement sur un réseau réel avec RTT plus élevé.