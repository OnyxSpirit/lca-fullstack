# Matrice de traçabilité — Facturation & Encaissements

## Légende

- **CONNECTÉ ET COHÉRENT** : contrat et effets concordants par inspection, avec preuve automatisée lorsqu'indiquée.
- **CONNECTÉ PARTIELLEMENT** : parcours opérationnel mais donnée/conséquence incomplète.
- **NON CONNECTÉ** : aucune liaison applicative.
- **CONTRAT INCOHÉRENT** : les deux extrémités existent mais ne parlent pas le même contrat.
- **NON TESTÉ DYNAMIQUEMENT** : inspection concluante sans scénario réel sur MySQL/navigateur.

## Frontend → API → Backend → MySQL → Finance

| # | Fonctionnalité | Chemin UI / composant | Hook / appel | Endpoint et permission | Service / transaction | Tables principales | Trésorerie / comptabilité | Statut / preuve |
|---:|---|---|---|---|---|---|---|---|
| 1 | Liste, recherche, filtres, pagination, agrégats | `/billing` · `BillingPage` | `useInvoicesPageQuery` | `GET /invoices` · `billing.invoice.view` | `accessPredicate`, requêtes paginées | `invoices`, `customers`, `sales`, `repair_orders` | Lecture des montants | CONNECTÉ ET COHÉRENT · statique |
| 2 | Détail facture | `/billing/:id` · `InvoiceDetailPage` | `useInvoiceQuery` | `GET /invoices/:id` · `billing.invoice.view` | `access` | `invoices`, `invoice_items`, `credit_notes` | Expose solde/statut | CONNECTÉ ET COHÉRENT · statique |
| 3 | Création manuelle | Modale « Créer facture » | `useCreateInvoice` | `POST /invoices` · `billing.invoice.create` | `billingTransaction`, `nextDocumentNumber` | `invoices`, `invoice_items`, `document_sequences`, `audit_logs` | Événement comptable après émission, pas au brouillon | CONNECTÉ ET COHÉRENT · tests ciblés |
| 4 | Facture véhicule depuis vente | Même modale avec `saleId` | `useCreateInvoice` | `POST /invoices` · `billing.invoice.create` | verrou vente, contrôle montant/devise/unicité | `sales`, `sale_items`, `invoices`, `invoice_items` | Vente synchronisée au paiement | CONNECTÉ ET COHÉRENT · tests véhicule |
| 5 | Facture atelier | Parcours OR / détail facture | appel atelier | routes atelier · `service.invoice` | transaction atelier | `repair_orders`, `invoices`, `invoice_items` | Facture émise et archivée | CONNECTÉ ET COHÉRENT · statique |
| 6 | Vente directe de pièces | Parcours pièces | appel vente pièces | `POST /part-sales` · `parts.sale.create` | transaction stock/vente/facture | `part_sales`, `part_sale_items`, `invoices`, `invoice_items` | Facture émise | CONNECTÉ ET COHÉRENT · statique |
| 7 | Service de livraison | Parcours livraison | appel service livraison | `POST /deliveries/:id/services` · `delivery.service.add` | transaction livraison/facture | `delivery_services`, `invoices`, `invoice_items` | Facture émise | CONNECTÉ ET COHÉRENT · statique |
| 8 | Modifier brouillon | Détail · action modifier | `useBillingAction` | `PATCH /invoices/:id` · `billing.invoice.update` | `billingTransaction` | `invoices`, `invoice_items`, `audit_logs` | Aucun effet financier avant émission | CONNECTÉ ET COHÉRENT · statique |
| 9 | Émettre facture | Détail · action émettre | `useBillingAction` | `PATCH /invoices/:id/status` · `billing.invoice.issue` | transaction + archivage | `invoices`, `audit_logs`, documents | Découverte `INVOICE_ISSUED` asynchrone | CONNECTÉ PARTIELLEMENT · comptabilité dépend du worker |
| 10 | Annuler facture impayée | Détail · modale annulation | `useBillingAction` | `POST /invoices/:id/cancel` · `billing.invoice.cancel` | `cancelUnpaidInvoice` transactionnel | `invoices`, `sales`, `audit_logs` | Aucun mouvement si impayée | CONNECTÉ ET COHÉRENT · statique |
| 11 | Télécharger/imprimer facture | Détail | `apiDownload`, PDF helpers | `GET /invoices/:id/pdf` · `billing.invoice.view` | rendu brouillon ou archive officielle | `invoices`, `invoice_items`, archives | Aucun | CONNECTÉ ET COHÉRENT · tests documents |
| 12 | Export comptable CSV | Liste | `apiDownload` | `GET /invoices/export/accounting` · `billing.export` | export CSV | `invoices`, `payments`, `credit_notes` | Export, sans écriture | CONNECTÉ ET COHÉRENT · tests FIN01 existants inspectés |
| 13 | Lister moyens de paiement | Modale règlement | `usePaymentMethodsQuery` | `GET /invoices/payment-methods` · `billing.payment.collect` | requête globale active | `payment_methods` | Ne filtre pas la disponibilité du compte | CONNECTÉ PARTIELLEMENT · AUDIT-FE-004 |
| 14 | Encaisser | Détail · `InvoicePaymentForm` | `useInvoicePayment` | `POST /invoices/:id/payments` · `billing.payment.collect` | `billingTransaction`, `applyPayment`, `postAutomaticMovement` | `payments`, `invoices`, `sales`, `treasury_movements`, `audit_logs` | Trésorerie atomique ; comptabilité défaillante | CONNECTÉ PARTIELLEMENT · tests paiement/trésorerie |
| 15 | Choisir compte destinataire | Absent de la modale | Aucun | Aucun endpoint de compatibilité ; corps paiement sans compte | mapping par défaut | `treasury_account_mappings` unique | Destination imposée | NON CONNECTÉ · évolution demandée, pas anomalie |
| 16 | Historique paiements | Détail · `InvoicePaymentHistory` | `useInvoicePaymentsQuery` | `GET /invoices/:id/payments` · `billing.payment.view` | `access`, agrégats remboursement | `payments`, `payment_refunds`, `payment_methods` | Destination non exposée | CONNECTÉ PARTIELLEMENT · dépend de l'évolution |
| 17 | Reçu paiement | Historique | `apiDownload` | `GET /payments/:id/receipt` · `billing.payment.view` | archive métier | `payments`, `invoices`, archives | Aucun | CONNECTÉ ET COHÉRENT · test reçu |
| 18 | Reprise archive reçu | Historique | `useBillingAction` | `POST /payments/:id/receipt/archive` · `billing.payment.collect` | archivage + audit | `payments`, `audit_logs`, archives | Aucun | CONNECTÉ ET COHÉRENT · test reçu |
| 19 | Créer avoir | Détail · modale avoir | `useBillingAction` | `POST /invoices/:id/credit-notes` · `billing.invoice.cancel` | transaction, `recalc` | `credit_notes`, `invoices`, `audit_logs` | Événement comptable asynchrone | CONNECTÉ ET COHÉRENT · tests avoir |
| 20 | Lister avoirs | Détail | données détail + appel dédié | `GET /invoices/:id/credit-notes` · `billing.payment.view` | `access` | `credit_notes` | Aucun | CONNECTÉ ET COHÉRENT · statique |
| 21 | PDF / reprise archive avoir | Détail | `apiDownload`, `useBillingAction` | `GET /credit-notes/:id/pdf`; `POST /credit-notes/:id/archive` | archive métier | `credit_notes`, archives, `audit_logs` | Aucun | CONNECTÉ ET COHÉRENT · tests avoir |
| 22 | Rembourser | Historique · modale remboursement | `useBillingAction` | `POST /payments/:id/refund` · `billing.payment.refund` | transaction, `postPaymentRefundMovement`, `recalc` | `payment_refunds`, `payments`, `credit_notes`, `treasury_movements`, `invoices` | Sortie sur compte originel ; comptabilité défaillante | CONNECTÉ PARTIELLEMENT · tests trésorerie |
| 23 | Annuler un paiement sans remboursement | Aucune action | Aucun | Aucun | Aucun | statut `rejected` inutilisé | Aucune contrepassation dédiée | NON CONNECTÉ · AUDIT-FE-006 |
| 24 | Configurer comptes et mappings | Trésorerie / paramètres | hooks trésorerie | routes `/treasury/accounts`, `/treasury/flow-mappings` · `treasury.account.manage` | `treasury.service`, `treasury-flow.service` | `treasury_accounts`, `treasury_account_mappings` | Détermine le compte par défaut | CONNECTÉ ET COHÉRENT · tests Treasury |
| 25 | Comptabiliser paiement | Pas d'action directe | worker asynchrone | découverte interne | `accounting-integration.service` | `accounting_integration_events`, schémas, écritures | Requête sur colonne absente + destination omise | CONTRAT INCOHÉRENT · AUDIT-FE-001/002 |

