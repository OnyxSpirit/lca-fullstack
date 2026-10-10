# AUDIT-ERP-03 — Rapport d’audit des ventes automobiles

Date : 10 octobre 2026  
Verdict : **VALIDÉ AVEC RÉSERVES**

## Synthèse

Le parcours de vente a été contrôlé dans le code, par tests ciblés, sur une base MySQL 8.4 jetable et dans un navigateur isolé. Les invariants essentiels sont présents : périmètre agence, véhicule disponible, verrouillage transactionnel, idempotence, calcul fiscal configuré, historique, permissions dynamiques, garde financière avant préparation/livraison et annulation atomique.

Deux anomalies techniques démontrées ont été corrigées :

1. Deux créations concurrentes sur le même véhicule préservaient l’intégrité en base, mais la requête perdante pouvait répondre 500 sur interblocage MySQL. La création utilise désormais le mécanisme commun de reprise sur deadlock et répond 409.
2. Une vente annulée pouvait encore afficher et accepter une nouvelle autorisation financière de livraison. Le frontend masque désormais le panneau et l’API refuse sous verrou avec HTTP 409.

## Périmètre audité

- Création depuis le module, préremplissages client/prospect, véhicule et références CRM.
- Disponibilité, réservation, vente, annulation et remise en stock des véhicules VN/VO.
- Prix HT/TTC, TVA configurée, remise, seuil minimum et coût de revient.
- Workflow réel, facture véhicule, paiement, planning et livraison.
- Historique, notifications, archives documentaires et journal d’audit.
- RBAC dynamique et portées OWN/AGENCY/CONCESSION/ALL.
- Concurrences création/création, annulation/facture et annulation/paiement.

## Résultats fonctionnels

- La création produit directement une vente `reserved`, une réservation active et le statut véhicule `reserved`.
- Le véhicule doit appartenir à l’agence cible, être un stock commercial non archivé et être disponible.
- Une remise directe requiert `sales.discount.manage`; le champ est vide à l’ouverture et devient zéro uniquement pour calcul/soumission.
- La fiscalité est issue de la configuration d’agence et le backend recalcule les montants.
- `ordered -> confirmed` représente la confirmation commerciale et ne dépend pas encore d’une facture.
- `confirmed -> preparation` et `preparation -> ready_for_delivery` sont bloqués sans situation financière admissible.
- La livraison effective est finalisée uniquement par le module Livraisons.
- L’annulation exige un motif, annule réservations et factures non payées, libère le véhicule et refuse tout paiement confirmé ou livraison engagée.
- `cancelled` et `delivered` sont terminaux.

## Recette navigateur isolée

Sur `http://127.0.0.1:4175`, avec backend isolé `3003` et MySQL jetable `33320` : création d’une vente de 20 000 000 XAF HT, remise 500 000 XAF, TVA 18,9 %, total 23 185 500 XAF. Le stock visible est passé de 17 à 16. Après annulation, la vente affiche « Annulé » et ne propose plus confirmation, annulation, planning, facture ni autorisation financière de livraison. Une création de facture par API après annulation renvoie 409.

Le service existant publié sur le port **3001 n’a pas été interrompu**.

## Corrections apportées

- `sale.service.ts` : reprise contrôlée des deadlocks à la création.
- `delivery.routes.ts` : verrouillage/lecture du statut et refus d’autorisation après annulation.
- `SaleDetailPage.tsx` : suppression du panneau d’autorisation sur vente annulée.
- Tests MySQL : session authentifiée réaliste, rôle dynamique, double vente concurrente.
- Tests de contrat devenus obsolètes : alignement sur les champs HT, la politique GED et le RBAC dynamique.

## Conclusion

Les cinq contrôles obligatoires VENTE-01 à VENTE-05 sont validés après correction. La réserve principale ne porte pas sur l’intégrité du parcours audité mais sur la suite globale du dépôt, qui comporte de nombreux tests textuels obsolètes ou fragiles. Aucun déploiement, commit, push, migration historique ou changement de base persistante n’a été effectué.
