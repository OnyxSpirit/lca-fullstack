# Audit fonctionnel complet du frontend RH — ERP LCA

Date : 15 octobre 2026  
Mode : audit en lecture seule  
Périmètre : frontend RH, navigation réelle, permissions et contrats API associés.

## 1. Résumé exécutif

Le frontend RH est constitué d'une unique page navigable, `/hr`, divisée en neuf onglets conditionnés par permissions. La gestion des dépenses existe réellement, mais elle n'est ni un onglet autonome ni une entrée de navigation : elle est enfouie dans chaque carte de l'onglet **Budgets & Dépenses**. Le bouton **Ajouter une dépense** n'apparaît que sur un budget actif, non épuisé, autorisé par le backend et pour un utilisateur disposant de `hr.expense.create`. Un utilisateur qui ne satisfait pas simultanément ces conditions peut légitimement conclure que la fonctionnalité n'existe pas.

Le filtre « Employé » des rémunérations transmet correctement `employeeId` à `/hr/remunerations`. Son défaut confirmé est sa source de données : le sélecteur dépend d'une requête `/hr/employees` activée par `hr.remuneration.prepare`, alors que cette route exige séparément `hr.employees.view`. L'erreur de chargement n'est pas affichée. La liste est en outre limitée aux 100 premiers employés actifs. Le filtre est donc défaillant pour certaines combinaisons RBAC et incomplet au-delà de 100 employés ; le filtrage backend lui-même est conforme.

Verdict : module largement intégré mais insuffisamment découvrable et présentant un défaut RBAC certain dans le filtre Employé. Aucune correction n'a été appliquée.

## 2. Inventaire des pages RH

| Page navigable | Route | Montage | Accès |
|---|---|---|---|
| RH & Administration | `/hr` | `App.tsx` → `ModuleGuard` → `HrAdministrationPage` | module `hr`, permission `hr.view` |

Il n'existe aucune route enfant distincte pour les dépenses, contrats, salaires ou rémunérations. Tout est rendu dans `HrAdministrationPage` et ses composants paresseux.

La page est accessible depuis :

- la barre latérale, entrée « RH & Administration » ;
- le portail des modules, carte « RH & Administration ».

## 3. Inventaire des onglets

| Onglet | Condition frontend | Contenu principal | Statut |
|---|---|---|---|
| Vue d'ensemble | toujours après accès au module | `HrOverviewDashboard` | ACCESSIBLE |
| Personnel | `hr.employees.view` | liste, filtres, fiche employé, création selon droit | ACCESSIBLE |
| Congés & absences | `hr.leave.view` | `LeavesAdministration` | ACCESSIBLE |
| Primes | `hr.bonus.view` | `BonusesAdministration` | ACCESSIBLE |
| Salaires | `hr.salary.view` | liste du personnel et historique salarial | ACCESSIBLE |
| Rémunérations | `hr.salary.view` et `hr.remuneration.view` | `RemunerationsAdministration` | ACCESSIBLE, filtre employé DÉFAILLANT selon RBAC |
| Stocks internes | `hr.stock.view` | articles, mouvements, catégories | ACCESSIBLE |
| Budgets & Dépenses | `hr.budget.view` | budgets, rallonges et dépenses imbriquées | PARTIELLEMENT ACCESSIBLE / faible découvrabilité |
| Reporting | `hr.reporting.view` | `HrReportingDashboard` | ACCESSIBLE |

Il n'existe pas d'onglets autonomes « Contrats », « Historique salarial », « Rallonges » ou « Dépenses ». Les contrats/congés/primes individuels se trouvent dans la fiche employé ; l'historique salarial se trouve dans l'onglet Salaires ; rallonges et dépenses sont rattachées aux cartes budgets.

## 4. Inventaire des composants RH

