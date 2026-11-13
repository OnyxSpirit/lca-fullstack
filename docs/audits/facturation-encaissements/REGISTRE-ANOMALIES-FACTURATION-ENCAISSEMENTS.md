# Registre des anomalies — Facturation & Encaissements

## Synthèse

| Priorité | Nombre |
|---|---:|
| P0 | 0 |
| P1 | 2 |
| P2 | 3 |
| P3 | 2 |
| **Total** | **7** |

La sélection dynamique du compte destinataire n'est pas comptée comme anomalie : c'est une évolution demandée. Son absence explique néanmoins plusieurs limites structurelles documentées dans le dossier de conception.

## AUDIT-FE-001 — Découverte comptable des paiements sur une colonne inexistante

- **Priorité : P1**
- **Fonctionnalité :** comptabilisation automatique des encaissements.
- **Chemin UI :** `/billing/:id` → Encaisser.
- **Attendu :** un paiement confirmé doit devenir un événement `PAYMENT_CONFIRMED`, puis une écriture comptable.
- **Observé :** la requête de découverte filtre sur `p.created_at`, alors que la table `payments` réelle ne possède pas cette colonne.
- **Cause confirmée :** divergence entre `accounting-integration.service.ts` et le schéma SQL.
- **Fichiers :** `backend-node/src/modules/accounting/accounting-integration.service.ts`, `backend-node/database/baseline/001_initial_schema.sql`.
- **Endpoint déclencheur :** `POST /invoices/:id/payments`.
- **Tables :** `payments`, `accounting_integration_events`.
- **Reproduction :** exécuter `discover()` sur le schéma actuel après un paiement ; MySQL renvoie `Unknown column 'p.created_at'`. L'inspection `information_schema.columns` de la base isolée confirme l'absence.
- **Impact :** la boucle de découverte échoue sur la requête paiement et n'atteint pas les requêtes suivantes du même passage ; les encaissements et d'autres sources postérieures peuvent rester non comptabilisés.
- **Preuve :** inspection statique + schéma MySQL réel en lecture seule.
- **Recommandation :** ajouter une date technique compatible par migration additive ou utiliser une date existante avec une règle de cutover explicitement testée ; ajouter un test MySQL réel du worker.

## AUDIT-FE-002 — Destination de trésorerie absente des événements comptables

- **Priorité : P1**
- **Fonctionnalité :** imputation comptable des paiements et remboursements.
- **Chemin UI :** `/billing/:id` → Encaisser / Rembourser.
- **Attendu :** le compte de trésorerie réel du mouvement doit permettre de résoudre son compte comptable.
- **Observé :** les payloads `PAYMENT_CONFIRMED` et `PAYMENT_REFUNDED` contiennent seulement `amount`. `accountFor()` attend `payload.treasuryAccountId` pour une ligne `TREASURY`.
- **Cause confirmée :** le SQL de découverte ne joint pas le mouvement de trésorerie originel. Les mouvements `PAYMENT` et `PAYMENT_REFUND` sont en outre exclus du flux générique de trésorerie.
- **Fichiers :** `accounting-integration.service.ts`, `treasury-flow.service.ts`, `billing.routes.ts`.
- **Endpoints :** `POST /invoices/:id/payments`, `POST /payments/:id/refund`.
- **Tables :** `treasury_movements`, `accounting_integration_events`, `accounting_treasury_mappings`, `accounting_scheme_lines`.
- **Reproduction :** configurer un schéma de paiement avec une ligne `TREASURY`, découvrir puis traiter l'événement ; résolution avec identifiant vide et erreur « Aucune liaison comptable active ».
- **Impact :** paiement réussi en facturation/trésorerie mais événement comptable en échec ou à régulariser ; choix futur d'un autre compte sans effet comptable correct.
- **Preuve :** inspection statique confirmée ; scénario d'écriture non exécuté.
- **Recommandation :** construire le payload depuis le mouvement stable `(source_type, source_id, event_type)`, pour paiement et remboursement, puis tester journal, grand livre et balance.

## AUDIT-FE-003 — Garde de module plus restrictive que les permissions granulaires

- **Priorité : P2**
- **Fonctionnalité :** accès aux écrans de facturation.
- **Chemin UI :** `/billing`, `/billing/:id`.
- **Attendu :** un utilisateur autorisé par les permissions granulaires et leur scope doit accéder aux écrans correspondants.
- **Observé :** `ModuleGuard("billing")` exige `billing.view`; les pages et endpoints utilisent principalement `billing.invoice.view`, `billing.payment.view` et les permissions d'action.
- **Cause confirmée :** deux niveaux de garde non composés.
- **Fichiers :** `frontend/src/App.tsx`, `BillingPage.tsx`, `InvoiceDetailPage.tsx`.
- **Endpoints :** tous les endpoints de lecture/action facture.
- **Tables :** `permissions`, `role_permissions`, affectations RBAC d'agence.
- **Reproduction :** attribuer `billing.invoice.view` au scope agence sans `billing.view`; l'API est admissible mais la route affiche l'accès refusé.
- **Impact :** faux refus frontend dans les configurations RBAC dynamiques.
- **Preuve :** inspection statique ; combinaison exacte non jouée sur navigateur.
- **Recommandation :** aligner la garde de module sur un ensemble de permissions métier ou garantir explicitement la permission agrégée lors du provisionnement.

## AUDIT-FE-004 — Moyens proposés sans vérifier qu'une destination est utilisable

