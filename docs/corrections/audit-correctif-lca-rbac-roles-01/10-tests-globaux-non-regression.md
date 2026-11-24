# Tests globaux et non-régression

| Contrôle | Résultat |
|---|---|
| TypeScript/lint backend | Réussi |
| TypeScript/lint frontend | Réussi |
| Build backend | Réussi |
| Build frontend | Réussi, 2 553 modules, 1 min 14 s |
| Backend ciblé | 24 réussis, 0 échec |
| Frontend ciblé observable | 3 réussis, 0 échec |
| MySQL 8.4/HTTP | 1 réussi, 0 échec |
| Contrat backend | 2 réussis, 0 échec |
| Suite backend complète | 2 199 tests : 2 094 réussis, 0 échec, 105 ignorés explicitement ; 1 546,741 s |
| Suite frontend complète | 1 089 tests : 1 087 réussis, 2 échecs, 0 ignoré ; 398,745 s |
| `git diff --check` | Réussi |

Les deux échecs frontend de la relance chiffrée sont `SETTINGS-FE-07 erreurs, loading et double clic utilisent les mutations` et `LOT14B2B-02 identité, fiscalité et agences restent dans le parent`. Ils portent sur `SettingsPage` et sur sa structure LOT14, fichiers non modifiés par ce correctif. Une exécution précédente de la suite complète avait aussi exposé un échec fluctuant `DEL-CAND-UI` qui n'est pas réapparu à la relance. Ces constats ne sont donc pas masqués ni qualifiés automatiquement d'antérieurs : ils constituent la réserve de non-régression globale.

Les 105 tests backend ignorés par leur propre garde d'environnement ne sont jamais comptés comme réussites. Le test MySQL 8.4 propre à cette mission a été activé et exécuté séparément avec succès.
