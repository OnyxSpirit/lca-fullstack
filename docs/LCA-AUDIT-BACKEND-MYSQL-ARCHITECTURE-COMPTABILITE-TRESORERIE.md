# ERP LCA — Audit backend, MySQL et architecture cible Comptabilité & Trésorerie

> Audit statique du dépôt au 12 novembre 2026. Aucun code, schéma, jeu de données, permission, test ou workflow n'a été modifié et aucune migration ni requête sur une base n'a été exécutée. Les numéros de ligne sont ceux de la révision auditée et peuvent évoluer. Le rapport frontend de référence est `docs/LCA-AUDIT-FRONTEND-COMPTABILITE-TRESORERIE.md`.

## Légende de preuve

- **EXISTANT VÉRIFIÉ** : établi directement par un fichier, une fonction, une migration ou un test cité.
- **LACUNE CONFIRMÉE** : recherche transversale négative dans le code applicatif et les migrations, corroborée par le modèle observé.
- **PROPOSITION** : architecture cible ; elle n'existe pas encore dans LCA.
- **À VALIDER MÉTIER** : décision comptable, fiscale, organisationnelle ou d'intégration qui ne peut pas être déduite du code.

## 1. Synthèse exécutive

Le backend LCA contient un **sous-système de trésorerie solide**, pas un moteur de comptabilité générale. Il sait gérer des comptes de trésorerie Caisse/Banque/Autre, calculer les soldes depuis des mouvements immuables, réserver des liquidités, enregistrer des opérations manuelles, transférer des fonds, contrepasser, intégrer des paiements clients, remboursements, décaissements budgétaires et règlements de garantie, puis rapprocher des relevés bancaires. Les écritures critiques sont exécutées sous transaction MySQL, avec contrôles de périmètre, verrous `FOR UPDATE`, clés d'idempotence, contraintes d'unicité, audit et notifications temps réel.

En revanche, **aucune comptabilité générale en partie double n'est implémentée** : pas de plan de comptes SYSCOHADA, journaux comptables, pièces et lignes débit/crédit, exercices/périodes, validation comptable, lettrage, grand livre, balance, clôture ou états financiers réglementaires. Le champ `status='POSTED'` de `treasury_movements` signifie « mouvement de trésorerie enregistré », pas « écriture comptable validée ».

La bonne cible n'est donc ni de renommer Treasury en Comptabilité, ni de transformer `treasury_accounts` en comptes SYSCOHADA. La recommandation est une architecture à deux registres reliés :

1. les modules métier restent propriétaires des factures, paiements, dépenses, rémunérations et garanties ;
2. Treasury reste le registre des flux de liquidité et des rapprochements bancaires ;
3. un nouveau noyau Accounting reçoit des événements financiers stables, applique des règles de comptabilisation versionnées et produit des écritures équilibrées, immuables et auditables ;
4. la GED fournit les pièces justificatives ;
5. un adaptateur d'export permet une coexistence progressive avec Sage, après validation du produit, de la version et du format réellement utilisés par LCA.

**Décision recommandée : évolution progressive, en six lots, avec double production contrôlée avant toute bascule.** La première étape doit être un cadrage comptable mené avec le responsable comptable LCA : périmètre juridique, référentiel SYSCOHADA applicable, plan de comptes détaillé, journaux, taxes, devises, axes agence/concession, règles d'arrondi, clôture et cible Sage.

## Périmètre et méthode

L'audit a couvert :

- `backend-node/src/modules/treasury/*` et le montage dans `backend-node/src/app.ts` ;
- les intégrations Billing, RH, fournisseurs/Pièces, SAV/Garantie, retours véhicules, GED et Reporting ;
- les migrations financières 038, 043, 044, 054 à 059, 073 à 076, 083, 085, 101, 111 et 112 ;
- les tests Treasury, Billing, budgets, fournisseurs, rémunérations et rapprochement bancaire ;
- une recherche transversale des concepts comptables dans `backend-node/src`, `backend-node/database` et `frontend/src` ;
- le rapport d'audit frontend existant.

**Limite :** aucun état réel d'une base MySQL n'a été inspecté. Les tables, index et contraintes décrits sont ceux des migrations ; l'audit ne certifie ni que toutes les migrations sont appliquées dans un environnement donné, ni la qualité des données historiques.

## 2. Architecture backend existante

### 2.1 Chaîne HTTP et sécurité commune

**EXISTANT VÉRIFIÉ.** `backend-node/src/app.ts:70` monte les routeurs sous `/api` après `authenticate` et `enforceAgencyScope`. Les routes Treasury utilisent `requireAgencyPermission` sous l'alias `requirePermission` (`treasury.routes.ts:1-8`).

`withCurrentAgencyAuthorization` (`modules/rbac/agency-authorization.ts:125-130`) ouvre une transaction, recharge le contexte RBAC, détecte un changement d'agence ou de permissions, verrouille la session et l'affectation active, puis exécute le travail. `treasury.service.ts:17` en fait le wrapper `treasuryTransaction`. C'est une garantie forte contre un changement de contexte pendant une écriture.

### 2.2 Composants et responsabilités

| Composant | Responsabilité vérifiée | Dépendances principales |
|---|---|---|
| `modules/treasury/treasury.routes.ts` | API comptes, catégories, journal/export, synthèse, réservations, opérations manuelles, transferts, décaissements de dépenses et contrepassations | `treasury.service`, `treasury-coverage.service`, `treasury-flow.service`, RBAC, CSV |
| `modules/treasury/treasury.service.ts` | règles des comptes/catégories, posting unique des mouvements, soldes, opérations manuelles, décaissements budgétaires, transferts et reversals | MySQL, audit, Socket.IO, RBAC, coverage |
| `modules/treasury/treasury-flow.service.ts` | mapping agence + moyen de paiement vers compte Treasury ; posting automatique des paiements/remboursements/garanties | Billing, Warranty, comptes/mappings, realtime |
| `modules/treasury/treasury-coverage.service.ts` | couverture, engagements, réservations et consommation lors d'un décaissement | budgets, dépenses, comptes et mouvements |
| `modules/treasury/bank-reconciliation.routes.ts` | API import, validation, propositions, rapprochement, annulation, export | multipart, CSV, service bancaire |
| `modules/treasury/bank-reconciliation.service.ts` | parsing CSV, empreinte de fichier, lignes bancaires, matching et historique | MySQL, crypto SHA-256, audit, RBAC |
| `modules/activity/audit-writer.ts` | audit transverse avec nettoyage des secrets et contexte agence/concession | `audit_logs` et ressources métier |
| `realtime/socket.ts` | diffusion par domaines/agences et globals | Socket.IO et contexte autorisé |

