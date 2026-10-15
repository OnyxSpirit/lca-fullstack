# AUDIT GLOBAL RH, ADMINISTRATION, COMPTABILITÉ ET TRÉSORERIE — ERP LCA

## 1. Page de présentation

| Élément | Valeur |
|---|---|
| Mission | Audit fonctionnel, technique, financier, Backend ↔ Frontend et RBAC |
| Projet | ERP/CRM La Congolaise de l'Automobile |
| Date de constat | 15 octobre 2026 |
| Révision auditée | `84b2d45` — branche `main` |
| Environnement observé | Docker local, frontend `3001`, backend et MySQL healthy |
| Nature | Audit strict, sans correction ni écriture métier |
| Archive protégée | `livrables/LCA-ERP-LIVRAISON-FINALE.zip` |
| SHA-256 constaté | `7a05ce52ace2033a5beb0b1f8ff967e346f4e63c8c0fe20bf29b91b0500ea3cc` |

Sources principales : `backend-node/src/modules/hr/*.ts`, `backend-node/src/modules/treasury/*.ts`, `frontend/src/modules/hr/*.tsx`, `frontend/src/modules/treasury/*.tsx`, `frontend/src/api/hrHooks.ts`, `frontend/src/api/treasuryHooks.ts`, migrations 071/083/084 et base MySQL locale interrogée uniquement par `SELECT`.

## 2. Résumé exécutif

Le budget signalé n'a pas échoué à l'approbation. La preuve persistée montre le cycle suivant : création par l'utilisateur 1, soumission le 15/10/2026 à 03:46:18, approbation par l'utilisateur 2 à 04:26:53 avec passage effectif `submitted → active`, rallonge de 4 000 000 XAF demandée par l'utilisateur 2 puis approuvée par l'utilisateur 1, et enfin clôture par l'utilisateur 1 à 04:28:18. Son état courant est donc `closed`. La Couverture applique correctement `WHERE b.status='active'`; elle ne doit pas afficher ce budget clôturé.

L'incompréhension est favorisée par trois lacunes : la clôture est déclenchable sans confirmation ni motif visible, l'historique d'approbation backend n'est pas affiché, et un budget peut être clôturé alors que des dépenses `draft` ou `submitted` existent. Ce dernier cas interrompt réellement le workflow car ces dépenses ne pourront plus être approuvées.

Le workflow financier backend est globalement solide : transactions, verrous `FOR UPDATE`, séparation demandeur/approbateur, idempotence par `clientRequestId`, mouvements append-only, contrepassation et protection des liquidités réservées. Une dépense ne consomme la capacité budgétaire qu'à l'état `approved`; elle ne diminue la trésorerie qu'au décaissement effectif.

La faiblesse principale est l'exploitation frontend des rémunérations. L'imputation et le paiement exigent la saisie d'identifiants MySQL bruts. Après imputation, une dépense `draft` est créée, mais l'écran Rémunérations ne guide pas vers sa soumission puis son approbation. La préparation retourne actuellement zéro parce que la base compte un employé actif, mais aucun contrat actif et aucun historique salarial. L'interface n'explique pas cette cause.

La migration 084 est aujourd'hui appliquée, contrairement à l'état du précédent audit. Le rôle système authentique `SUPER_ADMIN` possède 260 permissions actives, sans scope nul ; toutes les permissions RH/Trésorerie auditées sont `GLOBAL`. Les fonctions invisibles au Super Administrateur relèvent donc principalement de composants absents ou de conditions métier, pas d'un manque RBAC.

Verdict : **exploitation partielle, correction nécessaire avant qualification complète des workflows budget/rémunération**. Aucun P0 démontré ; deux P1 de continuité opérationnelle et plusieurs P2 d'exposition/ergonomie/qualification.

## 3. Périmètre audité

- RH : vue d'ensemble, employés, dossiers, comptes utilisateurs, contrats, salaires, congés, primes, rémunérations, budgets, rallonges, dépenses, stocks, reporting.
- Trésorerie : comptes, catégories, encaissements/décaissements manuels, transferts, journal, soldes, couverture, réservations, règlements budgétaires, contrepassations, rapprochement bancaire, reporting.
- Transversal : RBAC dynamique, scopes OWN/AGENCY/CONCESSION/GLOBAL, territorialité, quatre yeux, transactions, audit, realtime, hooks TanStack Query et navigation.
- Hors test réel : aucune écriture n'a été effectuée sur la base métier ; les transitions mutantes ont été qualifiées par code/tests existants uniquement.

## 4. Architecture financière actuelle

```text
Budget draft → submitted → active → closed
                         │
                         ├─ rallonge SUBMITTED → APPROVED → budget_fund_movements
                         │
                         └─ dépense draft → submitted → approved (engagement)
                                                        │
                       réservation DRAFT → SUBMITTED → ACTIVE
                                                        │
                                                        └─ décaissement
                                                           ├─ budget_expense_disbursements
                                                           └─ treasury_movements OUT/POSTED
```

Le budget est une autorisation. La dépense approuvée est un engagement. La réservation protège une fraction de liquidité mais ne crée aucun mouvement. Le décaissement crée le mouvement financier et diminue le solde. Une contrepassation neutralise le décaissement sans supprimer l'historique.

## 5. Cartographie des modules RH et Trésorerie

