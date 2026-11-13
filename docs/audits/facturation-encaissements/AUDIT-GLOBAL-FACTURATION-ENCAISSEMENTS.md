# Audit global — Facturation & Encaissements

Date de l'audit : 13 novembre 2026  
Nature : inspection et conception, sans modification applicative  
Verdict : **AUDIT COMPLET AVEC RÉSERVES**

## Résumé exécutif

Le parcours opérationnel de facturation et d'encaissement est substantiellement raccordé. Une facture peut être créée manuellement ou provenir d'une vente véhicule, d'un ordre atelier, d'une vente de pièces ou d'un service de livraison. Les factures sont consultables, émises, archivées, payées en une ou plusieurs fois, créditées et remboursées. Les montants sont recalculés côté serveur. Le paiement est protégé par transaction, verrou `FOR UPDATE`, idempotence, contrôle d'agence, contrôle de statut et refus du dépassement.

Le raccordement **Paiement → Trésorerie** est atomique : le paiement, le mouvement entrant et la mise à jour du solde de facture appartiennent à la même transaction MySQL. Il repose toutefois sur un compte unique configuré par agence et moyen de paiement. Le comptable ne peut ni voir ni choisir la destination. Le besoin de sélection dynamique est donc une évolution fonctionnelle réalisable, mais nécessite une migration additive et une évolution du contrat API.

Le raccordement **Paiement → Comptabilité** n'est pas fiable dans l'état audité. Deux défauts confirmés affectent le découvreur asynchrone : il filtre les paiements sur `payments.created_at`, colonne absente du schéma réel, et son événement `PAYMENT_CONFIRMED` ne transporte pas `treasuryAccountId`, pourtant requis pour résoudre une ligne de schéma comptable `TREASURY`. Les remboursements présentent la même omission de destination. Un encaissement peut donc réussir en facturation et en trésorerie tout en restant non comptabilisé.

## Périmètre et méthode

Périmètre : Facturation → Règlements → Encaissements → Trésorerie → Comptabilité, avec les sources commerciales nécessaires, le RBAC, les documents et l'audit.

Niveaux de preuve utilisés :

- **Inspection statique** : code React, hooks, routes Express, services, migrations et baseline SQL.
- **Tests automatisés** : 13 fichiers ciblés exécutés avec succès ; vérifications TypeScript frontend et backend réussies.
- **MySQL en lecture seule** : présence et schéma de `lca_compta_recette_isolee` vérifiés.
- **Test d'intégration réel** : non exécuté, car le caractère jetable de la base isolée n'est pas explicitement établi.
- **Test navigateur** : non exécuté ; aucune donnée de recette ne permettait le scénario financier sans écriture.

La base `lca_compta_recette_isolee` et la base protégée `concession_erp` résident dans le même serveur MySQL. La base isolée contient 6 moyens de paiement, mais aucune agence, facture, écriture ou configuration de trésorerie. Aucune écriture n'a été effectuée.

## Architecture actuelle

### Frontend

Les deux routes principales sont `/billing` et `/billing/:id`, protégées par `ModuleGuard("billing")`, donc par `billing.view`.

Éléments audités :

1. `BillingPage.tsx` : liste, recherche, filtres, pagination, indicateurs, export et création.
2. `InvoiceDetailPage.tsx` : détail, émission, modification du brouillon, PDF, archivage, avoir, annulation, remboursement.
3. `NewInvoiceModal.tsx` : création manuelle ou issue d'une vente, lignes, taxes et idempotence.
4. `InvoicePaymentForm` : saisie du montant, moyen, référence conditionnelle et notes.
5. `InvoicePaymentHistory` : historique, reçu, reprise d'archivage et remboursement.

Les hooks de `erpHooks.ts` assurent les requêtes et invalidations React Query. Après une mutation de paiement, les factures, le détail et les ordres de réparation sont invalidés, y compris en erreur (`onSettled`). Les événements temps réel `billing:invoice-created`, `billing:payment` et assimilés permettent également une actualisation transverse.

### Backend

Le routeur de facturation expose 20 endpoints uniques. Les règles métier de paiement se trouvent dans `payment.domain.ts`; la numérotation dans `document-sequence.ts`; l'annulation dans `invoice-cancellation.service.ts`; la trésorerie dans `treasury-flow.service.ts`; l'automatisation comptable dans `accounting-integration.service.ts`.

Sources de facture identifiées :