Il n'existe pas de couche Repository dédiée : les services exécutent directement du SQL paramétré via `mysql2/promise`. Ce choix réduit les abstractions mais concentre dans `treasury.service.ts` 1 584 lignes de règles, SQL, mapping et diffusion.

## 3. Cartographie des routes et services

**EXISTANT VÉRIFIÉ.** Les routes exactes sont déclarées dans `treasury.routes.ts:9-285` et `bank-reconciliation.routes.ts:3-14`.

| Domaine | Endpoints principaux | Permissions |
|---|---|---|
| Comptes | `GET/POST /treasury/accounts`, `GET/PATCH /treasury/accounts/:id`, `PATCH .../:id/status`, `GET /account-territories` | `treasury.view`, `treasury.account.manage` |
| Catégories | `GET/POST /treasury/categories`, `PATCH .../:id`, `PATCH .../:id/status` | `treasury.view`, `treasury.category.manage` |
| Consultation | `GET /treasury/journal`, `/journal/export`, `/journal/:id`, `/summary` | `treasury.view` |
| Opérations | `POST /manual-receipts`, `/manual-disbursements`, `/transfers`, `/movements/:id/reversal` | permissions spécialisées |
| Couverture | `GET /coverage`, `/budget-indicators`, `/reservations`; cycle de vie des réservations | `treasury.coverage.view`, `treasury.reservation.*` |
| Dépenses | `GET/POST /hr/budget-expenses/:id/disbursements` | `hr.expense.view/disburse` + contrôle Treasury côté service |
| Configuration | `GET/PATCH /flow-configuration/readiness`, CRUD logique des mappings | `treasury.account.manage` |
| Banque | relevés, aperçu, validation/rejet/annulation, propositions, rapprochement/annulation, non rapprochés, export | `treasury.reconciliation.*` |

### Flux de bout en bout

```text
Frontend React
  → /api + JWT + contexte agence actif
  → route Express + permission dynamique
  → service métier + revalidation du périmètre
  → transaction InnoDB
      → verrouillage des ressources
      → opération source métier
      → treasury_movements / réservations / rapprochement
      → audit_logs
  → COMMIT
  → événement Socket.IO ciblé domaine/agence/global
  → invalidation des caches frontend
```

**EXISTANT VÉRIFIÉ.** L'événement est émis après le retour de la transaction pour les opérations manuelles (`treasury.service.ts:626-820`) et les flux automatiques (`treasury-flow.service.ts:22` et appelants), ce qui évite d'annoncer une écriture rollbackée. La diffusion temps réel n'est toutefois pas une file durable : un client déconnecté doit se resynchroniser par API.

## 4. Cartographie MySQL financière

### 4.1 Registre Treasury

| Table | Rôle et clés principales | Intégrité notable |
|---|---|---|
| `treasury_accounts` | compte de liquidité ; `concession_id`, `agency_id`, `attachment_type`, `account_type`, `currency_code` | code unique par concession ; FK concession/agence/utilisateur ; rattachement cohérent contrôlé par migration 085 |
| `treasury_categories` | classification IN/OUT/BOTH | code unique par concession ; FK concession |
| `treasury_movements` | registre immuable des entrées/sorties | montant > 0 ; source événement globalement unique ; reversal unique ; FK compte/catégorie/méthode/transfert/auteur |
| `treasury_transfers` | objet métier d'un transfert | deux comptes distincts ; montant > 0 ; reversal unique |
| `treasury_manual_operations` | preuve métier d'entrée/sortie manuelle | idempotence `(created_by, client_request_id)` ; FK compte/catégorie/méthode |
| `treasury_account_mappings` | compte par agence et moyen de paiement | unicité `(agency_id,payment_method_id)` ; FK restrictives |
| `treasury_flow_configurations` | cutover par concession | PK concession ; activation explicite |
| `treasury_reservations` | liquidité réservée pour dépense | idempotence par créateur ; montants bornés ; FK dépense/compte/territoire |
| `treasury_reservation_events` | historique du cycle de réservation | append-only applicatif ; FK réservation/décaissement/auteur |

Sources : migrations `054_treasury_foundation.sql`, `055_treasury_flow_integration.sql`, `056_treasury_source_event_global_uniqueness.sql`, `057_treasury_manual_operations.sql`, `058_treasury_manual_idempotency_scope.sql`, `073_treasury_reservations_and_coverage.sql`, `083_financial_workflow_hardening.sql` et `085_treasury_account_attachment.sql`.

### 4.2 Banque et rapprochement

| Table | Rôle | Garanties |
|---|---|---|
| `bank_statements` | fichier, période, soldes, devise, workflow | SHA-256 ; unicité fichier actif par compte ; contenu source privé en LONGBLOB |
| `bank_statement_lines` | opérations importées et données brutes | unicité ligne par relevé ; classe de doublon ; FK relevé |
| `bank_reconciliations` | association ligne ↔ mouvement Treasury | une ligne active et un mouvement actif au plus ; idempotence ; écarts montant/date |
| `bank_reconciliation_history` | événements du rapprochement | acteur, motif, horodatage et FK |

Source : `076_bank_reconciliation.sql`. **EXISTANT VÉRIFIÉ :** le rapprochement ne modifie ni ne crée de mouvement Treasury (`bank-reconciliation.service.ts`) ; il associe deux réalités distinctes.