| Domaine | Backend | Frontend | Appréciation |
|---|---|---|---|
| Personnel/dossiers | Routes CRUD, compte, avatar, documents | `HrAdministrationPage`, `EmployeeRecordModal` | Exposé |
| Contrats | Types, création, activation, fin, annulation, renouvellement | `EmployeeContractsSection`, `ContractTypesManager` | Exposé |
| Salaires | Historique, création/correction | Dossier employé | Exposé sous permissions |
| Congés/primes | Cycles complets et catalogues | Écrans dédiés | Exposé |
| Rémunérations | Préparer, ajuster, soumettre, décider, engager, payer, historique | `RemunerationsAdministration` | Partiel |
| Budgets/dépenses | Cycle, rallonges, historique, paiement | `HrAdministrationPage`, `BudgetTreasuryPanel`, `BudgetExpenseDisbursement` | Partiel |
| Stocks RH | Articles/mouvements | RH Administration | Exposé |
| Trésorerie | Comptes, catégories, opérations, réservations, couverture | `TreasuryPage` | Majoritairement exposé |
| Rapprochement | Import, validation, rapprochement, export | `BankReconciliationPanel` | Exposé, quelques routes secondaires absentes |

## 6. Workflow budgétaire réel

`POST /hr/budgets` crée toujours un `draft`. `POST /:id/submit` passe à `submitted`. `POST /:id/approve`, protégé par `hr.budget.approve`, exige `submitted`, refuse le créateur, verrouille la ressource dans une transaction, inscrit décideur/date/historique/audit et passe explicitement à `active`. Aucun seuil ne contourne cette approbation. L'approbation ne crée aucun mouvement de trésorerie.

La rallonge suit également quatre yeux : requête `SUBMITTED`, approbation séparée, puis création d'un `budget_fund_movements/additional_allocation`. Aucun mouvement Treasury n'est créé.

Constat local exact du budget 1 :

| Heure | Action | Acteur | Transition/montant |
|---|---|---:|---|
| 14/10 16:03:23 | Création | 1 | `null → draft` |
| 15/10 03:46:18 | Soumission | 1 | `draft → submitted` |
| 15/10 04:26:53 | Approbation | 2 | `submitted → active` |
| 15/10 04:27:22 | Demande rallonge | 2 | 4 000 000 XAF |
| 15/10 04:28:11 | Approbation rallonge | 1 | mouvement d'allocation créé |
| 15/10 04:28:18 | Clôture | 1 | `active → closed` |

Cause démontrée du cas 1 : le budget était actif, puis a été clôturé. Le cache frontend est invalidé après mutation par `useHrActions`; l'état fermé est persistant, pas un défaut d'actualisation.

## 7. Audit des dépenses RH

- Création : budget actif, date dans la période, montant positif, catégorie compatible ; état `draft`.
- Soumission : `draft|rejected → submitted`.
- Approbation : `submitted → approved`, quatre yeux, budget toujours actif, recalcul de capacité sous verrou.
- Consommation budgétaire : la somme `spent` ne compte que les dépenses `approved` ; un brouillon ne consomme rien.
- Paiement : nécessite `hr.expense.disburse` **et** `treasury.disbursement.create`; accepte les paiements partiels et calcule le reste net des contrepassations.
- Trésorerie : le mouvement `OUT/POSTED` est créé dans la même transaction que le décaissement.
- Doublon : `(created_by, client_request_id)` rend la requête idempotente et refuse un même identifiant avec contenu différent.
- Dépassement : contrôle du reste à engager à l'approbation et du reste à décaisser au paiement.
- Annulation : impossible après décaissement ; une dépense approuvée exige un traitement budgétaire dédié.
- Justificatifs : la GED générique existe, mais aucun champ/pièce justificative spécifique n'est intégré au formulaire de dépense RH.

Rupture : `close` ne compte que rallonges soumises, engagements approuvés impayés et réservations actives ; les dépenses `draft`, `submitted` ou `rejected` ne bloquent pas la clôture.

## 8. Audit des rémunérations

| Élément | État réel | Preuve |
|---|---|---|
| Employé actif | Implémenté | filtre `employment_status='active'` |
| Contrat actif/période | Implémenté | `EXISTS employee_contracts`, dates effectives |
| Salaire applicable | Implémenté | dernier `salary_history.effective_date <= fin période` |
| Primes | Implémenté | primes `APPROVED`, période, snapshot et unicité |
| Retenues/cotisations | Absent | aucun calcul/table liée dans la préparation |
| Brut/net | Partiel | `salary_amount + bonus_amount = payable_amount`, pas de paie légale |
| Proratisation | Absente | explicitement annoncé par l'écran |
| Devise/territoire | Implémenté | snapshots concession/agence/devise |
| Préparation ciblée employés | Backend seulement | `employeeIds` accepté, aucun sélecteur frontend |
| Ajustement payable | Backend seulement | `PATCH /hr/remunerations/:id` absent de l'écran |
| Soumission/validation/rejet | Implémenté et visible | boutons conditionnels et permissions |
| Historique | Backend seulement | `GET /:id/history`, aucun panneau frontend |
| Engagement | Partiel | crée une dépense `draft`; saisie brute `budgetId` |
| Paiement individuel/partiel | Partiel | backend complet ; formulaire technique |
| Paiement groupé | Absent | aucune route ni interface |

Pourquoi la préparation locale produit zéro : 1 employé est actif, mais la base contient 0 contrat actif, 0 ligne d'historique salarial et donc 0 employé éligible. Une période déjà préparée est aussi ignorée via l'unicité et `ER_DUP_ENTRY`. La réponse `{count:0}` ne détaille aucune raison et l'écran affiche seulement « Aucune rémunération préparée ».

L'imputation crée bien une dépense `draft` et lie immédiatement `hr_remunerations.budget_expense_id`. Cette dépense doit ensuite être soumise et approuvée depuis l'onglet Budgets. Aucun lien, message ou navigation ne l'indique dans l'écran Rémunérations.

## 9. Audit des paiements

Le paiement salarial réutilise `budgetExpenseDisburse`; il ne duplique pas une comptabilité parallèle. Préconditions : rémunération `VALIDATED`, dépense liée `approved`, permissions paie + dépense + Treasury, compte actif compatible, devise/périmètre compatibles, catégorie valide, solde suffisant. Les paiements partiels sont représentés par plusieurs décaissements ; `paid_amount` est la somme non contrepassée et `remaining_amount` le reste.

