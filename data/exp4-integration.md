# Expérience 4 : complexité d'intégration

Évaluation qualitative **structurée** du coût de développement sur ce banc de test (Angular + 3 serveurs Node).  
**Pas de CSV** : grille à remplir après implémentation, en s'appuyant sur le code et le journal de mise en place.

**Échelle commune** : 1 = très facile … 5 = très difficile. **5 critères → score max = 25** par protocole.

---

## Protocole d'évaluation

1. Implémenter / relire le code serveur + client du protocole.
2. Pour chaque critère, lire la rubrique ci-dessous et choisir **un seul** niveau (1–5).
3. Noter la **justification** (fichier, ligne de code, symptôme observé).
4. Additionner les 5 notes → total /25.
5. Un autre évaluateur doit pouvoir **contester une cellule** en citant la rubrique, pas l'avis global.

---

## Rubrique (définition des niveaux)

### Critère 1 — Mise en place serveur

| Niveau | Signification |
|--------|----------------|
| **1** | Un fichier, une dépendance, `node server.js`, écoute sur un port, aucun certificat |
| **2** | Framework léger (ex. Express) ou CORS ; pas de TLS ; démarrage en une commande |
| **3** | Configuration partagée entre services, plusieurs routes ou fichiers de config |
| **4** | TLS / certificat requis, génération manuelle documentée |
| **5** | Certificat + scripts (génération, patch), écoute `0.0.0.0`, IP LAN, plusieurs étapes avant le 1er client connecté |

### Critère 2 — API client (connexion et réception)

| Niveau | Signification |
|--------|----------------|
| **1** | API native navigateur, connexion en 1–2 lignes, réception par callback simple |
| **2** | API native, gestion d'état (`onopen` / `onmessage` / `onclose`), < ~80 lignes utiles |
| **3** | Hôte ou URL dynamiques, plusieurs états UI, 80–120 lignes |
| **4** | Polyfill ou hash de certificat, boucle async (datagrams / streams), > ~100 lignes |
| **5** | Polyfill + contraintes de contexte (Chrome flags, IP, HTTPS) + code client fragmenté |

### Critère 3 — Gestion reconnexion

| Niveau | Signification |
|--------|----------------|
| **1** | Reconnexion **native** navigateur, peu ou pas de code applicatif |
| **2** | Native + complément léger (fermer / recréer sur `onerror`) |
| **3** | Reconnexion **manuelle** (timer, retry), journal des événements |
| **4** | Reconnexion manuelle + détection d'absence de messages (coupure « silencieuse ») |
| **5** | Reconnexion entièrement custom, instable ou non documentée |

### Critère 4 — Débogage et clarté des erreurs

| Niveau | Signification |
|--------|----------------|
| **1** | Erreurs explicites dans la console ou l'UI ; cause identifiable en < 5 min |
| **2** | Erreurs standard (codes WS, HTTP) ; documentation MDN suffisante |
| **3** | Erreurs parfois vagues ; logs serveur nécessaires |
| **4** | Erreurs techniques (handshake, certificat) sans message utilisateur clair |
| **5** | Échec silencieux ou message incompréhensible sans scripts / doc projet |

### Critère 5 — Documentation et support écosystème

| Niveau | Signification |
|--------|----------------|
| **1** | Standard mature, nombreux exemples et réponses Stack Overflow |
| **2** | Bien documenté, support navigateur large |
| **3** | Documenté mais moins d'exemples « production » |
| **4** | Spécification récente, souvent via polyfill ou draft W3C |
| **5** | Support navigateur limité, setup dépendant de l'OS (ex. WSL + Chrome flags) |

---

## Résultats (cette évaluation)

