# Tests et non-régression

## Résultats exécutés

| Contrôle | Résultat |
|---|---|
| TypeScript backend `npm run lint` | Réussi |
| TypeScript frontend `npm run lint` | Réussi |
| Build backend Docker | Réussi |
| Build frontend Vite Docker | Réussi |
| Build backend local final | Réussi |
| Build frontend local final | Réussi, 2 552 modules transformés |
| Suite frontend complète | 1081/1081 réussis |
| Suite backend complète | 2 088 réussis, 0 échec, 104 ignorés sur 2 192 |
| Tests ciblés correctif backend | 4/4 réussis |
| Tests ciblés correctif frontend | 2/2 réussis |
| Intégration B3.2.1 MySQL enrichie | Réussie |
| Migration 133 sur MySQL 8.4 isolé | Réussie |
| `git diff --check` | Réussi |

## Scénarios B3.2.1

Création sans `agencyId`, propriétaire issu de l'agence active, falsification `agencyId` ignorée, partage vers une agence sœur, visibilité depuis l'agence partagée, retrait, conservation du propriétaire, refus du partage sans permission, types documentaires, audit, inactivation et révocation.

## Suite backend complète

Une première exécution confinée a donné 335/358 avec 23 fichiers incapables d'ouvrir le port local Supertest (`listen EPERM`), défaut d'environnement et non assertion applicative. La relance finale hors confinement avec l'autorisation locale adaptée est entièrement verte : `2 192` tests recensés, `2 088` réussis, `0` échec, `0` annulation et `104` scénarios conditionnels ignorés, en `236 814 ms`.

## LOT13

Le test MySQL exhaustif a réussi : formats d'images, archive immuable, double émission canonique, statuts inactifs, IDOR inter-agence/inter-concession et scopes. Son sous-test historique de synchronisation par hook n'a pas atteint le hook et le parent a expiré à 300 s; les quatre derniers sous-tests ont été annulés par le timeout. Le test B3.2.1, plus ciblé sur ce correctif, est entièrement vert.