La trésorerie est diminuée uniquement par `treasury_movements` `OUT/POSTED`. La réservation facultative est consommée dans la même transaction. Il n'existe ni paiement groupé ni contrepassation dédiée « paie » ; la contrepassation générique Treasury s'applique au mouvement.

## 10. Audit de la couverture financière

Formules dans `treasury-coverage.service.ts` :

- liquidité éligible = entrées POSTED − sorties POSTED des comptes actifs CASH/BANK, groupée par devise ;
- réservations actives = somme `active_amount` des réservations `ACTIVE` ;
- liquidité non réservée = liquidité éligible − réservations actives ;
- engagement restant = dépenses `approved` − décaissements non contrepassés ;
- couvert par réservation = `min(engagement restant, réservations actives)` ;
- engagements non réservés = `max(0, engagement restant − réservations)` ;
- insuffisance indicative = `max(0, engagement restant − liquidité éligible)`.

Les comptes inactifs et `OTHER` sont exclus. Les devises ne sont jamais additionnées. Les scopes du compte et du budget sont appliqués côté serveur. Les données sont rafraîchies par TanStack Query après les mutations concernées.

La section « Budgets approuvés » sélectionne uniquement `b.status='active'`. Ce filtre est cohérent : `closed` n'est plus une autorisation disponible. L'absence du budget local est donc correcte. Exemple : enveloppe 5 M + rallonge 4 M, engagement 0, décaissement 0 donne 9 M disponibles à engager lorsqu'actif ; après clôture, il n'apparaît plus. La caisse locale contient 18 M XAF : cela ne réactive pas le budget et ne constitue pas une allocation RH.

## 11. Audit des réservations de liquidité

Cycle implémenté : `DRAFT → SUBMITTED → ACTIVE`, avec rejet, annulation avant activation, réduction, libération, expiration et consommation. Toute activation exige une approbation sans seuil et refuse le créateur. Les contrôles verrouillent réservation, compte et capacités ; l'augmentation d'une réservation existante est interdite et exige une nouvelle demande.

Une réservation ne crée aucun mouvement Treasury. `postMovement` protège toutes les réservations actives d'un compte, sauf celle explicitement consommée par le décaissement lié. Historique et audit sont append-only.

## 12. Mise à disposition des fonds

| Option | Fonctionnement | Avantages | Risques/inconvénients | Recommandation |
|---|---|---|---|---|
| A. Réservation existante | Réserve une dépense approuvée sur un compte réel | Déjà transactionnel, audité, sans faux flux | Nécessite d'abord dépense approuvée et approbateur distinct | **Recommandée** |
| B. Affectation interne sans transfert | Nouvelle couche d'allocation logique | Peut exprimer une enveloppe de liquidité RH | Duplique budget/réservation, risque de double comptage | À écarter sans besoin comptable formel |
| C. Transfert réel | OUT d'un compte et IN d'un autre | Correct si les fonds changent réellement de caisse/banque | Faux mouvement si aucun transfert bancaire/caisse réel | Seulement pour transfert réel |

Le parcours cohérent est : budget actif → rémunération validée → dépense créée/soumise/approuvée → réservation facultative approuvée → paiement.

## 13. Synchronisation RH / Trésorerie

Les deux modules partagent les mêmes tables `budgets`, `budget_expenses`, `budget_expense_disbursements` et `treasury_movements`. `BudgetTreasuryPanel` réutilise les hooks RH. Les mutations invalident les clés RH/Trésorerie et les mouvements émettent un événement realtime. Il n'y a pas de copie de solde.

Lacune : la synchronisation technique existe, mais la navigation métier entre Rémunération, dépense créée, approbation et paiement n'est pas matérialisée.

## 14. Cartographie Backend ↔ Frontend

Scopes indiqués : `O/A/C/G` = OWN/AGENCY/CONCESSION/GLOBAL selon politique ; les opérations collectives rejettent OWN.

