# Tests et non-régression

## Exécutions

| Contrôle | Résultat |
|---|---|
| LOT13 MySQL 8.4 isolé | 11/11, 0 annulé, 59,9 s |
| B3.2.1 HTTP/MySQL | 1/1 |
| Backend ciblé RBAC/paramètres/livraison/2FA/utilisateurs | 59/59 |
| Frontend ciblé cachets | 4/4 |
| Migration 133 et inventaire SQL | conformes sur qualification |
| Suite backend complète | 2 088 réussis, 0 échec, 104 conditionnels ignorés sur 2 192 |
| Suite frontend complète | 1 083/1 083 réussis |
| TypeScript/lint backend et frontend | Réussis |
| Build backend | Réussi |
| Build frontend | Réussi, 2 552 modules transformés |
| `git diff --check` | Réussi |

## Commandes principales

- `node --import tsx --test ...document-marks-lot13-mysql.integration.test.ts` dans le réseau Docker privé ;
- même commande avec `LCA_B321_MARKS_TEST=1` pour B3.2.1 ;
- `npm test`, `npm run lint`, `npm run build` dans backend et frontend ;
- requêtes `SELECT`, `SHOW CREATE TABLE` et registre `schema_migrations` sur MySQL 8.4 isolé.

## Ignorés et non exécutés

Les suites standards ignorent conditionnellement les intégrations nécessitant des services dédiés ; LOT13 et B3.2.1 ont été activés séparément. CI de référence, données production, recette navigateur manuelle et pentest ne sont pas accessibles et ne sont pas déclarés réussis.

## Incident d'environnement

La première tentative frontend confinée a échoué avant les tests (`tsx` incapable d'ouvrir son socket IPC local, `EPERM`). Elle a été relancée avec l'autorisation locale adaptée. La première tentative LOT13 depuis l'hôte a reçu `ECONNREFUSED`, MySQL n'étant exposé que sur le réseau Docker privé ; la campagne valide a été exécutée dans ce réseau.