### 4.3 Objets métier financiers connexes

- Billing : `invoices`, `invoice_items`, `payments`, `credit_notes`, `payment_refunds`, `payment_methods` ; le remboursement a une clé `idempotency_key` unique (`038_payment_refunds.sql`).
- Budget : `budgets`, `budget_categories`, `budget_expenses`, `budget_fund_movements`, `budget_expense_disbursements` (`043`, `044`, `059`, `072`).
- Fournisseurs : `supplier_invoices`, `supplier_invoice_lines`, `supplier_credit_notes` ; unicité de référence fournisseur par concession/fournisseur et lien optionnel vers une dépense (`075_supplier_invoice_debt_management.sql`).
- RH : `hr_remunerations`, bonus et historique, reliés à une dépense budgétaire (`074_hr_remunerations_financial_integration.sql`) ; rémunérations prestataires et finance (`100`, `101`).
- SAV/Garantie : créances/règlements constructeur et opérations SAV reliées aux flux financiers (`047`, `111`, `112`).
- GED/audit : documents centralisés et `audit_logs`, utilisés comme preuves transverses mais sans pièce comptable formelle.

### 4.4 Garanties et limites du modèle

**EXISTANT VÉRIFIÉ :**

- soldes recalculés par somme des mouvements `POSTED`, pas de colonne de solde mutable (`treasury.service.ts:215-241`) ;
- sorties protégées par verrou du compte, verrou des réservations puis contrôle du disponible (`postMovement`, lignes 550-624) ;
- ordre stable de verrouillage des deux comptes lors d'un transfert (`treasury.service.ts:1282-1396`) ;
- unicité d'un événement source `(source_type, source_id, event_type)` depuis la migration 056 ;
- contrepassation par nouveau mouvement et FK `reversal_of_id`, sans édition/suppression de l'original ;
- idempotence des opérations manuelles, décaissements, remboursements et rapprochements ;
- contraintes `CHECK`, FK `RESTRICT` et index de consultation ;
- audit métier écrit dans la même transaction que l'opération.

**LACUNES CONFIRMÉES / RISQUES :**

- `source_type`, `source_id` et `event_type` sont des chaînes libres, sans catalogue ni FK polymorphe ; une faute de code peut créer une nouvelle sémantique silencieuse ;
- les `DECIMAL` alternent entre `(15,2)` et `(18,2)` ; l'échelle unique, les limites et les arrondis doivent être normalisés pour Accounting ;
- la cohérence concession/agence de plusieurs tables est principalement assurée par le service, pas par une FK composite ;
- aucun hash chaîné ni signature du journal financier : l'immutabilité repose sur l'API, les permissions et les FK, pas sur une preuve cryptographique ;
- l'audit statique ne prouve pas l'absence d'accès SQL direct hors application ;
- absence d'outbox transactionnelle : l'état MySQL reste fiable, mais un événement temps réel peut être perdu après commit ;
- les requêtes de solde agrègent tout l'historique ; un grand volume exigera mesure, indexation et éventuellement snapshots contrôlés, jamais une colonne de solde modifiée sans journal.

## 5. Comptes financiers : trois concepts à préserver

### 5.1 Compte de trésorerie

**EXISTANT VÉRIFIÉ.** `treasury_accounts.account_type` vaut `CASH`, `BANK` ou `OTHER`; chaque compte porte une devise, une concession, un rattachement AGENCY ou CONCESSION, et un statut actif. Le solde est la somme nette des mouvements ; le disponible retranche les réservations actives.

Le modèle permet plusieurs caisses et banques par agence, des comptes partagés concession, une vue consolidée par scope et un suivi individuel. Un compte déjà utilisé ne peut plus changer librement de rattachement (`attachment_mutable` et migration 085). Les transferts exigent même devise et comptes compatibles ; une conversion de devises n'est pas implémentée.

### 5.2 Compte bancaire réel

**EXISTANT VÉRIFIÉ.** Un compte Treasury de type `BANK` représente l'enveloppe opérationnelle rapprochable. Mais aucun référentiel structuré d'identité bancaire — banque, numéro de compte/IBAN local, titulaire, BIC, agence bancaire, signataires — n'est porté par `treasury_accounts`. `bank_name` est stocké au niveau du relevé.

### 5.3 Compte comptable SYSCOHADA

**LACUNE CONFIRMÉE.** Aucun référentiel de comptes comptables n'existe. Un compte SYSCOHADA est une rubrique du grand livre ; il ne doit pas être fusionné avec un compte Treasury ni avec un compte bancaire réel.

**PROPOSITION.** Introduire des entités séparées et des associations datées :

```text
treasury_account ── 0..n ── accounting_account_mapping ── 1 accounting_account
       │
       └── 0..1 bank_account_identity
```

Une caisse agence peut pointer vers un sous-compte comptable de caisse ; plusieurs comptes Treasury peuvent partager un compte collectif seulement si la traçabilité analytique reste conservée. Les mappings doivent être versionnés par dates de validité et périmètre.

## 6. Fonctionnement des mouvements

| Opération | Déclencheur / service | Source Treasury | Annulation / idempotence |
|---|---|---|---|
| Entrée/sortie manuelle | `POST /manual-*` → `createManualOperation` | `MANUAL_RECEIPT` / `MANUAL_DISBURSEMENT` | request UUID par auteur ; reversal motivé |
| Paiement client | Billing `POST /invoices/:id/payments` → `postAutomaticMovement` | `PAYMENT`, `CONFIRMED` | idempotence Billing + unicité source Treasury |
| Remboursement | Billing/retour véhicule → `postPaymentRefundMovement` | `PAYMENT_REFUND`, `REFUNDED` | compte original du paiement ; clé unique |
| Garantie constructeur reçue | `warranty.routes.ts` → flux automatique | `WARRANTY_CLAIM_PAYMENT`, `RECEIVED` | source stable ; posting dans transaction métier |
| Dépense budgétaire | `/hr/budget-expenses/:id/disbursements` → `budgetExpenseDisburse` | `BUDGET_EXPENSE_DISBURSEMENT`, `POSTED` | request UUID ; plafond, disponible, réservation |
| Fournisseur | facture validée → dépense budgétaire → décaissement | même source de décaissement | avoirs et reversals pris en compte dans le reporting |
| Rémunération salarié/prestataire | validation → engagement/dépense → paiement | même pipeline budgétaire | séparation des validations et paiement |
| Transfert | `transfer` | deux mouvements `TRANSFER` liés au même objet | n'est ni recette ni charge ; reversal jumelé |
| Contrepassation | `reverse` / `reverseTransfer` | `REVERSAL` / `TRANSFER_REVERSAL` | un reversal par original |