| Composant | Montage réel | Fonction |
|---|---|---|
| `HrAdministrationPage` | `/hr` | conteneur, onglets et modales |
| `HrOverviewDashboard` / `HrReportingDashboard` | onglets correspondants | synthèse et reporting |
| `EmployeeRecordModal` | actions Personnel | dossier employé et documents |
| `EmployeeContractsSection` / `ContractTypesManager` | fiche employé | contrats et référentiel |
| `EmployeeLeavesSection` / `LeaveTypesManager` | fiche employé | congés individuels et types |
| `EmployeeBonusesSection` / `BonusTypesManager` | fiche employé | primes individuelles et types |
| `LeavesAdministration` | onglet Congés | administration transversale |
| `BonusesAdministration` | onglet Primes | administration transversale |
| `RemunerationsAdministration` | onglet Rémunérations | préparation jusqu'au paiement |
| `BudgetExpenseDisbursement` | modale d'une dépense | décaissement et historique |
| `OperationTimeline` | historiques budget/rémunération | chronologie générique |

Aucun composant RH exporté majeur n'est totalement orphelin selon le graphe d'import statique. Plusieurs composants ne sont toutefois montés qu'après ouverture d'une fiche ou d'une modale et sont donc invisibles sans le parcours approprié.

## 5. Audit détaillé des dépenses RH

### Réponses factuelles

1. **Onglet Dépenses autonome : non.** L'onglet se nomme « Budgets & Dépenses ».
2. **Bouton de création : oui.** Libellé « Ajouter une dépense ».
3. **Emplacement exact :** `/hr` → onglet « Budgets & Dépenses » → carte d'un budget → groupe d'actions en bas de la carte.
4. **Conditions d'affichage :** `hr.budget.view` pour atteindre l'onglet, puis `hr.expense.create`, `budget.can_create_expense`, statut `active` et `remaining > 0`.
5. **Formulaire : oui**, modale `expense-add`, composant `ExpenseCreationForm`.
6. **Champs :** libellé, montant, date de dépense, catégorie budgétaire facultative, référence.
7. **Connexion API : oui.** `actions.expense.mutateAsync` → `POST /hr/budgets/:budgetId/expenses`.
8. **Sélection d'un budget actif : indirecte.** L'utilisateur ne choisit pas le budget dans le formulaire ; il ouvre le formulaire depuis la carte du budget actif.
9. **Soumission : oui**, depuis la liste « Voir les dépenses », états `draft`/`rejected`, permission `hr.expense.submit`.
10. **Approbation/rejet : oui**, état `submitted`, permission `hr.expense.approve`.
11. **Modification/annulation : oui**, permission `hr.expense.manage`; modification limitée aux états `draft`/`rejected`, annulation masquée pour `approved`/`cancelled`.
12. **Décaissement : oui**, via `BudgetExpenseDisbursement`, avec `hr.expense.disburse`, `treasury.disbursement.create`, `can_disburse` et reste positif.
13. **Accès direct depuis RH : oui mais imbriqué**, jamais depuis une liste globale de dépenses.
14. **Permissions/statuts masquants : oui**, détaillés ci-dessus.
15. **Composants développés non montés : aucun composant principal de dépense identifié.**

### Parcours réel

Accueil → « RH & Administration » → « Budgets & Dépenses » → repérer un budget actif avec solde → « Ajouter une dépense » → formulaire → enregistrer → « Voir les dépenses » → soumettre → approuver/rejeter → « Décaisser / Historique ».

### Pourquoi l'utilisateur ne voit pas la création

Les causes démontrées sont :

- absence d'un onglet ou bouton global « Dépenses » ;
- onglet entièrement masqué sans `hr.budget.view`, même avec un droit de dépense isolé ;
- bouton rendu séparément dans chaque carte, et seulement si les quatre conditions de création sont vraies ;
- aucun état vide global n'explique que la création nécessite un budget actif et disponible ;
- si `can_create_expense` est faux, le code n'affiche aucune explication, contrairement aux cas budget inactif ou épuisé lorsque ce drapeau est vrai.