| Module | Fonctionnalité | Route API | Méthode | Permission | Scopes | Composant frontend | Visible | Accessible | Statut | Anomalie |
|---|---|---|---|---|---|---|---|---|---|---|
| RH | Vue RH | `/hr/overview` | GET | `hr.view` + permissions sources | O/A/C/G | `HrAdministrationPage` | Oui | Oui | OK | — |
| RH | Employés/liste | `/hr/employees` | GET | `hr.employees.view` | O/A/C/G | `HrAdministrationPage` | Oui | Oui | OK | — |
| RH | Employé/création-modification | `/hr/employees[/:id]` | POST/PATCH | `hr.employees.manage` | A/C/G | `EmployeeRecordModal` | Oui | Oui | OK | — |
| RH | Compte employé | `/hr/employees/:id/account` | POST/PATCH | `hr.employee.account.manage` | A/C/G | `EmployeeRecordModal` | Oui | Oui | OK | — |
| RH | Historique salarial | `/hr/employees/:id/salaries` | GET/POST | `hr.salary.view/manage` | O/A/C/G | `EmployeeRecordModal` | Oui | Oui | OK | — |
| RH | Types contrat | `/hr/contract-types` | GET/POST/PATCH | `hr.contract.type.manage` | C/G | `ContractTypesManager` | Oui | Oui | OK | — |
| RH | Contrats | `/hr/employees/:id/contracts` | GET/POST | `hr.contract.view/manage` | O/A/C/G | `EmployeeContractsSection` | Oui | Oui | OK | — |
| RH | Activer/finir/annuler/renouveler contrat | `/hr/contracts/:id/{activate,end,cancel,renew}` | POST | `hr.contract.manage` | A/C/G | `EmployeeContractsSection` | Oui | Oui | OK | — |
| RH | Congés et types | `/hr/leaves*`, `/hr/leave-types*` | GET/POST/PATCH | `hr.leave.*` | O/A/C/G | `LeavesAdministration` | Oui | Oui | OK | — |
| RH | Primes et types | `/hr/bonuses*`, `/hr/bonus-types*` | GET/POST/PATCH | `hr.bonus.*` | O/A/C/G | `BonusesAdministration` | Oui | Oui | OK | — |
| RH | Stocks/articles/mouvements | `/hr/stock*` | GET/POST/PATCH | `hr.stock.*` | A/C/G | `HrAdministrationPage` | Oui | Oui | OK | — |
| RH | Catégories budget | `/hr/budget-categories*` | GET/POST/PATCH | `hr.budget.category.*` | C/G | gestionnaire modal | Oui | Oui | OK | — |
| Budget | Liste/cibles/création | `/hr/budgets`, `/hr/budget-targets` | GET/POST | `hr.budget.view/manage` | A/C/G | `HrAdministrationPage` | Oui | Oui | OK | — |
| Budget | Modifier brouillon/rejeté | `/hr/budgets/:id` | PATCH | `hr.budget.manage` | A/C/G | aucun formulaire d'édition | Non | Non | ABSENT | A-06 |
| Budget | Soumettre | `/hr/budgets/:id/submit` | POST | `hr.budget.submit` | A/C/G | RH + `BudgetTreasuryPanel` | Oui | Oui | OK | — |
| Budget | Approuver/rejeter | `/hr/budgets/:id/{approve,reject}` | POST | `hr.budget.approve` | A/C/G | RH + Treasury | Oui | Oui | OK | — |
| Budget | Réouvrir rejeté | `/hr/budgets/:id/reopen` | POST | `hr.budget.manage` | A/C/G | aucun | Non | Non | ABSENT | A-06 |
| Budget | Annuler brouillon | `/hr/budgets/:id/cancel` | POST | `hr.budget.manage` | A/C/G | aucun | Non | Non | ABSENT | A-06 |
| Budget | Clôturer | `/hr/budgets/:id/close` | POST | `hr.budget.manage` | A/C/G | RH + Treasury | Oui | Oui | PARTIEL | A-01/A-02 |
| Budget | Historique approbation | `/hr/budgets/:id/approval-history` | GET | `hr.approval.history.view` | O/A/C/G | aucun | Non | Non | ABSENT | A-03 |
| Budget | Fonds/historique | `/hr/budgets/:id/funds` | GET | `hr.budget.view` | A/C/G | `BudgetFundHistory` | Oui | Oui | OK | — |
| Budget | Demander rallonge | `/hr/budgets/:id/funds` | POST | `hr.budget.fund.request` | A/C/G | RH + Treasury | Oui | Oui | OK | — |
| Budget | Décider rallonge | `/hr/budget-fund-requests/:id/{approve,reject}` | POST | `hr.budget.fund.approve` | A/C/G | `BudgetTreasuryPanel` | Oui | Oui | OK | — |
| Dépense | Liste/création | `/hr/budgets/:id/expenses` | GET/POST | `hr.expense.view/create` | A/C/G | RH Budgets | Oui | Oui | OK | — |
| Dépense | Modifier | `/hr/expenses/:id` | PATCH | `hr.expense.manage` | A/C/G | aucun | Non | Non | ABSENT | A-06 |
| Dépense | Soumettre/décider | `/hr/expenses/:id/{submit,approve,reject}` | POST | `hr.expense.submit/approve` | A/C/G | RH Budgets | Oui | Oui | OK | — |
| Dépense | Annuler | `/hr/expenses/:id/cancel` | POST | `hr.expense.manage` | A/C/G | aucun | Non | Non | ABSENT | A-06 |
| Dépense | Historique paiement | `/hr/budget-expenses/:id/disbursements` | GET | `hr.expense.view` | A/C/G | `BudgetExpenseDisbursement` | Oui | Oui | OK | — |
| Dépense | Décaisser | même route | POST | `hr.expense.disburse` + `treasury.disbursement.create` | A/C/G | `BudgetExpenseDisbursement` | Oui | Oui | OK | — |
| Paie | Liste | `/hr/remunerations` | GET | `hr.remuneration.view` + `hr.salary.view` | O/A/C/G | `RemunerationsAdministration` | Oui | Oui | OK | — |
| Paie | Préparer | `/hr/remunerations/prepare` | POST | `hr.remuneration.prepare` + salaire | A/C/G | même composant | Oui | Oui | PARTIEL | A-04 |
| Paie | Ajuster brouillon | `/hr/remunerations/:id` | PATCH | `hr.remuneration.prepare` | A/C/G | aucun | Non | Non | ABSENT | A-06 |
| Paie | Soumettre/valider/rejeter | `/hr/remunerations/:id/{submit,validate,reject}` | POST | `hr.remuneration.submit/validate` | A/C/G | même composant | Oui | Oui | OK | — |
| Paie | Imputer budget | `/hr/remunerations/:id/engage` | POST | `hr.remuneration.engage` + `hr.expense.create` | A/C/G | saisie `budgetId` | Oui | Difficile | PARTIEL | A-05 |
| Paie | Payer | `/hr/remunerations/:id/payments` | POST | paie + dépense + Treasury | A/C/G | formulaire IDs bruts | Oui | Difficile | PARTIEL | A-05 |
| Paie | Historique | `/hr/remunerations/:id/history` | GET | `hr.remuneration.view` | O/A/C/G | aucun | Non | Non | ABSENT | A-03 |
| RH | Reporting | `/hr/reporting` | GET | `hr.reporting.view` + sources | O/A/C/G | `HrAnalytics` | Oui | Oui | OK | — |
| Treasury | Comptes | `/treasury/accounts*` | GET/POST/PATCH | `treasury.view/account.manage` | A/C/G | `TreasuryPage` | Oui | Oui | OK | — |
| Treasury | Catégories | `/treasury/categories*` | GET/POST/PATCH | `treasury.view/category.manage` | C/G | `TreasuryPage` | Oui | Oui | OK | — |
| Treasury | Encaissement/décaissement manuel | `/treasury/manual-{receipts,disbursements}` | POST | permissions dédiées | A/C/G | `TreasuryPage` | Oui | Oui | OK | — |
| Treasury | Transfert | `/treasury/transfers` | POST | `treasury.transfer.create` | A/C/G | `TreasuryPage` | Oui | Oui | OK | — |
| Treasury | Journal/détail/export/résumé | `/treasury/journal*`, `/summary` | GET | `treasury.view` | A/C/G | `TreasuryPage` | Oui | Oui | OK | — |
| Treasury | Contrepassation | `/treasury/movements/:id/reversal` | POST | `treasury.reverse` | A/C/G | `TreasuryPage` | Oui | Oui | OK | — |
| Couverture | Indicateurs | `/treasury/coverage` | GET | `treasury.coverage.view` | A/C/G | `TreasuryPage` | Oui | Oui | OK | — |
| Couverture | Budgets actifs | `/treasury/budget-indicators` | GET | `treasury.coverage.view` | A/C/G | `TreasuryPage` | Oui | Oui | OK | — |
| Réservation | Liste/éligibles/créer | `/treasury/reservations`, `/reservation-expenses` | GET/POST | reservation view/create | A/C/G | `TreasuryPage` | Oui | Oui | OK | — |
| Réservation | Soumettre/approuver/rejeter | `/treasury/reservations/:id/{submit,approve,reject}` | POST | permissions dédiées | A/C/G | `TreasuryPage` | Oui | Oui | OK | — |
| Réservation | Annuler/expirer/libérer | routes dédiées | POST | permissions dédiées | A/C/G | `TreasuryPage` | Oui | Oui | OK | — |
| Réservation | Ajuster montant | `/treasury/reservations/:id` | PATCH | `treasury.reservation.adjust` | A/C/G | hook seulement, pas d'action UI | Non | Non | ABSENT | A-07 |
| Réservation | Historique | `/treasury/reservations/:id/history` | GET | `treasury.reservation.view` | A/C/G | aucun | Non | Non | ABSENT | A-07 |
| Rapprochement | Import/liste/détail/décision | `/treasury/bank-statements*` | GET/POST | `treasury.reconciliation.*` | A/C/G | `BankReconciliationPanel` | Oui | Oui | OK | — |
| Rapprochement | Propositions/rapprocher/annuler | routes dédiées | GET/POST | reconciliation view/reconcile/cancel | A/C/G | panneau rapprochement | Oui | Oui | OK | — |
| Rapprochement | Historique import | `/treasury/bank-statements/:id/history` | GET | view | A/C/G | aucun | Non | Non | ABSENT | A-03 |
| Rapprochement | Non rapprochés | `/treasury/bank-unmatched` | GET | view | A/C/G | hook/interface non identifié | Non | Non | NON TESTÉ | — |