**EXISTANT VÉRIFIÉ.** Les factures et avoirs seuls ne créent pas de liquidité ; seuls les encaissements/remboursements le font (`treasury-flow-integration.test.ts`). Les transferts sont isolés dans les synthèses et ne doivent pas alimenter recettes/dépenses consolidées.

**Risque de double comptabilisation :** faible dans Treasury pour un même événement grâce à l'unicité globale, mais élevé si le futur moteur comptable écoute à la fois l'objet métier et son mouvement Treasury sans règle d'autorité. Exemple : une facture client doit créer la créance à l'émission ; son paiement doit solder la créance et débiter la banque/caisse. Il ne faut pas comptabiliser le paiement une fois depuis Billing puis une seconde fois depuis `treasury_movements`.

## 7. Intégrations intermodules

| Module | Parcours vérifié | Statuts/transaction/annulation | Limite ou absence |
|---|---|---|---|
| Ventes | Vente → facture Billing → paiement → mouvement Treasury | la vente n'écrit pas directement Treasury ; Billing poste dans sa transaction | aucune écriture de produit/comptabilité générale |
| Facturation | facture → paiement confirmé, ou avoir → remboursement → mouvement | paiements partiels permis ; idempotence ; refund lié au paiement et compte d'origine (`billing.routes.ts`) | la facture non réglée reste hors Treasury, volontairement |
| SAV/Atelier | règlement de garantie constructeur reçu → `postAutomaticMovement` | seul l'encaissement reçu poste ; source `WARRANTY_CLAIM_PAYMENT` | les charges/produits SAV non encaissés ne sont pas comptabilisés |
| Pièces/Fournisseurs | facture fournisseur validée → dépense approuvée → décaissement Treasury | facture, avoir et paiement séparés ; reversal net dans rapports (`supplier-finance.routes.ts`, migration 075) | pas de posting direct de la dette fournisseur dans Accounting |
| RH | rémunération validée → dépense/engagement → décaissement | workflows et permissions distincts (`hr-remuneration.routes.ts`, migrations 074/101) | cotisations, retenues et dettes comptables absentes |
| Budgets | budget/dépense approuvée → réservation facultative → décaissement | consommation explicite de réservation ; reversals ; plafonds verrouillés | budget ≠ comptabilité ; allocation sans mouvement de fonds |
| Prestataires | rémunération prestataire → finance budgétaire → Treasury | intégration via dépense ; séparation des validations | même lacune comptable que RH |
| GED | justificatifs rattachés aux opérations/décaissements | accès permissionné et archive métier | pas de pièce comptable numérotée ni exigence documentaire centralisée |
| Reporting | lecture directe des objets métier et Treasury | scopes et devises séparées | historique « as of » imparfait ; pas de ledger |

**LACUNE CONFIRMÉE.** Les achats directs, stocks, immobilisations, taxes, charges constatées, paie détaillée et opérations diverses ne produisent pas d'écritures comptables, puisqu'Accounting n'existe pas. Une absence de mouvement Treasury est normale tant qu'il n'y a pas de flux de fonds ; elle devient une lacune uniquement pour la future comptabilité d'engagement.

Facturation doit rester indépendante sous `/billing`. **Aucune fusion Billing/Accounting/Treasury n'est proposée.**

## 8. Capacités de reporting financier

**EXISTANT VÉRIFIÉ.** `modules/reports/financial-report.service.ts` expose les sections `treasury`, `customers`, `budgets`, `suppliers`, `remunerations`, `coverage`, avec filtres date/as-of, scope, agence et devise. `treasuryReport` distingue flux, transferts et solde ; les rapports fournisseurs et rémunérations calculent le payé net des reversals. Les CSV financiers utilisent `financialCsv`.

**LACUNE CONFIRMÉE.** Ces rapports sont des agrégats opérationnels. Ils ne proviennent pas d'écritures équilibrées et ne constituent ni balance générale, ni grand livre, ni états SYSCOHADA. Le service déclare lui-même des limites de reconstitution historique dans `financialReport(...).meta.historicalLimitations`.

### Matrice des KPI envisagés

| KPI | Source / réutilisation | Calcul et filtres | Vigilance / coût |
|---|---|---|---|
| Solde total | `treasury_movements` + comptes ; `/treasury/summary` ou `treasuryReport` | somme IN − OUT, **par devise**, scope/agence/compte/as-of | ne jamais sommer les devises ; agrégation historique potentiellement coûteuse |
| En caisse / en banque | jointure `treasury_accounts.account_type` | même solde groupé CASH/BANK | ERP ≠ solde bancaire vérifié ; index compte/date |
| Entrées / sorties | `treasury_movements` | somme et nombre par période, hors distinction transfert à traiter | filtrer statut et reversals selon convention de période |
| Nombre d'opérations | mouvements | `COUNT`, éventuellement source/sens/compte | un transfert crée deux mouvements : compter objets ou lignes explicitement |
| Transferts internes | `treasury_transfers` + mouvements liés | montant et nombre séparés | ne jamais inclure dans recette/charge ; inter-agence à qualifier |
| Encaissements clients | source `PAYMENT` | période, agence, moyen, compte, devise | facture non payée exclue ; remboursements présentés séparément/net |
| Dépenses par catégorie | mouvements OUT + `treasury_categories` | période/agence/compte/catégorie/source | transfert/reversal exclus ou isolés ; catégories Treasury non comptables |
| Évolution des mouvements | mouvements par jour/semaine/mois | séries pré-agrégées selon plage | pagination pour détail, buckets serveur pour graphique |
| Répartition des fonds | solde par compte/type/agence | instantané courant ou as-of | as-of dérivable par `value_date`, mais statut annulé tardif limite la fidélité |
| Répartition encaissements/décaissements | source, catégorie, moyen, compte | sommes + nombres, par devise | référentiel `source_type` libre ; normalisation recommandée |

