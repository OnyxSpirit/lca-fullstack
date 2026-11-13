# Matrice de corrections et validations

| ID | Cause | Correction principale | Preuve | Statut |
|---|---|---|---|---|
| FE-001 | colonne technique absente | migration 125 + index de découverte | build backend, test contrat | Validé hors MySQL |
| FE-002 | compte absent du payload | jointure sur mouvement réel | test comptabilité ciblé | Validé hors MySQL |
| FE-003 | garde `billing.view` unique | garde dynamique composite | tests RBAC | Validé |
| FE-004 | moyens sans destination | endpoint contextuel + état vide bloquant | tests frontend/backend | Validé hors navigateur |
| FE-005 | aucune correction de saisie | table, permission, endpoint, mouvement inverse | test contrat | Validé hors MySQL |
| FE-006 | `methods[0]` | initialisation vide | test frontend | Validé |
| FE-007 | date/justificatif absents | date métier + date serveur + configuration justificatif | lint/build | Partiel : téléversement intégré réservé |
| EV-DYN | compte choisi impossible | `treasuryAccountId` obligatoire et revalidé | tests ciblés | Validé hors MySQL |
| EV-MULTI | unicité trop restrictive | unicité agence/moyen/compte | migration 125 | Validé statiquement |
| EV-CANCEL | correction ≠ remboursement | annulation idempotente et contrepassée | tests ciblés | Validé hors MySQL |

Fichiers structurants : `billing.routes.ts`, `treasury-flow.service.ts`, `accounting-integration.service.ts`, `InvoicePaymentComponents.tsx`, `erpHooks.ts`, migration 125.
