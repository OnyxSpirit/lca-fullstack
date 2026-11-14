# Plan de correction et de développement

## Lot 1 — décision et sécurisation du transfert

1. Formaliser qui autorise une sortie et une entrée de véhicule.
2. Séparer “changer d’emplacement” et “transférer d’agence” dans l’API et l’UI.
3. Implémenter le transfert avec validation des deux périmètres, verrou `FOR UPDATE`, mise à jour agence/emplacement, mouvement, statut éventuel, GED et notifications.
4. Ajouter tests de concurrence, révocation de permission, destination inactive et rollback documentaire.

## Lot 2 — ergonomie stock

1. Ajouter `minPrice`, `maxPrice`, `sortBy`, `sortDirection` sur une liste blanche backend.
2. Définir si le prix filtré est le prix public, minimum ou catalogue, et masquer ce qui relève de `vehicles.financials.view`.
3. Ajouter les contrôles UI, conserver les filtres dans l’URL si souhaité, tester pagination et bornes.

## Lot 3 — complétude Client 360°

1. Exposer l’édition du client depuis la fiche avec le formulaire existant ou un composant dédié.
2. Exposer modification et suppression des contacts.
3. Arbitrer l’archivage des contacts avant de remplacer le `DELETE` physique.

## Lot 4 — cycle de vie CRM

Arbitrer le besoin d’archivage/désactivation distinct de la perte d’opportunité. Définir effets sur doublons, reporting, relances, conversion et conservation légale avant développement.

## Ordre recommandé

`STOCK-001` est prioritaire et potentiellement bloquant. Les lots 2 et 3 améliorent la couverture opérationnelle. Le lot 4 ne doit démarrer qu’après décision métier. Chaque lot doit conserver les tests RBAC dynamiques et ajouter une recette multi-agences explicite.