**PROPOSITION.** Pour les graphiques, exposer ultérieurement des agrégats bornés (`bucket=day|week|month`) plutôt que télécharger le journal. Mesurer d'abord les plans `EXPLAIN`; ajouter des index composites adaptés aux filtres réels, puis seulement des snapshots journaliers reproductibles si nécessaire. Le détail reste paginé par curseur `(value_date,id)` ou pagination serveur stable. Les filtres cibles sont période, agence, compte, devise, source et catégorie. CONCESSION/GLOBAL permettent la consolidation autorisée ; chaque série reste séparée par devise.

## 9. Évaluation du plan comptable SYSCOHADA

La source normative primaire identifiée est l'[Acte uniforme relatif au droit comptable et à l'information financière — AUDCIF](https://www.ohada.org/publication-du-nouvel-acte-uniforme-relatif-au-droit-comptable-et-a-l-information-financiere-audcif/) adopté le 26 janvier 2017, publié le 15 février 2017 et applicable aux comptes personnels depuis le 1er janvier 2018. L'OHADA précise que son annexe comprend le plan comptable général OHADA et le dispositif des comptes consolidés/combinés. Cette source officielle doit primer sur les listes de comptes trouvées sur des sites secondaires.

**LACUNE CONFIRMÉE.** LCA ne possède aucun des objets structurants suivants : plan de comptes versionné, journaux, numéros de pièces, écritures/lignes débit-crédit, exercice/périodes, clôtures, à-nouveaux, lettrage, tiers auxiliaires, immobilisations/amortissements, taxes comptables, change, grand livre, balance et états réglementaires.

**À VALIDER MÉTIER ET JURIDIQUE :** statut exact de l'entité LCA, pays et obligations locales complémentaires, système applicable, exercice, règles fiscales, traitement CDF/USD/XAF éventuel, consolidation, établissements/agences, et exigences de conservation. Le présent rapport ne vaut pas avis comptable ou juridique.

**PROPOSITION.** Importer un plan validé dans une version de référentiel, distinguer les comptes de référence protégés des subdivisions LCA, permettre recherche/activation et interdire suppression ou renumérotation d'un compte utilisé. La création guidée d'une subdivision doit nécessiter une permission et une validation comptable ; créer une caisse ne doit jamais inventer automatiquement un code.

## 10. Architecture des écritures comptables

### 9.1 Modèle proposé

**PROPOSITION.** Créer un module `accounting` séparé avec au minimum :

- `accounting_chart_versions` et `accounting_accounts` : plan, hiérarchie, nature, possibilité de mouvement, devise/tiers requis ;
- `accounting_journals` : code, type, séquence, périmètre ;
- `accounting_fiscal_years` et `accounting_periods` : états OPEN/SOFT_CLOSED/CLOSED ;
- `accounting_documents` : événement source, pièce, date comptable, référence, statut DRAFT/VALIDATED/REVERSED ;
- `accounting_entries` et `accounting_entry_lines` : numéro immuable, débit, crédit, devise, montant devise, agence, tiers et axes analytiques ;
- `accounting_posting_rules` et versions : type d'événement → comptes et dimensions ;
- `accounting_event_inbox` : consommation idempotente des événements ;
- `accounting_reconciliations` / `accounting_allocations` : lettrage et rapprochements auxiliaires ;
- `accounting_export_batches` : exports Sage traçables.

Invariants MySQL essentiels : montants positifs ou nuls selon convention, une ligne avec débit XOR crédit, somme débit = somme crédit par pièce et devise de tenue, unicité de l'événement source et du numéro de pièce, période ouverte, validation irréversible, reversal par pièce opposée, FK restrictives et aucune suppression d'une pièce validée.

MySQL ne peut pas exprimer simplement l'équilibre multi-lignes par `CHECK`. La validation doit verrouiller la pièce et la période, vérifier l'équilibre dans une transaction, attribuer le numéro, passer à VALIDATED et écrire l'audit avant commit. Une contrainte différée n'existe pas en MySQL ; cette limite doit être assumée et testée.

### 9.2 Événements et autorité

```text
Module métier ── transaction ── business_event/outbox
                                  │
                                  ▼
                          accounting_event_inbox
                                  │ règle versionnée
                                  ▼
                       pièce + lignes débit/crédit
                                  │
                 ┌────────────────┴───────────────┐
                 ▼                                ▼
          grand livre/balance              export Sage/audit

Treasury movement ── lien de preuve, jamais substitut automatique universel
```

Chaque type d'événement doit avoir un propriétaire : facture émise/annulée et avoir depuis Billing ; paiement/remboursement depuis Billing avec lien Treasury ; dépense/facture fournisseur depuis le module source ; décaissement depuis Treasury ; rémunération depuis RH ; stock/immobilisation depuis le module concerné. L'événement porte des snapshots monétaires et fiscaux afin qu'une modification ultérieure du référentiel ne réécrive pas l'histoire.

## 11. Automatisation des imputations

**PROPOSITION.** Une règle de posting versionnée contient : événement, conditions, journal, compte débité, compte crédité, taxes, tiers, agence, devise et axes analytiques. La simulation doit expliquer la règle appliquée avant validation.

Exemples purement conceptuels à faire valider par un comptable, sans imposer de numéros de comptes :

- facture client : débit client / crédit produit et taxes ;
- paiement : débit caisse ou banque / crédit client ;
- remboursement : écriture inverse selon avoir et moyen de paiement ;
- facture fournisseur : débit charge/stock/immobilisation et taxe récupérable / crédit fournisseur ;
- règlement fournisseur : débit fournisseur / crédit caisse ou banque ;
- rémunération : constatation de charge et dette, puis règlement de la dette ;
- transfert interne : débit compte de trésorerie destinataire / crédit source, sans produit ni charge ;
- reversal : inversion intégrale avec lien obligatoire vers la pièce originale.

**À VALIDER MÉTIER :** fait générateur, comptes, taxes, retenues, transit, dates comptables, analytique, traitement des écarts et niveaux d'automatisation. Les événements sans règle active doivent aller dans une file « à traiter », jamais être ignorés ni postés sur un compte d'attente silencieusement.

## 12. Journal comptable unique

**PROPOSITION.** Le journal unifié doit interroger uniquement les pièces Accounting validées, avec drill-down vers l'événement métier, le mouvement Treasury et la GED. Filtres : exercice/période, journal, compte, tiers, agence, devise, source, statut et référence.

L'interface peut proposer Tous, Banque, Caisse, Ventes, Achats et Opérations diverses, mais ces filtres ne remplacent pas les journaux backend. Recherche plein texte bornée, pagination stable, export asynchrone pour grands volumes et permissions par périmètre/journal sont nécessaires.

## 13. Grand livre et balance

**PROPOSITION.** Le grand livre doit être dérivé des lignes validées et présenter solde initial, mouvements débit/crédit, solde progressif et lettrage. La balance doit agréger soldes d'ouverture, mouvements et soldes de clôture par compte, avec égalités de contrôle. Les vues matérialisées ou tables de snapshots ne seront qu'une optimisation reproductible ; les lignes validées restent la source de vérité.

La consultation par compte/période doit utiliser des index `(entity_id, account_id, accounting_date, entry_id)` et des lectures paginées. Une balance peut être calculée à la demande sur un périmètre raisonnable puis mise en cache par version de clôture. Toute optimisation doit être réconciliable avec les lignes sources.

## 14. Compatibilité Sage

**LACUNE CONFIRMÉE.** Aucun adaptateur Sage, export d'écritures, identifiant de lot, accusé d'import ou mapping de comptes Sage n'existe dans le dépôt.

**PROPOSITION.** Prévoir une interface d'export indépendante du moteur : lot immuable, période, société/dossier, journal, pièce, compte, tiers, libellé, débit, crédit, devise, échéance, analytique, checksum, auteur et statut d'export. Un même lot ne doit pas être exporté deux fois sans action explicite ; une correction crée un nouveau lot/reversal.

**À VALIDER MÉTIER/TECHNIQUE :** produit Sage exact, version, pays, dossier, séparateur/encodage, format accepté (CSV, texte structuré ou API), longueur des champs, codes journaux, auxiliaires, analytique, devise et stratégie de retour d'erreurs. Il n'existe pas de « CSV Sage universel » suffisamment sûr pour être figé maintenant.

Trajectoire conseillée : LCA produit et contrôle les pièces → export pilote vers une société de test Sage → rapprochement des totaux et rejets → double production sur plusieurs clôtures → décision de coexistence durable ou de bascule.

## 15. OCR et rapprochement bancaire

**EXISTANT VÉRIFIÉ.** LCA possède une GED et conserve les CSV bancaires bruts ; aucun moteur OCR n'a été identifié.

**PROPOSITION.** L'OCR doit créer une **proposition**, jamais une écriture validée : document → extraction (fournisseur, numéro, date, montants, taxes, devise) → score de confiance → détection de doublon → rapprochement fournisseur/commande/réception → validation humaine → événement comptable. Conserver fichier original, texte/extraction, version du modèle, confiance, corrections et validateur.

Le rapprochement bancaire existant est une bonne fondation. À terme, il peut suggérer un lettrage comptable via le lien mouvement Treasury ↔ pièce Accounting, mais la validation bancaire et le lettrage comptable doivent rester deux décisions distinctes.

CSV est actuellement le seul format bancaire implémenté : BOM UTF-8, séparateur virgule/point-virgule, séparateurs décimaux/milliers et mapping de colonnes (`parseBankCsv`). **PROPOSITION :** traiter d'abord PDF texte par extraction déterministe, Excel par lecteur tabulaire avec limites strictes, puis images/PDF scannés par OCR seulement si nécessaire. Contrôles : MIME/signature/taille, antivirus si disponible, compte/période/devise, totaux, continuité du solde, hash, doublons et score de confiance. Isoler le traitement lourd en job, chiffrer les documents au repos selon politique, limiter les logs et prévoir coût/timeout/reprise. Aucun fournisseur OCR n'est imposé.

## 16. Guidage contextuel

**PROPOSITION.** Masquer la complexité sans masquer les contrôles : assistant « opération → conséquence », libellés métier, prévisualisation débit/crédit facultative, explication de la règle, pièces manquantes, messages de blocage actionnables, file d'anomalies et vue expert pour le comptable. Ne jamais permettre à l'interface de modifier directement une pièce validée.

Le backend doit retourner un code stable, un message, le prérequis manquant et éventuellement une action autorisée (`configurationTarget`), tandis que le frontend traduit et propose le lien uniquement si l'utilisateur possède la permission. Les erreurs existantes de `HttpError` (« compte inactif », « mapping absent », « solde insuffisant ») sont réutilisables, mais doivent être normalisées. La saisie locale peut être conservée après une erreur ; les contrôles financiers restent exclusivement garantis côté service.

## 17. Multi-agences et RBAC

**EXISTANT VÉRIFIÉ.** Treasury applique les scopes OWN/AGENCY/CONCESSION/GLOBAL selon les opérations ; OWN est refusé pour les référentiels collectifs et le rapprochement. Les comptes peuvent être rattachés à une agence ou à la concession. L'autorisation est revalidée dans la transaction.

**PROPOSITION.** Accounting doit porter explicitement l'entité juridique, la concession et l'agence/établissement sur la pièce et ses axes, sans présumer qu'une agence est une entité comptable autonome. Prévoir des permissions séparées : consulter, saisir brouillon, simuler, valider, contrepasser, rouvrir une période, exporter, administrer le plan/règles. La séparation des tâches doit interdire autant que possible auto-saisie + auto-validation + clôture.

**À VALIDER MÉTIER :** agence comme axe analytique ou établissement comptable, journaux centralisés ou locaux, droits du siège, consolidation inter-agences et traitement des transferts.

## 18. Architecture technique cible

| Couche | Responsabilité proposée |
|---|---|
| Modules métier | état commercial/administratif et snapshots du fait générateur |
| Outbox métier | publication durable, ordonnée et idempotente après transaction |
| Accounting inbox | déduplication et suivi RECEIVED/PROCESSED/FAILED |
| Rule engine | règles versionnées, déterministes et simulables |
| Accounting ledger | pièces et lignes validées, périodes, séquences, reversals |
| Treasury | flux de fonds, disponible, réservations, banque |
| GED | preuve documentaire et politique de conservation |
| Read models | journal, grand livre, balance, contrôles et tableaux de bord |
| Adapters | export Sage, import banque, OCR |

Commencer dans le monolithe Node/MySQL actuel, sous un module clairement séparé, est raisonnable. Un microservice prématuré ajouterait des transactions distribuées sans résoudre la modélisation. L'outbox apporte la durabilité nécessaire tout en conservant des transactions locales.

### Contrats envisagés par domaine

| Domaine | Données / services / API conceptuelle | Permissions et tests |
|---|---|---|
| Treasury | services actuels spécialisés ; agrégats historiques et catalogue de sources | `treasury.*` ; concurrence, solde, reversal, scopes |
| Accounting | plan, périodes, règles, inbox, pièces/lignes ; API plan, simulation, brouillon, validation, reversal, journal/ledger/balance | `accounting.view/prepare/validate/reverse/period.manage/rules.manage` ; équilibre, clôture, idempotence |
| Reporting | read models et agrégateur par bucket ; API KPI/séries/export | permissions sources intersectées ; devises, double comptage, performance |
| Import/Export | import plan, lots Sage, jobs OCR et erreurs | permissions dédiées ; golden files, rejeu, sécurité documentaire |
| Assistance | catalogue de prérequis et erreurs structurées | lien filtré par permission ; tests de contrats d'erreur |

Dépendances autorisées : modules métier → outbox ; Accounting consomme les événements et référence les sources ; Reporting lit des read models ; adapters dépendent de contrats Accounting. Treasury et Accounting ne doivent pas s'appeler circulairement.

## 19. Stratégie de migration

1. **Cadrage et dictionnaire comptable** — valider référentiel, plan, journaux, taxes, devises, axes, pièces et cible Sage.
2. **Fondations en lecture parallèle** — créer plan, périodes, règles, inbox/outbox et simulation sans impact sur Treasury.
3. **Pilote encaissements clients** — générer des brouillons depuis facture/paiement/remboursement ; comparer à Sage, sans automatiser la validation.
4. **Achats et décaissements** — fournisseurs, dépenses, rémunérations, garanties ; file d'exceptions et GED obligatoire.
5. **Grand livre/balance/export** — contrôles d'équilibre, export Sage pilote et rapprochement des lots.
6. **Industrialisation** — clôtures, à-nouveaux, monitoring, reprise historique ciblée et décision de bascule.

Ne pas backfiller aveuglément tous les `treasury_movements`. Définir une date de cutover ; reprendre des soldes d'ouverture validés et, si nécessaire, un historique borné dont les pièces sources sont fiables. Conserver le lien vers les identifiants legacy.

| Phase | Prérequis / changements | Risques / tests / acceptation |
|---|---|---|
| 1 Modernisation | navigation frontend, KPI, journal, erreurs structurées, optimisation mesurée | non-régression Treasury ; KPI réconciliés par devise et source |
| 2 Fondations | migrations additives plan/journaux/périodes/pièces/règles/outbox ; simulation | double posting/cutover ; 100 % événements pilotes expliqués ou en exception |
| 3 Avancée | grand livre, balance, clôture, export Sage | équilibre, performance, import réel Sage sans écart inexpliqué |
| Transversal OCR | corpus de relevés, politique sécurité, pipeline de jobs | faux positifs/coûts ; aucune validation silencieuse, taux d'erreur mesuré |

## 20. Analyse des risques

| Gravité | Probabilité | Risque | Prévention et test recommandé |
|---|---|---|---|
| Critique | Élevée | Assimiler Treasury à la comptabilité | séparation des registres ; tests de terminologie/contrats |
| Critique | Moyenne | Règles comptables non validées | signature comptable des matrices ; golden cases |
| Critique | Élevée | Double posting par plusieurs événements | catalogue d'autorité + inbox unique ; retries/concurrence |
| Critique | Moyenne | Écriture déséquilibrée ou correction destructive | validation atomique/reversal ; property tests MySQL |
| Haute | Moyenne | Mauvais cutover/reprise historique | balances d'ouverture signées ; répétition de migration |
| Haute | Moyenne | Période fermée contournée | lock période et permission auditée ; course validation/clôture |
| Haute | Élevée | Mapping Sage supposé | pilote version/dossier réels ; golden import et rejets |
| Haute | Élevée | Multi-devise sans doctrine | règles change/écarts validées ; scénarios multi-devise |
| Haute | Moyenne | Transaction inter-agences mal classée | autorité et axes explicites ; consolidation/transfert |
| Haute | Moyenne | Accès excessif aux données financières | RBAC par agence/journal ; tests négatifs et changement de contexte |
| Haute | Moyenne | Événement temps réel perdu/régression intermodule | outbox, retries, dead-letter ; test commit-publish-replay |
| Haute | Faible | Soldes divergents sous concurrence | locks ordonnés/idempotence ; stress tests MySQL |
| Moyenne | Élevée | Performance des agrégats | `EXPLAIN`, index, snapshots reproductibles ; volumétrie cible |
| Haute | Moyenne | Import/OCR erroné ou document sensible exposé | confiance + humain + chiffrement ; corpus adversarial/sécurité |
| Haute | Moyenne | Rapprochement ou export dupliqué | hashes/lots idempotents ; rejeu et annulation |

## 21. Tests et critères d'acceptation

La base actuelle possède déjà des tests utiles : `treasury-foundation`, `treasury-manual-operations`, `treasury-functional-corrections`, `treasury-flow-integration`, `budget-treasury-integration`, `fin03-treasury-coverage`, `fin07-bank-reconciliation` et `treasury-closure-mysql.integration`.

Pour Accounting, exiger au minimum :

- tests unitaires de chaque règle avec cas fiscal/devise/arrondi ;
- tests de propriété : toute pièce validée est équilibrée ;
- tests MySQL réels de concurrence, idempotence, séquences, période fermée et deadlocks ;
- tests de reversal et interdiction de mutation/suppression ;
- tests de scopes et séparation des tâches ;
- tests de cohérence facture → paiement → Treasury → Accounting → Sage ;
- golden files d'export Sage validés par import dans un dossier de test ;
- rapprochement automatique des totaux par journal/devise/période ;
- tests de reprise/cutover et rollback fonctionnel ;
- audit de sécurité et conservation GED.

Critère de sortie d'un lot : aucune différence inexpliquée entre source métier, Treasury, balance Accounting et lot Sage sur le périmètre pilote ; toutes les exceptions sont visibles, attribuées et rejouables.

## 22. Questions métier restant à valider

1. Quelle entité juridique tient les comptes et dans quel(s) pays ?
2. Quel référentiel et quel système SYSCOHADA sont applicables à LCA ?
3. Quel exercice, quelles périodes et quelles règles de clôture/réouverture ?
4. Quelle devise de tenue et quelles devises de transaction ? Quelles sources de taux ?
5. Les agences sont-elles établissements, axes analytiques ou entités distinctes ?
6. Quel plan de comptes détaillé et quels comptes auxiliaires clients/fournisseurs ?
7. Quels journaux et quelles séquences de pièces ?
8. Quelles taxes, retenues et règles locales par activité ?
9. Quels faits générateurs pour ventes, SAV, pièces, garanties et rémunérations ?
10. Quels contrôles de séparation des tâches et seuils d'approbation ?
11. Quelle politique de justificatifs et durée de conservation ?
12. Quel Sage exact, quelle version, quel dossier et quel format d'import ?
13. Sage reste-t-il le livre légal, devient-il une cible d'export, ou doit-il être remplacé ?
14. Quelle date de cutover et quelle profondeur de reprise historique ?
15. Qui signe la recette comptable et les balances d'ouverture ?

## 23. Recommandation finale

**Conserver et renforcer Treasury, puis ajouter Accounting à côté.** Le registre Treasury actuel est une base opérationnelle crédible grâce à ses transactions, locks, idempotence, reversals, scopes et liens intermodules. Le réécrire n'est pas justifié par cet audit. En revanche, l'étendre directement avec quelques colonnes `debit/credit` serait une erreur de modèle.

La prochaine mission devrait être un **atelier de conception comptable**, pas une implémentation : produire le dictionnaire des événements, la matrice de comptabilisation validée, le plan de comptes LCA, les journaux, les règles de période/devise/taxe, la gouvernance RBAC et le contrat d'échange Sage. À partir de ces décisions, un lot technique de fondations pourra être chiffré et implémenté sans déstabiliser les flux existants.

## Annexe A — Fichiers pivots

- `backend-node/src/app.ts`
- `backend-node/src/modules/treasury/treasury.routes.ts`
- `backend-node/src/modules/treasury/treasury.service.ts`
- `backend-node/src/modules/treasury/treasury-flow.service.ts`
- `backend-node/src/modules/treasury/treasury-coverage.service.ts`
- `backend-node/src/modules/treasury/bank-reconciliation.routes.ts`
- `backend-node/src/modules/treasury/bank-reconciliation.service.ts`
- `backend-node/src/modules/rbac/agency-authorization.ts`
- `backend-node/src/modules/activity/audit-writer.ts`
- `backend-node/src/modules/billing/billing.routes.ts`
- `backend-node/src/modules/parts/supplier-finance.routes.ts`
- `backend-node/src/modules/hr/hr-remuneration.routes.ts`
- `backend-node/src/modules/hr/hr-provider-remuneration.routes.ts`
- `backend-node/src/modules/workshop/warranty.routes.ts`
- `backend-node/src/modules/reports/financial-report.routes.ts`
- `backend-node/src/modules/reports/financial-report.service.ts`
- `backend-node/database/migrations/054_treasury_foundation.sql` à `059_budget_expense_treasury_disbursements.sql`
- `backend-node/database/migrations/073_treasury_reservations_and_coverage.sql`
- `backend-node/database/migrations/075_supplier_invoice_debt_management.sql`
- `backend-node/database/migrations/076_bank_reconciliation.sql`
- `backend-node/database/migrations/083_financial_workflow_hardening.sql`
- `backend-node/database/migrations/085_treasury_account_attachment.sql`
- `backend-node/database/migrations/101_provider_remuneration_finance.sql`

## Annexe B — Conclusion de conformité terminologique

| Terme | Usage correct dans LCA actuel |
|---|---|
| Compte Treasury | oui : caisse/banque/autre et flux de liquidité |
| Compte bancaire | partiel : compte Treasury BANK, identité bancaire à compléter |
| Compte comptable | non implémenté |
| Journal Treasury/financier | oui |
| Journal comptable | non |
| Mouvement comptabilisé | ambigu ; préférer « mouvement Treasury enregistré » |
| Écriture comptable | non implémentée |
| Rapprochement bancaire | oui, sans altérer les mouvements |
| Grand livre / balance | non implémentés |