## 6. Emplacement exact du bouton de création

Fichier : `frontend/src/modules/hr/HrAdministrationPage.tsx`.  
Bloc : rendu `tab === "budgets"`, boucle `budgets.data?.map`.  
Variable : `canAdd`.  
Action : sélection du budget puis `setModal("expense-add")`.

Il n'existe aucun bouton équivalent dans la barre d'onglets, l'en-tête de page ou la navigation latérale.

## 7. Conditions empêchant son affichage

| Condition absente | Effet |
|---|---|
| `hr.view` | module inaccessible |
| `hr.budget.view` | onglet Budgets & Dépenses absent |
| `hr.expense.create` | bouton absent |
| `can_create_expense` backend | bouton absent, sans explication dédiée |
| budget `active` | bouton absent ; message « Budget non actif » si les autres conditions le permettent |
| `remaining > 0` | bouton absent ; message budget consommé |

SUPER_ADMIN ne contourne pas ces conditions métier : il doit posséder les permissions persistées et le budget doit rester compatible.

## 8. Audit détaillé des rémunérations

| Étape | UI / condition | Route | Statut |
|---|---|---|---|
| Choisir période | champ mois contrôlé par `period` | paramètre `period` | ACCESSIBLE |
| Préparer toute la période | bouton avec `hr.remuneration.prepare` | `POST /hr/remunerations/prepare` | ACCESSIBLE |
| Préparation ciblée | cases `selected[]` | même route, `employeeIds` | PARTIELLE selon droits/source |
| Lister | query par période/statut/employé/agence | `GET /hr/remunerations` | ACCESSIBLE |
| Ajuster | `DRAFT` + prepare | `PATCH /hr/remunerations/:id` | ACCESSIBLE |
| Soumettre | `DRAFT/REJECTED` + submit | `POST .../submit` | ACCESSIBLE |
| Valider/rejeter | `SUBMITTED` + validate | `POST .../validate|reject` | ACCESSIBLE |
| Imputer | `VALIDATED`, sans dépense + engage | `POST .../engage` | ACCESSIBLE si budget compatible |
| Soumettre dépense | dépense draft/rejected + expense.submit | `POST /hr/expenses/:id/submit` | ACCESSIBLE |
| Approuver dépense | dépense submitted + expense.approve | `POST /hr/expenses/:id/approve` | ACCESSIBLE, backend quatre yeux |
| Payer | validated, dépense approved, reste > 0 + pay | `POST .../payments` | ACCESSIBLE |
| Historique | bouton toujours présent sur une ligne | `GET .../:id/history` + décaissements | ACCESSIBLE |

Le parcours complet est présent dans un même composant. Les boutons apparaissent progressivement selon l'état et les permissions ; une rupture apparente peut donc être une condition normale de workflow.

## 9. Cause du dysfonctionnement du filtre Agents

Le contrôle est nommé « Employé » dans le code.

### Chaîne technique

- source : `GET /hr/employees?status=active&pageSize=100` ;
- état : `employee`, initialisé à chaîne vide ;
- événement : `onChange={e => setEmployee(e.target.value)}` ;
- valeur : identifiant `employee_profiles.id` ;
- paramètre liste : `employeeId` ajouté à `URLSearchParams` ;
- query key : chaîne complète des paramètres ;
- backend : filtre `rm.employee_profile_id=?` ;
- actualisation : TanStack Query relance la requête quand la query key change.

Le chemin de filtrage des rémunérations est donc techniquement correct.

### Anomalies confirmées

