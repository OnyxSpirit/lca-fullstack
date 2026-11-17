# Matrice des fonctionnalités

| Fonctionnalité | UI | Endpoint principal | Permission | Tables | Statut |
|---|---|---|---|---|---|
| Liste factures | `/billing` | `GET /invoices` | `billing.invoice.view` | invoices, customers | Automatisé + navigateur sur état vide |
| Créer/émettre | `/billing`, détail | `POST /invoices`, `PATCH /status` | create/issue | invoices, invoice_items | Automatisé |
| Encaisser | détail facture | `POST /invoices/:id/payments` | `billing.payment.collect` | payments, treasury_movements | Moteur conforme, recette non configurée |
| Avoir/rembourser | détail facture | credit-notes, refund | cancel/refund | credit_notes, payment_refunds | Automatisé |
| Comptabilité | `/treasury/accounting` | `/accounting/*` | `accounting.*` | accounting_* | Automatisé, 2 régularisations |
| Comptes/caisses | `/treasury/settings` | `/treasury/accounts` | account.manage | treasury_accounts | Vide en recette |
| Entrées/sorties | `/treasury/operations` | manual operations | receipt/disbursement.create | treasury_manual_operations, movements | Vide en recette |
| Transferts | `/treasury/operations` | treasury transfers | transfer.create | treasury_transfers, movements | Vide en recette |
| Rapprochement | `/treasury/reconciliation` | bank statements/reconciliations | reconciliation.* | bank_* | Vide en recette |
| Reporting | `/treasury` | financial dashboard/export | reporting.* | vues multi-tables | Automatisé |
