# ERP-19 — Bilan consolidé Phase 3

Date : 2026-10-11.

## Verdict

**VALIDÉ. La correction est intégrée dans les conteneurs recette et validée sur Docker, MySQL 8.4, API authentifiée et navigateur réel.**

ERP18-PARTS-01 est corrigé dans le code source : les opérations spécialisées Pièces ne dépendent plus de `service.order.update`, tout en restant limitées par leur permission, leur scope, l'agence de l'OR, son statut et les invariants transactionnels.

## Garanties préservées

- RBAC dynamique, sans nom de rôle ;
- séparation entre modification générale de l'OR et opérations Pièces ;
- refus de `OWN` sur le stock collectif ;
- isolation agence/concession ;
- transactions et verrous existants ;
- disponibilité et cohérence du stock ;
- idempotence des réservations ;
- facturation alimentée uniquement par les consommations effectives ;
- protection renforcée des chemins historiques par `service.order.update` et `parts.stock.adjust`.

## Accessibilité Pièces

Une file minimale `Pièces > Demandes Atelier` est disponible sans permission SAV. Elle expose uniquement le contexte nécessaire à la réservation et à la délivrance, sans données client ou véhicule. Le compte recette disposant des quatre permissions `parts.reservation.*`, de scope `AGENCY`, et ne disposant pas de `service.order.update`, a réservé, consommé et libéré une fixture depuis le navigateur. Son accès direct à `/service/repair-orders/:id` reste refusé.

## Correction complémentaire Phase 3

La concurrence réelle a révélé un deadlock MySQL remonté en HTTP 500 lorsque deux OR réservaient simultanément le même stock. Les deux transactions de réservation utilisent désormais `transactionWithDeadlockRetry`. Après redéploiement ciblé du backend, le scénario rend exactement un succès `201` et un refus métier `409`, sans sur-réservation.

## Docker et données

- backend recette : `288107bcdb0f`, sain, port hôte `3004` ;
- frontend recette : `c80eae9753b5`, sain, port hôte `4176` ;
- MySQL recette : `5e7de0bab86f`, sain, port hôte `33321`, identifiant inchangé ;
- historique : frontend `323a78fc5f2b`, backend `ce40bb9ad897`, MySQL `9b37c86b3190`, tous inchangés et sains ;
- aucun volume, réseau ou port n'a été modifié ;
- démarrage backend : base `VERSIONED`, niveau `>= 79`, aucune migration appliquée.

Les seules écritures de recette sont des ressources préfixées `ERP19-` et leurs mouvements. Les anciennes factures, ventes et OR n'ont pas été modifiés. Une sauvegarde préalable est disponible dans `backups/erp19-pre-update-20261011/` et les images de rollback portent le tag `erp19-pre-update-20261011`.

## État de livraison

Aucun rôle, aucune permission persistée et aucune migration n'ont été ajoutés. Seuls backend et frontend recette ont été reconstruits/remplacés avec `--no-deps`. Aucun commit ni push n'a été effectué.
