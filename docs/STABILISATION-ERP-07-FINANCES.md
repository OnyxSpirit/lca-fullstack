# STABILISATION-ERP-07 — Finances

## Verdict

Recette financière **VALIDÉE AVEC RÉSERVES** sur `lca-recette` uniquement (frontend 4176, API 3004, MySQL 33321). Les invariants facture/paiement/avoir/remboursement/trésorerie sont cohérents. Deux défauts techniques ont été reproduits puis corrigés : facture de total nul et interblocage lors d'une création concurrente idempotente.

## Cartographie réelle

| Capacité | Frontend | API | Persistance | Permission |
|---|---|---|---|---|
| Liste/détail facture | `/billing`, `/billing/:id` | `GET /invoices`, `GET /invoices/:id` | `invoices`, `invoice_items` | `billing.invoice.view` |
| Création/édition/émission | modale + détail | `POST /invoices`, `PATCH /invoices/:id`, `PATCH /invoices/:id/status` | factures, séquences, audits, documents | create/update/issue |
| Encaissement/reçu | détail facture | `POST /invoices/:id/payments`, `GET /payments/:id/receipt` | `payments`, `treasury_movements`, `documents` | collect/view |
| Annulation | détail facture | `POST /invoices/:id/cancel` | facture + audit | `billing.invoice.cancel` |
| Avoir/remboursement | détail facture | `POST /invoices/:id/credit-notes`, `POST /payments/:id/refund` | `credit_notes`, `payment_refunds`, Treasury | cancel/refund |
| Export | liste | `GET /invoices/export/accounting` | lecture agrégée | `billing.export` |
| Autorisation de livraison | livraison | routes livraison/finance | `delivery_financial_authorizations` | permissions livraison/finance |

## État initial protégé

- Vente #2 : livrée, facture #1 partiellement payée, total 16 943 250 XAF, encaissé 3 388 650 XAF, solde 13 554 600 XAF, autorisation #1 `USED`, livraison #2 et véhicule #3 livrés.
- Vente #5 : livrée, facture #2 payée, total/encaissé 45 776 500 XAF, solde nul, livraison #1 et véhicule #7 livrés.
- Vente #4 : annulée, aucune facture active ni livraison, véhicule #4 disponible.

## Résultat REC07

La facture #6 `FAC-REC01A2-2026-000006` totalise 1 189 000 XAF (HT 1 000 000, TVA configurée 18,9 %). Deux paiements de 189 000 et 1 000 000 XAF l'ont soldée. Un avoir de 100 000 XAF suivi d'un remboursement interne de 100 000 XAF donne encaissé net 1 089 000 XAF et solde nul. La facture #7 non payée a été annulée via l'API officielle.

## Couverture

55 scénarios prévus, 48 exécutés, 45 validés, 3 partiels, 0 non validé, 0 bloqué, 7 non exécutés. Les cas non exécutés concernent notamment une seconde concession officielle, l'impression physique, l'envoi externe et des politiques métier volontairement hors périmètre.
