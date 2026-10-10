# AUDIT-ERP-03 — Anomalies

## Anomalies corrigées

| ID | Gravité | Constat | Correction | Preuve |
|---|---:|---|---|---|
| SALES-CONC-01 | Haute | Deux créations simultanées sur un véhicule pouvaient provoquer `ER_LOCK_DEADLOCK`; l’intégrité restait intacte mais le perdant recevait 500. | Transaction de création exécutée avec reprise bornée sur deadlock. | MySQL 8.4 : réponses `[201, 409]`, une vente active, véhicule `reserved`. |
| SALES-CANCEL-DELIVERY-01 | Haute | Une vente annulée exposait encore l’autorisation financière de livraison et l’API n’interdisait pas explicitement sa création. | Masquage frontend et refus API 409 sous `FOR UPDATE`. | Recette navigateur + tests backend/frontend. |
| TEST-SALES-01 | Moyenne | Le test MySQL utilisait un JWT sans session et supposait un Super Admin opérationnel. | Jeton de test avec session et rôle commercial dynamique minimal. | Test d’intégration vert. |
| TEST-SALES-02 | Faible | Plusieurs assertions textuelles attendaient d’anciens champs TTC, une ancienne politique GED ou des rôles codés en dur. | Assertions alignées sur les contrats actuels. | Tests ciblés verts. |

## Anomalies non démontrées

- Aucune double vente persistée.
- Aucune libération du stock après refus d’annulation financière.
- Aucune facture active créée après annulation dans les scénarios testés.
- Aucune transition sortante de `cancelled` ou `delivered` trouvée.
- Aucun contournement RBAC démontré dans les routes ventes auditées.

## Dette observée hors correction contrôlée

- La suite globale échoue sur 39 fichiers backend et 31 tests frontend. Beaucoup sont des tests de lecture de source par expressions régulières, désynchronisés de refactorings valides; d’autres couvrent CRM, GED, SAV, notifications, pièces et paramètres hors périmètre.
- Le dialogue natif `window.prompt` utilisé pour saisir le motif d’annulation est peu testable et moins accessible qu’une modale contrôlée.
- Le premier bootstrap de la base jetable a utilisé un `dist` ancien et s’est arrêté au niveau 074. Après compilation du code courant, le bootstrap a correctement atteint 079 : il s’agit d’un risque d’exploitation d’artefact périmé, pas d’une anomalie des migrations 077–079.
