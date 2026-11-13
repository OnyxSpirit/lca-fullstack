# Matrice de traçabilité Frontend ↔ Backend ↔ MySQL

## Légende et comptage

- **64 actions utilisateur ou capacités fonctionnelles** sont recensées ci-dessous. Une ligne peut regrouper les boutons de même effet sur une même ressource (par exemple les trois formats d'un export).
- **105 endpoints** ont été examinés dans les routeurs Treasury, Accounting et Financial Dashboard. Les endpoints sans consommateur sont conservés dans la matrice comme capacités « API seulement ».
- **Vérification S** : lecture croisée du code. **D** : commande réellement exécutée. **D-B** : dynamique bloquée par environnement.
- Statuts : **Validé S** signifie raccordement cohérent dans le code, jamais une validation métier sur MySQL réel.

| ID | Domaine | Chemin UI / route | Composant et action | Service frontend → endpoint | Permission | Service backend / tables principales | Résultat attendu / observé | Vérif. | Statut / anomalie |
|---|---|---|---|---|---|---|---|---|---|
| CT-001 | Pilotage | Sidebar → `/treasury` | `FinancialDashboardPage` charger KPI | `useFinancialDashboard` → GET `/reports/financial-dashboard` | `reporting.view` + `treasury.view` | `dashboard`; `treasury_movements`, comptes, factures, budgets | Agrégats séparés par devise ; code raccordé | S | Validé S |
| CT-002 | Pilotage | `/treasury` | filtres dates/devise/granularité | query params → même GET | idem | filtres serveur | URL synchronisée ; agence filtrée serveur | S | Validé S |
| CT-003 | Pilotage | `/treasury` | recherche/filtre/pagination activités | `useFinancialActivities` → GET `/activities` | idem | `activities`; `treasury_movements` | pagination serveur | S | Validé S |
| CT-004 | Pilotage | `/treasury` | PDF synthèse | `apiDownload` → GET `/export/pdf` | `reporting.export` | PDFKit | fichier PDF | S | Validé S |
| CT-005 | Pilotage | `/treasury` | Excel détaillé | `apiDownload` → GET `/export/xlsx` | `reporting.export` | ExcelJS | contenu XLSX, nom `.xls` observé | S | Partiel / CT-014 |
| CT-006 | Pilotage | `/treasury` | CSV détaillé | GET `/export/csv?mode=detailed` | `reporting.export` | `financialCsv` | CSV réel | S | Validé S |
| CT-007 | Pilotage | `/treasury` | Imprimer | `window.print` | accès page | navigateur | impression locale | S | Validé S |
| CT-008 | Trésorerie | `/treasury/operations?view=journal` | consulter/filtrer journal | `useTreasuryJournal` → GET `/treasury/journal` | `treasury.view` | `journal`; `treasury_movements` | journal réel paginé | S | Validé S |
| CT-009 | Trésorerie | opérations | exporter journal | `apiDownload` → GET `/treasury/journal/export` | `treasury.view` | `journalExport`; mouvements | CSV réel | S | Validé S |
| CT-010 | Trésorerie | opérations | détail mouvement | query → GET `/treasury/journal/:id` | `treasury.view` | `movement`; mouvement/audit | détail relié | S | Validé S |
| CT-011 | Trésorerie | opérations | nouvelle entrée | mutation → POST `/manual-receipts` | `treasury.receipt.create` | `createManualReceipt`; opérations/mouvements | transaction et idempotence codées | S | Validé S |
| CT-012 | Trésorerie | opérations | nouvelle sortie | POST `/manual-disbursements` | `treasury.disbursement.create` | `createManualDisbursement` | transaction codée | S | Validé S |
| CT-013 | Trésorerie | opérations | contrepasser | POST `/movements/:id/reversal` | `treasury.reverse` | `reverse`; mouvements | contre-écriture immuable | S | Validé S |
| CT-014 | Trésorerie | `/treasury/operations?view=accounts` | liste/soldes comptes | GET `/treasury/accounts`, `/summary` | `treasury.view` | comptes + mouvements | solde dérivé par devise | S | Validé S |
| CT-015 | Trésorerie | opérations/comptes | transfert | POST `/treasury/transfers` | `treasury.transfer.create` | `transfer`; transferts + 2 mouvements | double mouvement transactionnel | S | Validé S |
| CT-016 | Param. Treasury | `/treasury/settings?view=accounts` | créer compte | POST `/treasury/accounts` | `treasury.account.manage` | `createAccount`; `treasury_accounts` | persistance codée | S | Validé S |
| CT-017 | Param. Treasury | settings | modifier compte | PATCH `/accounts/:id` | idem | `updateAccount` | raccordé | S | Validé S |
| CT-018 | Param. Treasury | settings | activer/désactiver compte | PATCH `/accounts/:id/status` | idem | `accountStatus` | raccordé | S | Validé S |
| CT-019 | Param. Treasury | settings | territoires compte | GET `/account-territories` | idem | `accountTerritories` | options réelles | S | Validé S |
| CT-020 | Param. Treasury | `/treasury/settings?view=categories` | lister/créer catégorie | GET/POST `/categories` | view / `category.manage` | catégories | raccordé | S | Validé S |
| CT-021 | Param. Treasury | settings | modifier/activer catégorie | PATCH `/categories/:id[/status]` | `treasury.category.manage` | catégories | raccordé | S | Validé S |
| CT-022 | Flux | `/treasury/settings?view=flows` | état/cutover | GET `/flow-configuration`, PATCH `/flow-readiness` | `treasury.account.manage` | flow service/config | activation explicite | S | Validé S |
| CT-023 | Flux | settings | créer mapping | PUT `/flow-mappings` | idem | `saveMapping`; mappings | raccordé | S | Validé S |
| CT-024 | Flux | settings | modifier mapping | PATCH `/flow-mappings/:id` | idem | `updateMapping` | raccordé | S | Validé S |
| CT-025 | Flux | settings | activer/désactiver/supprimer | PATCH status / DELETE | idem | flow service | protection historique codée | S | Validé S |
| CT-026 | Couverture | `/treasury/commitments?view=coverage` | indicateurs couverture | GET `/coverage`, `/budget-indicators` | `treasury.coverage.view` | coverage service; budgets/mouvements | raccordé | S | Validé S |
| CT-027 | Réservations | commitments | lister/historique | GET `/reservations`, `/:id/history` | `reservation.view` | réservations/événements | raccordé | S | Validé S |
| CT-028 | Réservations | commitments | dépenses éligibles/créer | GET `/reservation-expenses`, POST `/reservations` | `reservation.create` | coverage service | idempotence codée | S | Validé S |
| CT-029 | Réservations | commitments | soumettre | POST `/:id/submit` | `reservation.submit` | transition d'état | raccordé | S | Validé S |
| CT-030 | Réservations | commitments | approuver/rejeter | POST approve/reject | `reservation.approve` | transition/audit | raccordé | S | Validé S |
| CT-031 | Réservations | commitments | réduire | PATCH `/:id` | `reservation.adjust` | `adjustReservation` | raccordé | S | Validé S |
| CT-032 | Réservations | commitments | libérer/annuler/expirer | POST release/cancel/expire | permissions dédiées | coverage service | raccordé | S | Validé S |
| CT-033 | Budgets | `/treasury/commitments?view=budgets` | budgets/indicateurs | hooks HR + Treasury | `hr.budget.view` | modules HR + coverage | données réelles | S | Validé S |
| CT-034 | Budgets | commitments | soumettre/approuver/rejeter/rouvrir | hooks HR | permissions HR dédiées | routes HR | raccordé | S | Validé S |
| CT-035 | Budgets | commitments | rallonge/approuver/rejeter | hooks HR | permissions fund | routes HR | raccordé | S | Validé S |
| CT-036 | Budgets | commitments | clôturer budget | hook HR | `hr.budget.manage` | service HR | modale réelle | S | Validé S |
| CT-037 | Banque | `/treasury/reconciliation` | lister/détail relevés | GET `/bank-statements`, `/:id` | `reconciliation.view` | bank service; statements/lines | raccordé | S | Validé S |
| CT-038 | Banque | reconciliation | import CSV | POST `/bank-statements/preview` | `reconciliation.import` | parse CSV | 5 Mo serveur vs 15 Mo UI | S | Partiel / CT-009 |
| CT-039 | Banque | reconciliation | import XLSX | même endpoint | idem | ExcelJS | 10 Mo serveur vs 15 Mo UI | S | Partiel / CT-009 |
| CT-040 | Banque | reconciliation | PDF texte | même endpoint | idem | `pdftotext` | dépendance trouvée | S+D | Validé techniquement, non exécuté fichier |
| CT-041 | Banque | reconciliation | PDF OCR | même endpoint | idem | `pdftoppm` + Tesseract | Tesseract absent | D | Anomalie / CT-003 |
| CT-042 | Banque | reconciliation | confirmer import | POST `/:id/validate` | `validate_import` | `decideImport` | bouton non filtré RBAC | S | Partiel / CT-008 |
| CT-043 | Banque | API seulement | rejeter/annuler import | POST reject/cancel | `validate_import` | bank service | pas de bouton | S | Non raccordé / CT-010 |
| CT-044 | Banque | reconciliation | historique relevé | GET `/:id/history` | `reconciliation.view` | historique | raccordé | S | Validé S |
| CT-045 | Banque | reconciliation | suggestions | GET `/bank-statement-lines/:id/proposals` | view | matching ±7 jours | raccordé | S | Validé S |
| CT-046 | Banque | reconciliation | rapprocher unitaire | POST `/bank-reconciliations` | `reconcile` | transaction, idempotence | raccordé | S | Validé S |
| CT-047 | Banque | reconciliation | annuler rapprochement | POST `/bank-reconciliations/:id/cancel` | `cancel` | libération/audit | raccordé | S | Validé S |
| CT-048 | Banque | reconciliation | exporter | GET `/bank-statements/:id/export` | `export` | CSV | raccordé | S | Validé S |
| CT-049 | Banque | API seulement | mouvements non rapprochés | GET `/bank-unmatched` | view | bank service | aucun consommateur | S | Non raccordé / CT-010 |
| CT-050 | Banque avancée | API seulement | dashboard/écarts/groupes/allocations | 5 endpoints avancés | 4 permissions | advanced service; 3 tables | backend réel, aucune UI | S | Non raccordé / CT-002 |
| CT-051 | Banque avancée | aucune UI/API CRUD | profils d'import | aucun hook | `profile.manage` inutilisée | `bank_import_profiles` | table seulement | S | Non raccordé / CT-005 |
| CT-052 | Comptabilité | `/treasury/accounting` | plan/recherche/filtres | GET `/accounting/accounts` | `chart.view` | accounting service/accounts | raccordé | S | Validé S |
| CT-053 | Comptabilité | accounting/plan | créer/importer/exporter | POST account/import; GET export | permissions chart | comptes/audit | raccordé | S | Validé S |
| CT-054 | Comptabilité | API seulement | modifier/historique compte | PATCH / GET history | `chart.manage/view` | comptes/audit_logs | pas d'UI | S | Non raccordé / CT-007 |
| CT-055 | Comptabilité | accounting/exercices | lister/créer exercice | GET/POST `/fiscal-years` | fiscal view/manage | exercices/périodes | raccordé | S | Validé S |
| CT-056 | Comptabilité | accounting/exercices | fermer/réouvrir directement | PATCH `/periods/:id/status` | `period.manage` | mise à jour directe | contourne clôture avancée | S | Anomalie / CT-001 |
| CT-057 | Comptabilité | accounting/journaux | lister/créer | GET/POST `/journals` | journal view/manage | journaux | raccordé | S | Validé S |
| CT-058 | Comptabilité | API seulement | modifier journal/mapping | PATCH endpoints | manage | journaux/mappings | aucun bouton | S | Non raccordé / CT-007 |
| CT-059 | Comptabilité | accounting/liaisons | lister/créer liaison | GET/POST `/mappings` | mapping view/manage | mappings Treasury-classe 5 | raccordé | S | Validé S |
| CT-060 | Moteur | accounting/écritures | liste, détail, créer, modifier, valider, poster, contrepasser, exporter | 8 endpoints `/entries` | permissions entry | entry service; entries/lines/sequences | cycle complet raccordé | S | Validé S |
| CT-061 | Automatisation | accounting/intégrations/schémas | lister, découvrir, relancer, créer schéma, activer | 6 endpoints | integration/scheme | events/attempts/schemes/lines | raccordé | S | Validé S, erreurs UI CT-012 |
| CT-062 | Avancée | accounting/analyses | grand livre, balance, auxiliaires, journaux, exports | 5 GET + export | ledger/balance/journal/export | entry lines/entries | raccordé | S | Validé S |
| CT-063 | Avancée | accounting/contrôles | exécuter, liste, préparer/clôturer/réouvrir période | 6 endpoints | control/closure | controls/closures/periods | partiellement raccordé ; détail absent | S | Partiel / CT-006 |
| CT-064 | Avancée | accounting/états & échanges | cartes informatives | templates/profiles/annual/carryforward API | statement/exchange/carryforward | tables avancées | aucune action réelle dans l'UI | S | Partiel / CT-006, CT-013 |

## Couverture des 105 endpoints

La matrice regroupe les endpoints par capacité. Le décompte statique est : **45 endpoints Accounting**, **57 endpoints Treasury** (dont banque avancée et deux endpoints de décaissement RH), et **3 endpoints Financial Dashboard**, soit **105 routes HTTP examinées**. Toutes sont montées sous `/api` derrière `authenticate` et `enforceAgencyScope`; chaque route métier recensée ajoute une permission dynamique.

## Scénarios RBAC

| Scénario | Résultat statique | Dynamique |
|---|---|---|
| Super Admin | permissions des migrations attribuées globalement ; routes protégées | non exécuté sur données partagées |
| Comptable autorisé | onglets filtrés par `can()` et endpoints par `requireAgencyPermission` | non exécuté |
| Permissions limitées | actions généralement masquées ; exceptions CT-004/008 | non exécuté |
| Sans permission | gardes frontend et 403 backend attendus | tests unitaires existants seulement |
| Multi-agences A/B | middleware agence et permissions recalculées côté store ; onglet local non resynchronisé (CT-011) | non exécuté faute de base jetable autorisée |
