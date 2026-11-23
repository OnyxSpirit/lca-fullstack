# Tests globaux et non-régression

| Contrôle | Résultat |
|---|---|
| Backend build TypeScript | Réussi |
| Backend complet | 2 196 tests : 2 092 réussis, 0 échec, 104 ignorés, 744,456 s |
| Frontend lint TypeScript | Réussi |
| Frontend build Vite | Réussi |
| Ciblés backend/PDF | 44/44 réussis |
| Frontend correctif | 3/3 réussis |
| B3.2.1 MySQL 8.4 | 1/1 réussi |
| LOT13 MySQL 8.4 | 7 réussis puis blocage concurrence |
| Frontend complet | 1 échec connu hors périmètre (`LOT14B2B-02`) |
| `git diff --check` | Réussi |

La suite backend complète a terminé avec un code de sortie 0. Les 104 intégrations optionnelles ignorées par défaut ne sont pas comptées comme preuve ; B3.2.1 et LOT13 ont donc été lancés séparément sur MySQL 8.4.

Les changements sont limités aux routes/service de marques et livraison, à la vue Paramètres, à un composant dédié et aux tests associés. Les documents d'audit préexistants non suivis n'ont pas été modifiés.
