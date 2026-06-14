# Expérience 3 : résilience (coupure réseau 5 s)

## Prérequis

- Les 3 serveurs backend + dashboard Angular démarrés (voir README).
- Onglet **Exp. 3** du dashboard.
- WebTransport : ouvrir l’app via l’IP indiquée dans `frontend/src/app/wt-config.ts` (`WT_SETUP_HOST`, ex. `http://192.168.1.194:4200`), pas `localhost`. Lancer Chrome avec `./backend/utils/launch-chrome-webtransport.sh` si besoin.
- Si la bannière indique **« Messages stoppés côté serveur »**, cliquer **« Reprendre messages »** avant de mesurer.

## Interface (dashboard)

| Zone | Éléments utiles pour l’exp. 3 |
|------|-------------------------------|
| Barre d’actions | **Lancer les 3 connexions**, **Stopper messages** / **Reprendre messages**, **Effacer mesures** (latences uniquement, pas le journal exp. 3) |
| Chronomètre | Préréglages **30 s** / 1 min / 2 min, **Démarrer** / Pause / Réinitialiser (non modifié automatiquement par **Préparer**) |
| Onglet Exp. 3 | **Préparer**, **Marquer coupure**, **Export journal**, case **Reconnexion auto** (cochée par défaut) |

**Préparer** : règle les serveurs à **1 msg/s**, vide le journal exp. 3 et remet les compteurs de reconnexion. Le bouton passe bleu (**Préparé**).

La ligne de statut affiche les derniers temps de reconnexion : `WS … ms | SSE … ms | WT … ms`.

## Déroulement (≈ 5 min, répéter 2 à 3 fois)

1. Onglet **Exp. 3** → **Préparer** (1 msg/s, journal vidé).
2. **Lancer les 3 connexions** → les trois cartes doivent afficher **Connecté**.
3. Optionnel : sélectionner **30 s** au chronomètre et **Démarrer**, ou attendre ~30 s à la main (flux stable).
4. **Au même instant** :
   - cliquer **Marquer coupure** dans le dashboard ;
   - lancer dans un terminal **sur la machine qui héberge les serveurs** (souvent WSL) :

   ```bash
   cd backend
   sudo ./utils/simulate-network-cut.sh 5
   ```

5. Observer le dashboard pendant la coupure (statut des cartes, graphiques, messages).
6. Après rétablissement du réseau (~5 s), laisser la **reconnexion auto** ramener les connexions. Noter les temps affichés dans la ligne de statut ou les messages du type `websocket reconnecté en … ms`.
7. **Export journal** → fichier `data/exp3_log_YYYY-MM-DDTHH-MM-SS.csv`.
8. Recommencer depuis l’étape 1 (**Préparer** vide le journal) pour les runs suivants.

> **Ne pas** utiliser **Exporter CSV** (bouton global) pour l’exp. 3 : il exporte les mesures de latence, pas le journal de reconnexion.

## Ce que le code enregistre

Le journal est rempli automatiquement à la déconnexion / reconnexion de chaque protocole. **Marquer coupure** ajoute un événement horodaté.

| Événement | `Protocol` | `Value` | `Latency(ms)` |
|-----------|------------|---------|---------------|
| Coupure marquée | `all` | `-1` | `0` |
| Déconnexion | `websocket` / `sse` / `webtransport` | `0` | `0` |
| Reconnexion | idem | `1` | temps depuis la déconnexion |

Analyse rapide : `python3 data/analyze-experiments.py` (section Expérience 3).

## Métriques à relever

| Protocole | Temps reconnexion (ms) | Comportement UI pendant la coupure |
|-----------|------------------------|-------------------------------------|
| WebSocket | | |
| SSE | | |
| WebTransport | | |

**Comportement UI** (exemples de formulation) :

- *Gel* : dernière valeur / graphique figés, pastille **Reconnexion…** ou **Déconnecté**
- *Erreur* : message WebTransport (`wtError`) ou alerte console
- *Transparent* : reprise sans action utilisateur si **Reconnexion auto** est activée

## Comportement attendu côté client (code actuel)

- **WebSocket** : à la coupure, statut **Reconnexion…** ; retry automatique toutes les **1 s** si **Reconnexion auto** est cochée.
- **SSE** : `EventSource` gère la reconnexion côté navigateur ; le dashboard journalise la déconnexion à la première erreur.
- **WebTransport** : même logique de retry **1 s** que WebSocket si **Reconnexion auto** est cochée.

Désactiver **Reconnexion auto** ou cliquer **Lancer les 3 connexions** pendant la coupure empêche une mesure fiable.

## Interprétation attendue (à confirmer par vos mesures)

- **SSE** : reconnexion souvent native côté navigateur (`EventSource`).
- **WebSocket** : déconnexion nette, reconnexion via la logique client (retry 1 s).
- **WebTransport** : dépend du contexte (certificat / UDP) ; peut être plus lent ou afficher une erreur.

## Dépannage

| Problème | Piste |
|----------|--------|
| Aucune coupure visible | Lancer `sudo` sur la même machine que les serveurs ; le script bloque TCP **3001, 3002, 3003, 4200** et UDP **3003** (INPUT + OUTPUT, y compris `lo`). |
| WebTransport inchangé | Ouvrir l’app via l’IP `WT_SETUP_HOST` (pas `localhost`), sinon le trafic WT ne passe pas par les mêmes règles. |
| Temps de reconnexion `?` | Vérifier **Reconnexion auto** ; ne pas couper manuellement les connexions pendant la mesure. |
| Journal vide à l’export | Attendre les événements disconnect/reconnect ou cliquer **Marquer coupure** avant d’exporter. |
| Pas de messages pendant l’exp. | **Reprendre messages** si les serveurs sont en pause. |
