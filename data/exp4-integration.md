# Expérience 4 — Complexité d'intégration

Évaluation qualitative du coût de développement (pas de CSV automatique).

## Grille de notation (1 = facile, 5 = difficile)

| Critère | WebSocket | SSE | WebTransport |
|---------|-----------|-----|--------------|
| Configuration initiale (certificats, ports, dépendances) | | | |
| Code client (connexion, réception, reconnexion) | | | |
| Code serveur | | | |
| Débogage / messages d'erreur | | | |
| Documentation / support navigateur | | | |
| **Total** | | | |

## Notes libres

### WebSocket
- Points forts :
- Points faibles :

### SSE
- Points forts :
- Points faibles :

### WebTransport
- Points forts :
- Points faibles :

## Conclusion (exemple)

> WebSocket et SSE s'intègrent rapidement en local. WebTransport demande un certificat, une IP spécifique sous WSL et un polyfill navigateur, ce qui augmente nettement le temps de mise en place.