## 15. Fonctionnalités backend non exposées

Édition/réouverture/annulation de budget, historique global d'approbation, édition/annulation de dépense, ajustement et historique des rémunérations, sélection ciblée des employés à préparer, ajustement/historique de réservation et historique d'import bancaire. Elles ne sont pas fonctionnellement livrées malgré leurs routes.

## 16. Fonctionnalités frontend inaccessibles

Les boutons rendus sont globalement cohérents avec `can(...)`. Les fonctions d'imputation/paiement de rémunération sont visibles mais pratiquement inaccessibles à un utilisateur métier sans connaître des identifiants techniques. La dépense créée par l'imputation est accessible ailleurs, sans lien direct.

## 17. Fonctionnalités masquées à tort

Aucun masquage RBAC erroné n'a été démontré dans l'état actuel. Les absences identifiées sont des composants non implémentés/intégrés, pas des boutons cachés par une permission incorrecte. Le scope OWN est correctement refusé pour les ressources financières collectives.

## 18. Audit spécifique Super Administrateur

Migration 084 : `APPLIED` le 15/10/2026 à 04:20:29 ; étape 1 `APPLIED`. Le rôle `SUPER_ADMIN` est système, actif, possède 260/260 permissions actives et aucun scope nul. Les 54 permissions RH/Trésorerie listées en base sont `GLOBAL`. Aucun bypass par nom de rôle n'est utilisé par le service RBAC.

Conclusion : le Super Admin peut franchir les contrôles de permission, mais reste soumis aux quatre yeux, aux statuts, aux soldes et aux compatibilités territoriales/devise. Il ne peut pas rendre disponibles des interfaces inexistantes.

## 19. Audit RBAC et scopes

- Backend : `requirePermission` puis `assertPermission`; les prédicats appliquent agence/concession/utilisateur.
- Frontend : onglets et actions conditionnés par `can(...)`.
- Quatre yeux : budgets, dépenses, rallonges, rémunérations, primes et réservations refusent l'auto-décision.
- Paiement budgétaire : double permission RH + Treasury.
- Délégation : politique de scopes centralisée ; aucun scope supérieur à celui du délégant.
- Protection dernier Super Admin : couverte par le module RBAC antérieurement validé, non réexercée sur base métier dans cet audit.

## 20. Audit de cohérence des données

État lu : 1 budget `closed` (5 M), 1 rallonge approuvée (4 M), 0 dépense, 0 rémunération, 0 réservation, 0 décaissement budgétaire, 1 compte CASH actif avec solde 18 M XAF.

Contrôles agrégés : 0 dépense orpheline, 0 décaissement orphelin, 0 décaissement sans mouvement, 0 surpaiement, 0 compte négatif, 0 réservation active supérieure à son montant initial. Aucun double paiement ni corruption n'est démontré sur les données présentes. La faible volumétrie ne permet pas une validation statistique du workflow.

## 21. Audit ergonomique

Points corrects : sélecteurs métier pour budgets, comptes, catégories et réservations dans les écrans généraux ; badges/statuts ; états de chargement ; toasts ; affichage payé/reste ; invalidation de cache.