1. La requête employés est activée par `can('hr.remuneration.prepare')`, pas par le besoin d'afficher le filtre.
2. La route `/hr/employees` exige `hr.employees.view`, permission non exigée pour afficher l'onglet Rémunérations (`hr.salary.view` + `hr.remuneration.view`) ni pour activer la requête.
3. Une erreur 403 de cette requête n'est jamais présentée à l'utilisateur ; le sélecteur reste simplement vide.
4. La source ne contient que les employés actifs et seulement la première page de 100. Une rémunération historique d'un employé inactif ou un employé au-delà de cette page ne peut pas être sélectionné.
5. Le même jeu de données alimente deux usages différents : filtre des rémunérations existantes et sélection pour préparation ciblée.

Le filtre sert bien à filtrer les rémunérations déjà préparées. Les cases dans « Préparation ciblée » servent séparément à choisir les employés avant préparation. Les deux usages partagent néanmoins la même requête inadéquatement conditionnée.

## 10. Matrice Backend ↔ Frontend

| Fonctionnalité | Route backend | Hook/appel frontend | Composant / emplacement | Permission | Navigation | Statut réel | Correction nécessaire |
|---|---|---|---|---|---|---|---|
| Vue RH | `GET /hr/overview` | `useHrOverviewQuery` | Vue d'ensemble | accès module | directe | ACCESSIBLE | non |
| Employés | `GET /hr/employees` | `useEmployeesQuery` | Personnel | `hr.employees.view` | directe | ACCESSIBLE | non |
| Dossier employé | `GET /hr/employees/:id` | `useEmployeeQuery` | modale Personnel | view | indirecte | ACCESSIBLE | non |
| Contrats | routes contrats | hooks contrats | fiche employé | permissions contrats | indirecte | ACCESSIBLE | améliorer découvrabilité |
| Salaires | `/hr/employees/:id/salaries` | `useSalariesQuery` | Salaires / modale | salary view/manage | indirecte | ACCESSIBLE | non |
| Congés | `/hr/leaves` | `useLeavesQuery` | Congés & absences | leave view | directe | ACCESSIBLE | non |
| Primes | `/hr/bonuses` | `useBonusesQuery` | Primes | bonus view | directe | ACCESSIBLE | non |
| Stocks | `/hr/internal-stock` | `useStockQuery` | Stocks internes | stock view | directe | ACCESSIBLE | non |
| Budgets | `/hr/budgets` | `useBudgetsQuery` | Budgets & Dépenses | budget view | directe | ACCESSIBLE | non |
| Créer dépense | `POST /hr/budgets/:id/expenses` | `actions.expense` | carte budget / modale | expense create | indirecte | PARTIELLEMENT ACCESSIBLE | oui, navigation/explication |
| Gérer dépense | routes submit/approve/reject/patch/cancel | `useHrActions` | « Voir les dépenses » | permissions par action | indirecte | ACCESSIBLE | liste globale souhaitable |
| Décaisser | `POST /hr/budget-expenses/:id/disbursements` | `expenseDisbursement` | modale dépense | expense.disburse + treasury | indirecte | ACCESSIBLE | non |
| Rémunérations | `GET /hr/remunerations` | `useQuery` local | onglet Rémunérations | remuneration view + salary view | directe | ACCESSIBLE | non |
| Filtre employé | `GET /hr/employees`, puis `GET /hr/remunerations?employeeId` | queries locales | barre filtres | incohérente | directe | PRÉSENTE MAIS DÉFAILLANTE | oui |
| Préparation ciblée | `POST /hr/remunerations/prepare` | `run` local | détails à cases | remuneration prepare | directe | PARTIELLEMENT ACCESSIBLE | découpler source/permissions |
| Reporting | `GET /hr/reporting` | `useHrReportingQuery` | Reporting | reporting view | directe | ACCESSIBLE | non |

## 11. Fonctionnalités backend non intégrées

Aucune route majeure du workflow dépenses/rémunérations examinée n'est totalement non intégrée. Le principal écart est ergonomique : il n'existe pas de vue globale des dépenses, malgré la possibilité backend de gérer celles d'un budget. Les fonctionnalités de contrats et historiques existent mais restent imbriquées dans la fiche employé.