## Inventaire des 20 endpoints du routeur facturation

| Méthode | URL | Permission | Entrées essentielles | Transaction / effets |
|---|---|---|---|---|
| GET | `/invoices/payment-methods` | `billing.payment.collect` | — | lecture méthodes actives |
| GET | `/billing/config` | `billing.invoice.view` | agence | lecture configuration |
| GET | `/invoices/export/accounting` | `billing.export` | agence, dates | lecture/export |
| GET | `/invoices` | `billing.invoice.view` | recherche, filtres, page | lecture |
| GET | `/invoices/:id` | `billing.invoice.view` | id, agence active | lecture scoped |
| POST | `/invoices` | `billing.invoice.create` | client, type, source, dates, lignes, taxes, clé | transaction, facture/lignes/audit |
| PATCH | `/invoices/:id` | `billing.invoice.update` | dates, lignes, notes | transaction, brouillon seulement |
| PATCH | `/invoices/:id/status` | `billing.invoice.issue` | `status=issued` | transaction puis archive |
| POST | `/invoices/:id/cancel` | `billing.invoice.cancel` | motif | transaction, impayée seulement |
| GET | `/invoices/:id/payments` | `billing.payment.view` | id | lecture historique/remboursements |
| POST | `/invoices/:id/archive` | `billing.invoice.issue` | id | reprise archive + audit |
| POST | `/payments/:id/receipt/archive` | `billing.payment.collect` | id | reprise reçu + audit |
| POST | `/invoices/:id/payments` | `billing.payment.collect` | moyen, montant, référence, notes, date optionnelle, clé | transaction paiement + mouvement + solde |
| GET | `/invoices/:id/credit-notes` | `billing.payment.view` | id | lecture |
| POST | `/invoices/:id/credit-notes` | `billing.invoice.cancel` | montant, motif, date, clé | transaction avoir + recalcul |
| POST | `/credit-notes/:id/archive` | `billing.invoice.cancel` | id | reprise archive |
| POST | `/payments/:id/refund` | `billing.payment.refund` | avoir, montant, motif, clé | transaction remboursement + mouvement OUT + recalcul |
| GET | `/invoices/:id/pdf` | `billing.invoice.view` | id | rendu/archive PDF |
| GET | `/payments/:id/receipt` | `billing.payment.view` | id | archive PDF |
| GET | `/credit-notes/:id/pdf` | `billing.invoice.view` | id | archive PDF |