Points faibles : IDs bruts dans la paie (`budgetId`, `accountId`, `categoryId`, `reservationId`), zéro préparation sans diagnostic, aucune navigation vers la dépense créée, clôture sans confirmation explicite, historique d'approbation absent, motifs de rejet figés dans `BudgetTreasuryPanel`, absence de filtres/statuts riches dans la liste des rémunérations.

## 22. Anomalies P0/P1/P2/P3

### A-01 — Clôture avec demandes de dépense non terminales

- Module : Budget ; gravité : **P1** ; fonctionnalité : clôture.
- Attendu : refuser la clôture tant que toute dépense brouillon/soumise nécessite une décision, ou traiter explicitement ces demandes.
- Constaté : seules les dépenses approuvées impayées bloquent ; `draft/submitted/rejected` sont ignorées.
- Cause technique : sous-requête `unpaid` de `POST /hr/budgets/:id/close` limitée à `approval_status='approved'`.
- Fichier/route : `backend-node/src/modules/hr/hr.routes.ts`, route `close`.
- Reproduction : budget actif → créer/soumettre dépense → clôturer budget → tentative d'approbation refusée car budget non actif.
- Impact : workflow dépense bloqué, demandes suspendues sans résolution.
- Correction : verrouiller et refuser si états non terminaux ; définir la politique pour rejetées ; ajouter tests concurrence.

### A-02 — Clôture dangereusement facile et irréversible

- Module : RH/Treasury ; gravité : **P2** ; fonctionnalité : clôture budget.
- Attendu : confirmation explicite avec conséquences et résumé des contrôles.
- Constaté : bouton direct dans deux écrans, sans modal/motif ; aucune route de réouverture d'un budget fermé.
- Cause : appels directs à `budgetClose.mutateAsync` dans `HrAdministrationPage.tsx` et `BudgetTreasuryPanel.tsx`.
- Reproduction : budget actif → cliquer « Clôturer » → mutation immédiate.
- Impact : explique l'incident utilisateur ; disparition immédiate de Couverture.
- Correction : modal de confirmation, motif, historique visible ; ne pas ajouter une réouverture sans règle comptable.

### A-03 — Historiques métiers invisibles

- Module : Budget/Paie/Réservation/Rapprochement ; gravité : **P2**.
- Constaté : routes d'historique présentes, composants absents.
- Fichiers : routes concernées et pages RH/Treasury.
- Impact : utilisateur incapable d'expliquer une transition, notamment `active → closed`.
- Correction : panneaux chronologiques, acteur/date/motif/statuts, permission identique au backend.

### A-04 — Préparation à zéro sans diagnostic

- Module : Rémunérations ; gravité : **P2**.
- Attendu : distinguer sans contrat, sans salaire, hors scope, déjà préparé.
- Constaté : `{count:0}` puis simple état vide. Localement : 1 employé actif, 0 contrat actif, 0 salaire.
- Cause : route ne renvoie que les IDs créés ; le frontend ignore le résultat de mutation.
- Correction : résumé non sensible des exclusions et toast adapté.

### A-05 — Workflow paie techniquement exposé mais inexploitable

- Module : Rémunérations ; gravité : **P1**.
- Attendu : sélecteurs compatibles et continuité jusqu'à l'approbation/paiement.
- Constaté : saisie manuelle de quatre IDs ; aucune transition vers la dépense `draft` créée.
- Cause : formulaire minimal de `RemunerationsAdministration.tsx` sans hooks d'options/navigation.
- Impact : erreurs d'ID, paiement bloqué, fonctionnalité essentielle non maîtrisable.
- Correction : sélecteurs filtrés, lien vers demande, statut d'approbation et réutilisation de `BudgetExpenseDisbursement`.

### A-06 — Routes de gestion sans interface

- Module : Budgets/Dépenses/Paie ; gravité : **P2**.
- Fonctionnalités : modifier/réouvrir/annuler budget, modifier/annuler dépense, ajuster rémunération.
- Cause : hooks partiels ou composants absents.
- Impact : recours à l'API, impossibilité de corriger un brouillon depuis l'ERP.
- Correction : formulaires ciblés conformes aux machines à états.

### A-07 — Réservation partiellement administrable

- Module : Trésorerie ; gravité : **P2**.
- Constaté : ajustement et historique backend non exposés.
- Impact : réduction contrôlée et traçabilité indisponibles dans l'interface.
- Correction : action de réduction seulement, modal motivé, historique.

### A-08 — Tests statiques sensibles au formatage

- Module : Qualification ; gravité : **P2**.
- Constaté : 33/59 tests ciblés réussissent, 26 échouent majoritairement sur regex de texte ne tolérant plus le formatage (`sourceType:'…'` vs code formaté), alors que TypeScript backend/frontend passe.
- Cause démontrée : assertions sur chaînes sources compactes dans plusieurs anciens tests.
- Impact : signal CI bruité ; une régression réelle peut être masquée.
- Correction : tests comportementaux/AST ou regex tolérantes, sans diminuer les assertions métier.

Aucun P0. Aucun P3 isolé prioritaire.

### Fiches normalisées complémentaires

