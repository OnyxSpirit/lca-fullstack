# ERP-07 — Tests

## API réelle

Campagne idempotente `scripts/stabilisation-erp-07-finances.mjs` : 33 contrôles, 33 réussis lors de la passe finale, aucun HTTP 5xx. Authentification, validations, RBAC, calculs, paiements, avoirs, remboursements, concurrence et PDF inclus.

## Automatisé

- `billing-positive-total.test.ts` : 2/2 réussis ;
- build TypeScript backend : réussi ;
- suite globale observée : 219 tests, 180 réussis, 39 échecs historiques conservés.

## Navigateur

Sur `http://127.0.0.1:4176` : liste agence Nord, KPI, sept factures, filtres et pagination, détail #6, lignes, résumé, historique de deux règlements, avoir, actions PDF/reçu. Aucune page blanche ni texte tronqué bloquant observé.

## MySQL 8.4

Relations ventes/factures/paiements/remboursement, mouvements Treasury, audits, notifications, archives et hash contrôlés en lecture seule.