## Couverture des scénarios prioritaires

| Scénario | Statique | Automatisé | Intégration MySQL réelle | Navigateur | Conclusion |
|---|---:|---:|---:|---:|---|
| Création facture | Oui | Oui | Non | Non | contrat cohérent |
| Consultation détail | Oui | Oui indirect | Non | Non | cohérent |
| Paiement intégral | Oui | Oui | Non | Non | solde 0, statut paid |
| Paiement partiel | Oui | Oui | Non | Non | cumul correct |
| Paiements multiples | Oui | Oui | Non | Non | supportés |
| Moyens différents | Oui | Partiel | Non | Non | supportés, destinations imposées |
| Dépassement | Oui | Oui | Non | Non | refus 409 |
| Double paiement | Oui | Oui | Non | Non | verrou + solde + idempotence |
| Facture annulée | Oui | Oui UI/policy | Non | Non | refus |
| Facture soldée | Oui | Oui | Non | Non | refus |
| Annulation règlement | Oui | Non | Non | Non | fonctionnalité absente ; remboursement distinct |
| Mouvement trésorerie | Oui | Oui contrat | Non | Non | atomique |
| Écriture comptable | Oui | Non | Non | Non | défauts confirmés |
| Changement agence | Oui | Oui RBAC | Non | Non | scoped ; future sélection à recharger |
| Sans permission | Oui | Oui RBAC | Non | Non | backend protégé ; garde UI incohérente possible |
| Actualisation après paiement | Oui | Oui UI | Non | Non | invalidation + temps réel |