| ID | Fonctionnalité / attendu | Constat / cause | Fichier et fonction/route | Reproduction et impact | Correction et tests nécessaires |
|---|---|---|---|---|---|
| A-01 | Clôture ; aucune demande non terminale | `draft/submitted/rejected` ignorées par le contrôle `blocking` | `backend-node/src/modules/hr/hr.routes.ts`, `POST /hr/budgets/:id/close` | Créer/soumettre une dépense puis fermer ; approbation ensuite impossible | Étendre le verrou/contrôle ; tests états, concurrence et rollback |
| A-02 | Clôture ; consentement explicite | Mutation directe sans confirmation ; cause UI démontrée | `frontend/src/modules/hr/HrAdministrationPage.tsx`, `frontend/src/modules/treasury/BudgetTreasuryPanel.tsx`, boutons `budgetClose` | Un clic ferme et retire de Couverture ; risque de clôture involontaire | Modal, conséquences, motif ; tests composant, API et persistance |
| A-03 | Historiques ; acteurs/dates/motifs visibles | Routes présentes, aucun composant utilisateur | `hr-remuneration.routes.ts`, `hr.routes.ts`, `treasury-coverage.service.ts`, routes `history` | Ouvrir budget/rémunération/réservation ; aucun historique ; perte d'explicabilité | Timelines réutilisables ; tests permission, scope, vide et chargement |
| A-04 | Préparation ; expliquer chaque exclusion | Réponse réduite à IDs/count et résultat de mutation ignoré | `hr-remuneration.routes.ts::prepare`, `RemunerationsAdministration.tsx::run` | Préparer avec employé sans contrat/salaire ; succès vide | Résumé d'exclusion non sensible ; tests 0 contrat, 0 salaire, doublon, scope |
| A-05 | Paie ; sélections métier et parcours continu | Champs ID bruts, absence de navigation ; composant minimal | `frontend/src/modules/hr/RemunerationsAdministration.tsx`, actions `engage/pay` | Valider puis imputer ; retrouver manuellement la dépense ; paiement exige IDs | Sélecteurs filtrés + lien + composant de décaissement ; E2E partiel/complet/doublon |
| A-06 | Administration ; pouvoir corriger les brouillons | Routes sans écran ; intégration frontend absente | `hr.routes.ts`, `hr-remuneration.routes.ts`, `hrHooks.ts`, `HrAdministrationPage.tsx` | Ouvrir un brouillon et chercher éditer/annuler/réouvrir ; action absente | Formulaires ciblés ; tests statuts interdits, scopes et invalidation cache |
| A-07 | Réservations ; réduire et auditer | Hook/route non intégrés à l'UI | `treasury.routes.ts`, `treasuryHooks.ts`, `TreasuryPage.tsx` | Ouvrir une réservation active ; pas d'ajustement/historique | Modal de réduction + timeline ; tests hausse refusée, concurrence, territorialité |
| A-08 | Qualification ; tests robustes au formatage | Assertions regex sur texte compact, démontré par sorties d'échec | `backend-node/test/{budget-treasury-integration,fin02-budget-approval,fin03-treasury-coverage,treasury-*}.test.ts` | Exécuter la commande ciblée après formatage ; 26/59 échecs | AST/comportement/regex espaces ; exiger 59/59 puis intégrations MySQL isolées |

## 23. Scénarios de reproduction

1. Cas observé : consulter l'historique du budget 1 ; constater `approved` puis `closed`; ouvrir Couverture ; absence attendue.
2. A-01 : sur base isolée, créer/activer budget, créer puis soumettre dépense, clôturer, tenter approuver ; la dernière action échoue.
3. A-04 : employé actif sans contrat/salaire, préparer le mois ; réponse 201 avec `count=0`, aucun motif UI.
4. A-05 : rémunération validée, cliquer imputer/payer ; formulaire exige IDs techniques ; après imputation, revenir manuellement à Budgets pour soumettre/approuver.
5. A-07 : réservation active ; aucune action frontend de réduction ni accès à son historique.

## 24. Tests exécutés

| ID | Scénario/préconditions | Attendu | Obtenu | Qualification | Preuve/anomalie |
|---|---|---|---|---|---|
| RH-01..04 | Cycle budget, base locale + code | draft→submitted→active | historique réel conforme, puis closed | CONTRÔLE STATIQUE + LECTURE RÉELLE | routes/history |
| RH-05 | Budget actif dans Couverture | visible seulement actif | fermé donc absent | CONTRÔLE STATIQUE | filtre exact |
| RH-06..08 | Dépense create/submit/approve | transitions + quatre yeux | implémentées, pas de donnée réelle | CONTRÔLE STATIQUE | `hr.routes.ts` |
| RH-09 | Capacité consommée à approbation | somme approved | conforme | CONTRÔLE STATIQUE | SQL budgets |
| RH-10 | Préparation | salariés éligibles | 0 éligible local | CONTRÔLE STATIQUE + SELECT | A-04 |
| RH-11/12 | Sans contrat/salaire | exclusion explicable | exclusion backend, UI muette | CONTRÔLE STATIQUE | A-04 |
| RH-13/14 | Validation/imputation | quatre yeux puis draft expense | conforme backend, rupture UI | CONTRÔLE STATIQUE | A-05 |
| RH-15..17 | Paiement partiel/complet/historique | net et reste exacts | code + tests FIN04 réussis | TEST UNITAIRE RÉUSSI | FIN04 |
| RH-18/19 | Double paiement/dépassement | refus | idempotence/plafond présents | TEST UNITAIRE RÉUSSI | FIN04 |
| RH-20 | Permissions | scopes respectés | code + RBAC tests ciblés | TEST UNITAIRE RÉUSSI | RBAC |
| TRES-01..07 | Calculs couverture/budgets | formules distinctes | conformes ; budget fermé exclu | CONTRÔLE STATIQUE + SELECT | service couverture |
| TRES-08..14 | Cycle réservation | quatre yeux, consommation/libération | implémenté ; aucune donnée réelle | CONTRÔLE STATIQUE | coverage service |
| TRES-15/16 | Décaissement/solde | OUT atomique, solde dérivé | implémenté ; solde réel 18 M | CONTRÔLE STATIQUE + SELECT | treasury service |
| TRES-17 | Double paiement | idempotence | présent | TEST UNITAIRE RÉUSSI (FIN04) | clientRequestId |
| TRES-18/19 | Isolation territoire | prédicats agence/concession | présents | TEST UNITAIRE RÉUSSI (scope) | RBAC scope |
| TRES-20 | Permissions effectives | Super Admin global | 260 actives, scopes RH/Treasury GLOBAL | LECTURE RÉELLE | migration 084 |
| BF-01 | Routes exposées | actions utilisables | majorité exposée | CONTRÔLE STATIQUE | matrice |
| BF-02/09 | Routes/hook sans UI | identifier | plusieurs cas listés | CONTRÔLE STATIQUE | A-03/06/07 |
| BF-03 | Masqué à tort | détecter | non démontré | CONTRÔLE STATIQUE | — |
| BF-04 | Masquage légitime | états/permissions | conforme | CONTRÔLE STATIQUE | conditions `can` |
| BF-05 | Super Admin | permissions complètes | permissions oui, UI absentes restent absentes | LECTURE RÉELLE | migration 084 |
| BF-06 | Bouton/API refusée | détecter mismatch | non démontré | CONTRÔLE STATIQUE | — |
| BF-07 | API/UI stale | invalidation | hooks invalident | CONTRÔLE STATIQUE | `hrHooks.ts` |
| BF-08 | Navigation | onglets accessibles | routes principales intégrées | CONTRÔLE STATIQUE | pages |
| BF-10 | Workflow interrompu | continuité | paie et clôture avec pending cassées | CONTRÔLE STATIQUE | A-01/A-05 |
| TS | TypeScript backend/frontend | 0 erreur | 0 erreur | TEST RÉEL RÉUSSI | `npm run lint` |
| UT | 59 tests ciblés | tous verts | 33 OK, 26 échecs regex/format | TEST RÉEL ÉCHOUÉ | A-08 |