- création directe via `POST /invoices` : véhicule lié à une vente, atelier lié à un OR, pièces ou manuel ; résultat initial `draft` ;
- atelier : génération directe d'une facture `issued` dans `workshop.routes.ts` ;
- vente directe de pièces : facture `issued` dans `part-sales.routes.ts` ;
- service complémentaire de livraison : facture `issued` dans `delivery-service.routes.ts`.

Les numéros utilisent `document_sequences` et un verrou transactionnel. Les factures véhicule contrôlent l'unicité de la facture active, le client, l'agence, la vente, la devise et le total de la vente.

## Fonctionnalités et contrôles

### Création, consultation et documents

- Création protégée par `billing.invoice.create` et clé d'idempotence obligatoire.
- Modification limitée au statut `draft`.
- Émission limitée à la transition `draft → issued`, avec instantané d'identité commerciale.
- Annulation limitée aux factures impayées et motivée.
- Liste paginée, recherche, filtres par statut/type/date et agrégats.
- PDF de brouillon rendu à la demande ; documents officiels émis lus depuis l'archive métier.
- Reprise d'archivage disponible pour facture, reçu et avoir.

### Encaissements

Le système accepte plusieurs paiements confirmés par facture. Chaque paiement contient un moyen, un montant, une date serveur ou fournie par l'API, une référence, des notes et une clé d'idempotence. Il ne contient pas de compte de trésorerie destinataire.

Protections vérifiées :

| Situation | Comportement réel |
|---|---|
| Montant nul/négatif | Refus 400 avant transaction |
| Dépassement du solde | Refus 409 par `applyPayment` |
| Facture soldée/annulée/brouillon | Refus 409 |
| Facture inexistante/hors agence | 404/403 via `access` et RBAC dynamique |
| Moyen inactif/inexistant | Refus 400 |
| Référence obligatoire absente | Refus 400 |
| Double requête même clé | Retour idempotent de l'opération existante |
| Clé réutilisée sur autre facture | Refus 409 |
| Paiements concurrents | Sérialisés par verrou de facture `FOR UPDATE` |
| Devise incompatible | Refus lors de la création du mouvement de trésorerie |
| Compte/mapping absent ou inactif | Refus de toute la transaction |

Cas 14 000 000 FCFA :

- 5 000 000 puis 10 000 000 : le second paiement est refusé, le premier reste intact et le solde demeure 9 000 000.
- 5 000 000 puis 9 000 000 : la facture devient `paid`, `amount_paid=14 000 000`, `balance_due=0`.
- Dans l'état actuel, les deux paiements peuvent utiliser des moyens différents, mais chaque moyen est routé vers son unique compte par défaut. L'affectation libre à deux destinations distinctes n'est pas disponible.

Il n'existe pas d'annulation simple d'un règlement confirmé. Le parcours financier disponible est un remboursement adossé à un avoir. C'est traçable et cohérent financièrement, mais ne couvre pas explicitement la correction d'une erreur de saisie avant remise effective des fonds.

## Analyse de la modale actuelle

Champs présents : montant, moyen de paiement, référence conditionnelle, notes. La date de paiement acceptée par le backend n'est pas exposée. Aucun justificatif n'est téléversable. Aucun compte destinataire n'est affiché ni envoyé.

À l'ouverture, le code sélectionne automatiquement le premier moyen retourné (`methods[0]`) alors que la liste contient une option « Sélectionner ». Cela rend l'état initial dépendant du tri serveur et contredit le comportement cible non sélectionné. Le succès n'est affiché qu'après résolution de la mutation API. Les erreurs API sont montrées dans un toast.

## Analyse MySQL

17 tables principales ou transverses sont concernées : `invoices`, `invoice_items`, `payments`, `payment_methods`, `payment_refunds`, `credit_notes`, `document_sequences`, `treasury_accounts`, `treasury_account_mappings`, `treasury_movements`, `accounting_treasury_mappings`, `accounting_integration_events`, `accounting_entries`, `accounting_entry_lines`, `accounting_schemes`, `accounting_scheme_lines`, `audit_logs`.

Constats structurants :

- `payments` n'a ni `treasury_account_id` ni `created_at`.
- `treasury_movements.account_id` conserve la destination réelle et possède une FK vers `treasury_accounts`.
- `treasury_accounts` porte agence/concession, type `CASH|BANK|OTHER`, devise et statut actif.
- `treasury_account_mappings` associe une agence et un moyen à un compte.
- L'index unique `uq_treasury_mapping_context(agency_id,payment_method_id)` interdit plusieurs destinations compatibles pour un même couple.
- Un compte peut être référencé par plusieurs mappings ; un moyen ne peut avoir qu'un compte par agence.
- `accounting_treasury_mappings` relie le compte de trésorerie au compte comptable avec dates d'effet.