## 12. Composants frontend orphelins

Aucun composant RH principal orphelin confirmé. Les composants de types de contrats/congés/primes sont montés depuis `EmployeeRecordModal`; le décaissement est monté depuis `HrAdministrationPage`; les administrations congés/primes/rémunérations sont montées paresseusement par leur onglet.

## 13. Problèmes de navigation

- Dépenses cachées sous le niveau budget, sans vue globale.
- Aucun lien profond vers un onglet : l'état `tab` n'est pas reflété dans l'URL.
- Un rechargement ramène toujours à « Vue d'ensemble ».
- Contrats et historiques individuels nécessitent d'ouvrir une fiche employé.
- Les actions financières changent selon l'état sans explication persistante des prochaines étapes.

## 14. Problèmes de permissions

- Le sélecteur Employé mélange `hr.remuneration.prepare` et `hr.employees.view`.
- L'onglet Rémunérations n'exige pas `hr.employees.view`, ce qui rend cette combinaison réellement atteignable.
- L'onglet Budgets & Dépenses dépend uniquement de `hr.budget.view`; un droit de dépense isolé n'offre aucun parcours.
- Les actions de décaissement exigent correctement les deux permissions RH et Treasury.
- Les conditions de statut et `can_create_expense`/`can_disburse` sont correctement distinguées des droits dans le code, mais pas toujours expliquées à l'écran.

## 15. Anomalies confirmées

| ID | Gravité | Constat | Cause / preuve | Fichier | Recommandation ciblée |
|---|---|---|---|---|---|
| FRH-01 | P1 | Filtre Employé vide pour certains rôles | query activée par prepare, API exige employees.view, erreur non rendue | `RemunerationsAdministration.tsx`, `hr.routes.ts` | source dédiée conforme au scope rémunération ou exigence/affichage explicite de employees.view |
| FRH-02 | P2 | Filtre incomplet | `pageSize=100`, actifs uniquement | `RemunerationsAdministration.tsx` | endpoint/options paginés ou options issues des rémunérations visibles |
| FRH-03 | P2 | Dépenses difficiles à découvrir | aucun onglet/vue globale ; bouton par carte | `HrAdministrationPage.tsx` | sous-section explicite avec prérequis et liste globale |
| FRH-04 | P2 | Absence d'explication quand `can_create_expense=false` | message conditionné par `x.can_create_expense` | `HrAdministrationPage.tsx` | afficher la cause retournée ou un état bloqué explicite |
| FRH-05 | P2 | Tests RH existants rouges malgré compilation verte | assertions textuelles attendent anciens libellés/formatage | tests frontend RH | convertir en tests de rendu/comportement |
| FRH-06 | P3 | Filtre Agence construit depuis les résultats courants | options calculées sur `rows.data`; après sélection elles se réduisent | `RemunerationsAdministration.tsx` | source stable des agences autorisées |
| FRH-07 | P3 | Onglets non adressables | état local sans URL | `HrAdministrationPage.tsx` | synchroniser onglet avec paramètre de route |

## 16. Tests exécutés

| Vérification | Résultat | Nature |
|---|---|---|
| `npm run lint` frontend (`tsc --noEmit`) | réussi | compilation réelle |
| `hr-treasury-corrections.behavior.test.ts` | 3/3 réussi | test contractuel ciblé |
| `fin04-remunerations.test.ts` | échec : ancien libellé « Préparer la période » | test textuel fragile |
| `hr-administration.test.ts` | échec : ancienne permission attendue pour rallonge | test textuel obsolète |
| `hr-lazy-sections-lot14b2a.test.ts` | échec : format exact attendu | test textuel fragile |
| HTTP `127.0.0.1:3001/hr` | connexion refusée | observation environnement |

Les échecs observés ne sont pas des erreurs TypeScript ni des tests de rendu prouvant une panne fonctionnelle ; ils confirment une dette de tests statiques dépendants du texte source.

