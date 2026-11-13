# Rapport de non-régression

## Contrôles réussis

| Contrôle | Résultat |
|---|---|
| TypeScript backend `npm run build` | Réussi |
| TypeScript frontend `npm run lint` | Réussi |
| Build Vite production `npm run build` | Réussi |
| Diff `git diff --check` | Réussi |
| VIN/livraison frontend ciblé | 3/3 |
| Livraison backend ciblée | 7/7 |
| Identité/pied documentaire | 10/10 |
| PDF comptable multipage | 2/2 |

## Sécurité et données

- Les gardes `delivery.signature.capture`, `delivery.complete` et `accounting.advanced.export` sont conservées.
- L’identité PDF comptable est résolue depuis l’agence RBAC active.
- Les requêtes métier existantes conservent leurs scopes ; aucune permission ni migration arbitraire n’a été ajoutée.
- Aucune écriture MySQL n’a été exécutée. La base `concession_erp` n’a pas été touchée.
- Aucun commit, push ou déploiement n’a été effectué.

## Échecs hors périmètre observés

Une invocation initiale de `npm test -- --test-name-pattern=...` a déclenché toute la suite frontend à cause du positionnement de l’argument et a révélé des échecs préexistants Facturation/Paiements. Les tests ciblés ont ensuite été lancés directement et sont verts. Ces échecs ne sont pas attribués aux fichiers modifiés, mais la suite frontend complète n’est donc pas déclarée verte.

## Réserves

Pas de recette navigateur, impression physique, base isolée, multi-agence réelle ni génération GED réelle. Les flux Devis, pro-forma, ventes, facturation, avoirs, remboursement, SAV, magasin et trésorerie n’ont pas été rejoués de bout en bout.