## 25. Tests non exécutés et limitations

- Aucun test d'écriture sur MySQL métier, conformément à la mission.
- Aucun scénario navigateur authentifié multi-rôle : il aurait nécessité des transitions métier et des données de paie inexistantes.
- Aucun test MySQL isolé créé pendant cet audit ; les suites d'intégration existantes n'ont pas été pointées vers la base métier.
- RH-01..20 et TRES-08..17 ne sont donc pas déclarés « tests réels » sauf mention explicite.
- Les échecs des anciens tests textuels empêchent de considérer la suite ciblée entièrement verte, même lorsque la cause visible est le formatage.

## 26. Plan de correction priorisé

| Lot | Objectif | Anomalies/fichiers potentiels | Dépendances/risques | Critères d'acceptation |
|---|---|---|---|---|
| 1 | Empêcher les blocages financiers | A-01, `hr.routes.ts` | politique états rejetés ; concurrence | clôture refuse toute demande non terminale ; tests MySQL |
| 2 | Fiabiliser budget/approbation | A-02/A-03, pages RH/Treasury, hooks | ne pas réouvrir comptablement sans règle | confirmation, motif, historique et état explicites |
| 3 | Compléter dépenses RH | A-06, hooks/page RH | préserver quatre yeux | édition/annulation brouillon, justificatif optionnel, E2E |
| 4 | Fiabiliser rémunérations | A-04/A-05/A-06, composant paie | confidentialité salaire, scopes | diagnostic préparation, sélecteurs, navigation, historique, partiels |
| 5 | Couverture/réservations | A-07, TreasuryPage/hooks | ne jamais créer de mouvement à la réservation | réduction motivée + historique, calculs inchangés |
| 6 | Exposer backend utile | A-03/A-06/A-07 | éviter surcharge UI | matrice sans fonctions métier orphelines prioritaires |
| 7 | RBAC/Super Admin | qualification plutôt que correction | migration 084/service RBAC | matrice automatisée scopes ; aucune dérogation par rôle |
| 8 | Non-régression | A-08, tests backend/frontend | réécrire sans affaiblir | suites unitaires vertes + MySQL isolé + navigateur multi-rôle |

## 27. Recommandation architecturale

Conserver la chaîne existante : **budget actif → dépense créée → dépense soumise → dépense approuvée/engagée → couverture → réservation facultative → paiement → historique**. Ici, l'engagement comptable naît à l'approbation de la dépense, pas à sa création. Ne pas ajouter une table d'« affectation RH » qui doublerait budget et réservation.

Réutiliser `budgetExpenseDisburse` et `BudgetExpenseDisbursement` pour la paie, avec une façade UX adaptée. Faire de la dépense l'agrégat pivot entre RH et Treasury, conserver Treasury comme registre unique des flux, et rendre les historiques visibles sans dupliquer leur stockage.

## 28. Verdict final

> Mise à jour du 15 octobre 2026 : les corrections A-01 à A-07 ont été implémentées et qualifiées statiquement. A-08 reste partiellement ouverte. Voir `RAPPORT-CORRECTION-RH-TRESORERIE-LCA.md` pour les changements, tests et limites de recette.

1. Le budget a bien été activé ; il a ensuite été clôturé.
2. Il n'apparaît pas en Couverture parce que la requête n'affiche, à juste titre, que `active`.
3. Les dépenses suivent un cycle robuste, mais clôture et interfaces incomplètes peuvent le casser.
4. La paie sait préparer/valider/engager/payer, mais ne calcule ni retenues ni cotisations et son UX n'est pas exploitable de bout en bout.
5. Les actions « sans résultat » viennent notamment de préconditions de données non expliquées.
6. L'engagement est la dépense approuvée ; la trésorerie baisse seulement au mouvement OUT.
7. Les réservations sont des protections de liquidité approuvées, sans mouvement.
8. La mise à disposition RH doit utiliser ces réservations, pas un faux transfert.
9. Plusieurs routes utiles restent sans interface ; aucune invisibilité Super Admin due au RBAC actuel n'est démontrée.
10. Priorité : corriger A-01 et A-05, puis rendre les historiques et diagnostics visibles et restaurer une suite de tests fiable.

**Verdict : PARTIELLEMENT EXPLOITABLE — CORRECTIONS P1 REQUISES AVANT VALIDATION FINALE.**
