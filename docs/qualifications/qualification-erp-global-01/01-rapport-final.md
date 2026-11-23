# QUALIFICATION-ERP-GLOBAL-01 — Rapport final

## Périmètre

Qualification locale du correctif `CORRECTIF-ERP-GLOBAL-01` sur le dépôt courant et sur MySQL 8.4 Docker isolé. Aucun commit, push, déploiement, accès production ou écriture en production n'a été effectué.

## Réserves

| Réserve | Résultat | Statut |
|---|---|---|
| Timeout LOT13 | Cause de fragilité du test identifiée et corrigée ; 11/11 sous-tests terminent en 59,9 s | Levée localement, CI non confirmée |
| Cachets sans propriétaire | Base de qualification : 0 sur 10 ; requête production préparée | Non levée en production, accès absent |

## Correction de qualification

Le scénario de rollback LOT13 sélectionnait le premier document de toute la base. Sur une base persistante, celui-ci pouvait référencer un fichier GED appartenant à un ancien volume. Le test mémorise désormais l'identifiant du document créé par sa propre campagne. Aucun code applicatif n'a été modifié pour masquer ou allonger le timeout.

## Résultats principaux

- LOT13 MySQL 8.4 : 11 réussis, 0 échec, 0 annulé, 0 ignoré ;
- B3.2.1 HTTP/MySQL : réussi ;
- migration 133 : checksum, table, PK, index, trois FK restrictives et permission confirmés ;
- inventaire isolé : 10 cachets, 10 propriétaires, 10 affectations, 0 incohérence ;
- RBAC ciblé : 59/59 ; frontend ciblé : 4/4 ;
- navigateur local indisponible : recette visuelle manuelle non exécutée ;
- CI de référence et production non accessibles.

## Verdict

**PRÊT AVEC RÉSERVES.** La qualification locale technique est satisfaisante. Le verdict `PRÊT POUR DÉPLOIEMENT` est interdit tant que LOT13 n'est pas vert dans la CI de référence, que l'inventaire production des cachets historiques n'est pas signé par le responsable et que la recette UI manuelle n'est pas exécutée.