## 17. Limitations

- Aucun frontend n'était accessible sur le port 3001 pendant l'audit.
- Aucune session utilisateur multi-rôle n'a donc été observée au navigateur.
- Aucune donnée métier n'a été créée ou modifiée.
- Les conclusions « ACCESSIBLE » sont fondées sur le parcours de rendu, les handlers et les contrats API ; elles ne remplacent pas une recette connectée.
- Le dysfonctionnement exact signalé par l'utilisateur n'a pas pu être reproduit visuellement ; FRH-01 et FRH-02 sont néanmoins des causes déterministes démontrées dans le code.

## 18. Plan de correction priorisé

1. **FRH-01** : découpler la source du filtre Employé de la permission de préparation et aligner son scope sur la consultation des rémunérations ; rendre les erreurs visibles.
2. **FRH-02** : supprimer la limite fonctionnelle des 100 actifs et séparer options de filtre et candidats de préparation.
3. **FRH-03/04** : créer une sous-section Dépenses clairement visible dans l'onglet, avec prérequis explicites et liste des dépenses accessibles.
4. **FRH-06** : alimenter le filtre Agence depuis une source territoriale stable.
5. **FRH-05** : remplacer les assertions de chaînes par des tests de rendu avec rôles, états et interactions.
6. **FRH-07** : rendre les onglets adressables sans changer les règles métier.

## 19. Fichiers à modifier ultérieurement

- `frontend/src/modules/hr/RemunerationsAdministration.tsx`
- `frontend/src/modules/hr/HrAdministrationPage.tsx`
- `frontend/src/api/hrHooks.ts` si un hook d'options dédié est introduit
- tests `frontend/test/fin04-remunerations.test.ts`
- tests `frontend/test/hr-administration.test.ts`
- tests `frontend/test/hr-lazy-sections-lot14b2a.test.ts`
- éventuellement une route backend dédiée aux options employés, uniquement après définition du scope métier attendu

## 20. Verdict final et réponses aux questions

1. **Pourquoi aucune section de création n'est visible ?** Parce qu'il n'existe pas de section Dépenses autonome ; le bouton est local à chaque budget et masqué si une seule condition de permission, statut, capacité ou solde manque.
2. **La fonctionnalité existe-t-elle ?** Oui, création et workflow complet sont intégrés.
3. **Où ?** `/hr` → « Budgets & Dépenses » → carte d'un budget actif → « Ajouter une dépense ».
4. **Que manque-t-il ?** Une navigation explicite, une liste globale et l'explication des conditions bloquantes ; les hooks/formulaires/API existent déjà.
5. **Pourquoi le filtre Agents ne fonctionne-t-il pas ?** Sa source exige `hr.employees.view` mais est conditionnée par `hr.remuneration.prepare`, sans gestion d'erreur, et elle est limitée à 100 actifs. Le paramètre `employeeId` et le filtre backend sont corrects.
6. **La préparation ciblée fonctionne-t-elle ?** Le code transmet correctement `employeeIds` et le backend les applique. Elle ne peut cependant proposer que les employés chargés par la source limitée et autorisée ; elle est donc partiellement accessible.
7. **Autres fonctions non accessibles ?** Aucune fonctionnalité RH majeure totalement orpheline, mais contrats, historiques et dépenses sont fortement imbriqués et non adressables directement.
8. **Corrections indispensables ?** FRH-01 et FRH-02 en priorité, puis FRH-03/04 pour rendre les dépenses réellement découvrables, et FRH-05 pour fiabiliser la qualification.

**Verdict : FONCTIONNALITÉS PRINCIPALES PRÉSENTES, MAIS FRONTEND RH PARTIELLEMENT EXPLOITABLE EN RAISON D'UN FILTRE EMPLOYÉ RBAC-DÉFAILLANT ET D'UNE NAVIGATION DÉPENSES TROP IMBRIQUÉE.**
