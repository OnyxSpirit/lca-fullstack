# Rapport de non-régression

## Suites globales définitives

| Contrôle | Résultat |
|---|---:|
| Backend `npm test` | 2 215 tests ; 2 112 réussis ; 103 ignorés conditionnellement ; 0 échec |
| Frontend `npm test` | 1 047 réussis ; 0 échec |
| Backend `npm run lint` | Réussi |
| Backend `npm run build` | Réussi |
| Frontend `npm run lint` | Réussi |
| Frontend `npm run build` | Réussi |
| Build Docker frontend | Réussi, 2 547 modules transformés |
| Bootstrap MySQL isolé | Niveau 129, 0 avertissement historique |

Le premier lancement backend sous sandbox a produit des refus `EPERM` sur les tests ouvrant des ports locaux. Il a été interrompu puis intégralement rejoué dans l’environnement autorisé : résultat final 0 échec. Le premier lancement frontend a rencontré le même refus IPC `tsx`, puis le rejeu autorisé a réussi à 1 047/1 047. Ces incidents d’exécution ne sont pas des anomalies du produit.

Les 103 tests backend ignorés sont des intégrations conditionnelles explicitement marquées `SKIP` lorsqu’elles exigent leur propre MySQL/HTTP jetable ; les scénarios MySQL financiers requis ont été exécutés séparément sur MySQL 8.4 réel et sont réussis.

Verdict : aucune régression imputable au lot financier.
