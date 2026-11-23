# CORRECTIF-ERP-GLOBAL-01 — Rapport général

## Résultat

Le lot corrige la propriété et le partage des cachets, la création des catégories, la délégation des ressources centrales, les contrats frontend/API et les tests obsolètes. Aucune donnée de production, aucun déploiement, commit ou push n'a été effectué.

**Verdict final : VALIDÉ AVEC RÉSERVES.** La suite backend complète est verte (`2 088` réussites, `0` échec, `104` scénarios conditionnels ignorés), les builds backend et frontend réussissent, la migration 133 et l'intégration B3.2.1 réussissent sur MySQL 8.4 isolé. La réserve restante concerne uniquement le timeout du scénario historique LOT13 décrit ci-dessous et la régularisation humaine des cachets historiques sans propriétaire.

## Corrections livrées

- agence propriétaire d'un cachet dérivée exclusivement de l'agence active côté serveur ;
- affectations multi-agences explicites et transactionnelles, avec permission `stamp.assign_agencies` ;
- consultation et utilisation d'un cachet conditionnées par une affectation à l'agence active ;
- modification, versionnement, statut, révocation et suppression réservés à l'agence propriétaire ;
- catégories communes à la concession active, sans `agencyId` artificiel ;
- cases à cocher accessibles, sélection totale/partielle et propriétaire verrouillé ;
- ressources centrales délégables autorisées par permission `AGENCY`, avec helper système distinct ;
- barèmes, services/checklists de livraison, affectations d'utilisateurs et administration 2FA alignés ;
- résolution des rôles d'agence lors de l'application automatique des marques documentaires ;
- assertion VIN et tests consacrant l'ancien verrou Super Admin corrigés.

## Fichiers structurants

- `backend-node/database/migrations/133_service_stamp_agency_assignments.sql`
- `backend-node/src/modules/document-marks/document-mark.routes.ts`
- `backend-node/src/modules/document-marks/document-mark-policy.service.ts`
- `backend-node/src/modules/rbac/agency-authorization.ts`
- `frontend/src/modules/settings/DocumentMarksSettings.tsx`
- `frontend/src/api/documentMarkHooks.ts`
- tests `correctif-erp-global-01` et intégrations cachets B3.2.1/LOT13.

## Décisions

Le propriétaire est immuable dans ce lot. Le partage concerne l'usage, pas la propriété. Les cachets historiques sans agence ne sont ni attribués, ni supprimés, ni partagés : ils restent en état sûr jusqu'à régularisation humaine. Les seuls scopes actifs restent `OWN` et `AGENCY`.

## Réserve de qualification

Le scénario MySQL B3.2.1 enrichi est vert. Le scénario LOT13 a validé ses six premiers groupes, puis son ancien cas de concurrence par hook a expiré à 300 secondes dans le conteneur éphémère ; il n'a révélé aucune assertion fonctionnelle en échec avant l'expiration. Cette réserve est détaillée dans le rapport de tests.