| Critère | WebSocket | SSE | WebTransport | Justification (extraits code / setup) |
|---------|-----------|-----|--------------|--------------------------------------|
| **1. Mise en place serveur** | **1** | **2** | **5** | WS : `websocket-server.js` (~20 L), lib `ws` seule. SSE : Express + CORS + routes API (`sse-server.js` ~62 L). WT : `cert.pem` / `key.pem`, `npm run setup:wt`, `generate-cert.sh`, `patch-webtransport-browser.sh`, écoute `0.0.0.0:3003`. |
| **2. API client** | **2** | **1** | **4** | SSE : `new EventSource(url)` + handlers (`connectSSE`). WS : `new WebSocket(url)` + ~60 L (`connectWebSocket`). WT : polyfill `@fails-components/webtransport`, hash SPKI `wt-config.ts`, boucle `datagrams.readable` (~120 L, `connectWebTransport`). |
| **3. Gestion reconnexion** | **3** | **1** | **3** | SSE : reconnexion native `EventSource` (exp. 3 ~2,06 s stable). WS / WT : timer 1 s + `checkMessageStalls()` + journal exp. 3 (pas de reconnexion native). |
| **4. Débogage / erreurs** | **2** | **2** | **5** | WS : `onclose` explicite. SSE : `onerror` peu détaillé. WT : échecs handshake / certificat, message `wtError`, nécessite `launch-chrome-webtransport.sh` et IP LAN. |
| **5. Documentation / écosystème** | **2** | **2** | **4** | WS et SSE : MDN + libs Node matures. WT : draft / polyfill, peu d'exemples identiques à notre stack WSL. |
| **Total /25** | **10** | **8** | **21** | |

**Classement** : SSE (8) < WebSocket (10) << WebTransport (21).

---

## Détail par protocole (preuves)

### WebSocket
- Serveur : `backend/websocket-server.js`
- Client : `dashboard.component.ts` → `connectWebSocket()`, `forceWsStaleReconnect()`
- Dépendances : `ws` (backend)

### SSE
- Serveur : `backend/sse-server.js` (+ config/export partagés)
- Client : `connectSSE()`, `scheduleSseReconnect()` (filet de sécurité ; reconnexion native en pratique)
- Dépendances : `express`, `cors`

### WebTransport
- Serveur : `backend/webtransport-server.js`, `@fails-components/webtransport`
- Client : `connectWebTransport()`, `frontend/src/app/wt-config.ts`, `webtransport-polyfill.ts`
- Outils : `backend/utils/generate-cert.sh`, `launch-chrome-webtransport.sh`, `postinstall` patch

---

## Lien avec les expériences 1 à 3

| Exp. | Observation | Lien avec la grille |
|------|-------------|---------------------|
| **1** | Latences locales très faibles ; pic WT (outlier) | WT coûte plus à intégrer (crit. 1–2–4) sans gain net en latence locale |
| **2** | Débit 98–101 % pour les 3 | Une fois intégrés, critères 1–2 ne se ressentent plus à l'exécution |
| **3** | SSE reconnexion ~2 s, WS/WT ~3,5–3,8 s | Confirme critère 3 : SSE = 1 (native), WS/WT = 3 (manuel) |

---

## Conclusion

> La grille rend l'évaluation **reproductible** : chaque note renvoie à une définition et à un élément du dépôt. SSE obtient le score le plus bas (8/25) grâce à l'API `EventSource` et à la reconnexion native. WebSocket reste raisonnable (10/25) avec un serveur minimal mais une reconnexion à coder. WebTransport cumule les difficultés de mise en place (5/5), de client (4/5) et de débogage (5/5), pour 21/25 — cohérent avec le temps passé sur certificat, WSL et polyfill, pour un gain performance limité en local.

## Formulation pour le mémoire

> Nous avons évalué la complexité d'intégration selon cinq critères définis (serveur, client, reconnexion, débogage, documentation), notés de 1 à 5. Cette grille évite un jugement global non vérifiable : chaque case est justifiée par le code du banc de test. SSE totalise 8/25, WebSocket 10/25 et WebTransport 21/25, ce qui corrobore l'expérience 3 (reconnexion native SSE) et le surcoût de configuration WebTransport observé pendant le développement.