- **Priorité : P2**
- **Fonctionnalité :** préparation d'un règlement.
- **Chemin UI :** modale « Enregistrer un règlement ».
- **Attendu :** ne proposer que les moyens utilisables dans l'agence et la devise de la facture, ou signaler leur indisponibilité avant validation.
- **Observé :** `GET /invoices/payment-methods` retourne tous les moyens actifs globalement. Le mapping, readiness, compte actif, scope et devise ne sont contrôlés qu'après soumission.
- **Cause confirmée :** endpoint non contextualisé par facture/agence et découplé de la trésorerie.
- **Fichiers :** `billing.routes.ts`, `InvoicePaymentComponents.tsx`, `treasury-flow.service.ts`.
- **Endpoint :** `GET /invoices/payment-methods`, puis `POST /invoices/:id/payments`.
- **Tables :** `payment_methods`, `treasury_account_mappings`, `treasury_accounts`, `treasury_flow_configurations`.
- **Reproduction :** activer un moyen sans mapping valide pour l'agence, le choisir et valider ; la transaction est refusée tardivement.
- **Impact :** erreur évitable et parcours trompeur ; aucune corruption car la transaction est atomique.
- **Preuve :** inspection statique + tests de contrat Treasury.
- **Recommandation :** endpoint contextuel de comptes compatibles, et état « aucun compte compatible » bloquant dans la modale.

## AUDIT-FE-005 — Absence d'annulation métier d'un règlement erroné

- **Priorité : P2**
- **Fonctionnalité :** correction d'un paiement saisi par erreur.
- **Chemin UI :** historique des règlements.
- **Attendu :** distinguer annulation/contrepassation d'une erreur et remboursement réel d'un client, selon une règle métier auditée.
- **Observé :** aucun bouton ni endpoint d'annulation. Seul un remboursement adossé à un avoir est disponible. Le statut SQL `rejected` n'est pas piloté par ce parcours.
- **Cause confirmée :** fonctionnalité non implémentée, règle métier non arbitrée.
- **Fichiers :** `InvoicePaymentComponents.tsx`, `InvoiceDetailPage.tsx`, `billing.routes.ts`.
- **Endpoint :** aucun endpoint d'annulation ; `POST /payments/:id/refund` couvre un autre cas.
- **Tables :** `payments`, `payment_refunds`, `credit_notes`, `treasury_movements`.
- **Reproduction :** consulter un paiement confirmé ; seules les actions reçu et remboursement sont disponibles.
- **Impact :** une erreur de saisie doit être traitée comme remboursement, avec avoir, même si aucun fonds n'a réellement été remis ; risque de qualification comptable incorrecte.
- **Preuve :** inspection exhaustive des routes et de l'UI.
- **Recommandation :** arbitrer le processus avant développement (droits, délai, motif, contrepassation, pièces, écritures), sans réutiliser silencieusement le remboursement.

## AUDIT-FE-006 — Premier moyen de paiement sélectionné arbitrairement

- **Priorité : P3**
- **Fonctionnalité :** modale de règlement.
- **Chemin UI :** `/billing/:id` → Encaisser.
- **Attendu :** état initial non sélectionné, décision explicite de l'utilisateur.
- **Observé :** à l'ouverture, `paymentMethodId` reçoit `methods[0]?.id`; l'ordre est alphabétique serveur.
- **Cause confirmée :** initialisation dans le gestionnaire du bouton.
- **Fichiers :** `InvoicePaymentComponents.tsx`.
- **Endpoint :** `GET /invoices/payment-methods`.
- **Tables :** `payment_methods`.
- **Reproduction :** ouvrir la modale après chargement des moyens ; le premier est présélectionné.
- **Impact :** risque de validation trop rapide avec un moyen incorrect ; aggravé lorsqu'un compte sera dépendant du moyen.
- **Preuve :** inspection statique.
- **Recommandation :** initialiser à chaîne vide et n'afficher le sélecteur de destination qu'après choix explicite.

## AUDIT-FE-007 — Date de paiement et justificatif non gérés dans la modale

- **Priorité : P3**
- **Fonctionnalité :** traçabilité du règlement.
- **Chemin UI :** modale « Enregistrer un règlement ».
- **Attendu :** exposer explicitement les données métier requises ou documenter l'usage systématique de la date serveur ; gérer un justificatif si requis par la politique documentaire.
- **Observé :** le backend accepte `paymentDate`, mais la modale ne l'envoie jamais. Aucun champ ni contrat de justificatif n'existe, bien qu'un reçu généré soit archivé après coup.
- **Cause confirmée :** contrat frontend plus étroit que le contrat backend ; besoin documentaire non arbitré.
- **Fichiers :** `InvoicePaymentComponents.tsx`, `erpHooks.ts`, `billing.routes.ts`.
- **Endpoint :** `POST /invoices/:id/payments`.
- **Tables :** `payments`, tables d'archives métier.
- **Reproduction :** ouvrir la modale ; seuls montant, moyen, référence conditionnelle et notes sont disponibles.
- **Impact :** impossibilité de saisir une date de valeur métier depuis l'UI et de joindre une preuve externe.
- **Preuve :** inspection statique.
- **Recommandation :** arbitrer date opérationnelle vs date de saisie et justificatif obligatoire/facultatif par moyen ; intégrer ensuite au plan documentaire existant.

## Évolution explicitement exclue du décompte

**EVOL-FE-001 — Sélection dynamique du compte destinataire.** Le modèle actuel impose un mapping unique par agence et moyen. Aucune spécification antérieure validée n'a été trouvée imposant le sélecteur ; conformément à la mission, il est traité comme évolution. Sa conception complète figure dans `CONCEPTION-SELECTION-DYNAMIQUE-COMPTES-ENCAISSEMENT.md`.