Une migration additive est nécessaire pour persister la destination choisie sur `payments` et transformer la configuration de compatibilité d'un mapping unique en relation multiple. Le mouvement de trésorerie reste la source financière de vérité ; la FK sur le paiement constitue le snapshot explicite et facilite l'audit, le remboursement et l'intégration comptable.

## Trésorerie

`postAutomaticMovement` résout actuellement le mapping actif `(agency_id, payment_method_id)`, vérifie readiness, périmètre, activité et devise, puis insère un mouvement. Le paiement et le mouvement sont atomiques. L'unicité `(source_type, source_id, event_type)` empêche les doublons.

Le remboursement recherche le mouvement `PAYMENT` originel et reprend son `account_id`, même si le mapping courant a changé. Ce choix est correct. Les comptes et mappings sont administrables dans l'espace Trésorerie avec `treasury.account.manage`.

## Comptabilité

La comptabilisation est asynchrone et séparée de la transaction d'encaissement. Le worker découvre des événements puis applique un schéma et ses lignes. Les lignes `TREASURY` résolvent `payload.treasuryAccountId` via `accounting_treasury_mappings`.

Défaillances confirmées :

1. la requête de découverte des paiements utilise `p.created_at`, colonne inexistante ;
2. les payloads de paiement et remboursement ne contiennent que `amount`, sans `treasuryAccountId` ;
3. les mouvements `PAYMENT` et `PAYMENT_REFUND` sont volontairement exclus du flux générique `TREASURY_MANUAL_POSTED`, donc aucun second chemin ne répare l'omission.

Le mécanisme asynchrone évite une double comptabilisation grâce aux `source_key` uniques, mais il permet un succès métier avant comptabilisation. La supervision `REGULARIZE/FAILED` est adaptée à l'asynchronisme ; elle ne compense pas les deux défauts de contrat ci-dessus.

## RBAC et multi-agences

Permissions métier recensées : `billing.view`, `billing.invoice.view`, `billing.invoice.create`, `billing.invoice.update`, `billing.invoice.issue`, `billing.invoice.cancel`, `billing.payment.view`, `billing.payment.collect`, `billing.payment.refund`, `billing.export`, `treasury.view`, `treasury.account.manage`.

Les endpoints sensibles appliquent le scope dynamique AGENCY/CONCESSION/GLOBAL et revérifient l'agence de la facture. Les comptes de destination devront être filtrés avec le scope de collecte et non exiger le droit d'administration `treasury.account.manage`.

Réserve : les routes React exigent `billing.view`, alors que la page et les endpoints reposent sur des permissions granulaires. Une attribution dynamique contenant `billing.invoice.view` sans `billing.view` donne un refus frontend malgré une API autorisée.

## Risques et anomalies

Le registre retient 7 anomalies : 0 P0, 2 P1, 3 P2 et 2 P3. Aucune action frontend existante n'est totalement non raccordée ; la sélection dynamique est une évolution, pas une anomalie. Les risques majeurs sont la non-comptabilisation des encaissements/remboursements et l'absence de choix/persistance explicite de destination pour l'évolution demandée.

## Tests exécutés

- Backend : 7 fichiers ciblés réussis (`commercial-payments`, `treasury-flow`, `billing-positive-total`, `billing-dynamic-rbac`, `invoice-veh-lock`, `billing-creditnote`, `document-payment-receipt`).
- Frontend : 6 fichiers ciblés réussis (`billing-pay-button`, `billing-dynamic-rbac`, `invoice-veh-lock`, `billing-creditnote`, `treasury-flow`, `billing-stabilization`).
- `npm run lint` (TypeScript sans émission) : réussi frontend et backend.
- MySQL : SELECT d'inventaire, colonnes, index, FK et référentiels sur la base isolée.

Les 16 scénarios prioritaires ont été couverts par inspection statique ; 9 disposent en plus d'une preuve automatisée existante. Aucun scénario transactionnel réel ni navigateur n'a été exécuté, faute d'autorisation explicite d'écriture sur une base jetable.

## Verdict

**AUDIT COMPLET AVEC RÉSERVES**.

L'architecture, les contrats, les données et les protections ont été cartographiés avec preuves statiques, automatisées et MySQL en lecture seule. La réserve porte sur l'absence de test d'intégration réel et navigateur, volontairement non exécutés pour protéger les données. Les corrections comptables P1 doivent précéder l'implémentation du sélecteur dynamique.
