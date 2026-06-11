# Expérience 3 — Résilience (coupure réseau 5 s)

## Prérequis

- Les 3 serveurs backend + dashboard Angular démarrés (voir README).
- Fréquence **1 msg/s** (bouton *Préparer exp. 3* dans le dashboard).
- WebTransport : ouvrir l’app via l’IP indiquée dans `wt-config.ts` (pas `localhost`), Chrome lancé avec `./backend/utils/launch-chrome-webtransport.sh` si besoin.

## Déroulement (≈ 5 min)

1. Dashboard → **Préparer exp. 3** puis **Connecter les 3**.
2. Attendre **30 s** (flux stable, pastilles vertes).
3. **Effacer le journal exp. 3** (bouton dédié).
4. **Marquer début coupure** (au même instant que la commande ci-dessous).
5. Dans un terminal **sur la machine qui héberge les serveurs** (souvent WSL) :

   ```bash
   cd backend
   sudo ./utils/simulate-network-cut.sh 5
   ```

6. Observer le dashboard pendant la coupure (statut, valeurs, graphiques).
7. Après reconnexion des 3 protocoles, noter les **temps de reconnexion** affichés.
8. **Exporter journal exp. 3** → fichier `data/exp3_log_*.csv`.
9. Répéter **2–3 fois** et reporter la moyenne dans le tableau ci-dessous.

## Métriques à relever

| Protocole | Temps reconnexion (ms) | Comportement UI pendant la coupure |
|-----------|------------------------|-------------------------------------|
| WebSocket | | |
| SSE | | |
| WebTransport | | |

**Comportement UI** (exemples de formulation) :

- *Gel* : dernière valeur / graphique figés, pastille rouge ou « reconnexion… »
- *Erreur* : message explicite (`wtError`, console)
- *Transparent* : reprise sans action utilisateur, indicateur de reconnexion bref

## Interprétation attendue (à confirmer par vos mesures)

- **SSE** : reconnexion souvent native côté navigateur (`EventSource`).
- **WebSocket** : déconnexion nette, reconnexion via la logique client (retry 1 s).
- **WebTransport** : dépend du contexte (certificat / UDP) ; peut être plus lent ou afficher une erreur.

## Dépannage

| Problème | Piste |
|----------|--------|
| Aucune coupure visible | Lancer `sudo` sur la même machine que les serveurs ; vérifier les ports 3001–3003, 4200. |
| WebTransport inchangé | Coupure peut ne pas toucher WT si l’app est sur une IP non bloquée — utiliser l’IP WSL du certificat. |
| Temps de reconnexion vide | Vérifier que *Reconnexion auto* est activée et que vous n’avez pas cliqué *Tout déconnecter* pendant la coupure. |
