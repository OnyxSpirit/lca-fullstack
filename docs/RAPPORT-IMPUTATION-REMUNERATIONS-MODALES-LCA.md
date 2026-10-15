# Rapport — imputation des rémunérations et modales métier LCA

Date : 15 octobre 2026

## 1. Cause du sélecteur vide

La modale d'imputation utilisait `useBudgetsQuery(can('hr.budget.view'))`. L'action « Imputer au budget » est pourtant autorisée par `hr.remuneration.engage`, complétée côté serveur par `hr.expense.create`. Un utilisateur autorisé à engager une rémunération mais dépourvu de `hr.budget.view` pouvait donc ouvrir la modale alors que la requête `/hr/budgets` était désactivée. Le tableau local restait vide sans chargement, sans erreur et sans explication.

Cette source générale présentait une seconde faiblesse : la compatibilité financière était recalculée dans React à partir d'une liste gouvernée par un autre droit et potentiellement mise en cache, alors que le serveur répétait ses propres contrôles au moment de l'écriture.

Statut : **corrigé et testé contractuellement**.

## 2. Règles de compatibilité constatées

Les règles existantes, désormais partagées conceptuellement entre la lecture dédiée et l'imputation, sont :

- rémunération `VALIDATED` sans `budget_expense_id` ;
- permission `hr.remuneration.engage`, permission `hr.salary.view` et scope d'écriture différent de `OWN` ;
- permission `hr.expense.create` et budget dans son scope effectif ;
- budget `active` ;
- même concession ;
- pour un budget d'agence, même agence que la rémunération ;
- même devise que la concession/rémunération ;
- période du budget couvrant toute la période rémunérée ;
- disponible à engager supérieur ou égal au montant payable.

Aucune catégorie budgétaire n'était exigée par le workflow historique ; aucune restriction de catégorie n'a donc été inventée. Le disponible reste `initial_amount + rallonges - dépenses approuvées`, conformément au calcul existant.

## 3. Correction de récupération et sécurité backend

Un endpoint dédié a été ajouté :

`GET /hr/remunerations/:id/compatible-budgets`

Il ne dépend pas de `hr.budget.view`. Il vérifie les permissions et scopes de l'opération réelle, l'état de la rémunération, puis applique en SQL les critères de territoire, devise, période, statut et solde. Il retourne uniquement les options sélectionnables avec libellé, agence/concession, période, devise et disponible.

La route d'écriture `POST .../engage` applique désormais aussi le scope effectif de `hr.expense.create` dans la sélection `FOR UPDATE`. Le verrou de rémunération, le verrou budgétaire, le contrôle du disponible, la création unique de la dépense et l'historique restent dans la transaction existante. L'engagement ne crée aucun mouvement Treasury et aucun décaissement.

## 4. Correction frontend de l'imputation

`RemunerationsAdministration` charge la source dédiée uniquement lorsque la modale d'engagement est ouverte. Quatre états sont distingués : chargement, erreur API, liste disponible et liste vide compatible. Une erreur de chargement n'est plus présentée comme une absence de budget.

Pendant l'imputation, la fermeture, Annuler et Confirmer sont neutralisés par `mutate.isPending`. Une erreur conserve la modale et les valeurs du formulaire ; le succès attend les invalidations RH et Treasury avant fermeture.

Statut du parcours : **corrigé, compilé et testé contractuellement ; recette MySQL/navigation non exécutée**.

## 5. Fiabilisation de `BusinessDialogHost`

Le gestionnaire partagé accepte maintenant des actions transactionnelles via :

- `confirmMutationAction` ;
- `promptMutationAction`.

Pour ces contrats, la mutation s'exécute dans le host : la modale reste ouverte, affiche le chargement, désactive fermeture et boutons, bloque les doubles soumissions, ferme après succès et conserve saisie + erreur après échec. Les API historiques `confirmAction`, `promptAction` et `choiceAction` restent compatibles.

Les opérations migrées dans ce lot sont :

- décaissement de dépense budgétaire ;
- désactivation d'un utilisateur ;
- annulation d'affectation atelier ;
- suppression d'indisponibilité atelier ;
- modification des notes de facture ;
- renommage d'un emplacement véhicule ;
- annulation d'une livraison.

Les formulaires React déjà contrôlés, notamment la modale complète de rémunération, conservaient déjà les saisies après erreur et ont seulement reçu le verrou de fermeture manquant.

## 6. Inventaire et limite résiduelle des modales

Tous les appels du gestionnaire partagé ont été inventoriés dans Authentification, CRM, Ventes, Facturation, Livraison, Véhicules, Atelier, SAV, Pièces, Garanties, RH, Utilisateurs et Paramètres.

Les parcours multi-écrans/multi-saisies suivants utilisent encore l'API compatible historique et ferment chaque dialogue avant leur mutation finale : changement de mot de passe, décision détaillée de garantie, fin/renouvellement de contrat, report de livraison et annulation de commande fournisseur. Plusieurs saisies simples historiques (CRM, ventes, primes, absences, checklist, OR) restent également sur `promptAction`.

Statut : **audité mais non intégralement migré**. Ils ne réintroduisent aucune fenêtre native et gardent le comportement fonctionnel précédent, mais ne satisfont pas encore tous MOD-ASYNC-01 à 08. Une migration sûre exige des formulaires React dédiés à plusieurs champs plutôt qu'une chaîne de prompts génériques. Cette limite est déclarée explicitement afin de ne pas présenter une qualification globale non démontrée.

La décision de garantie conserve bien trois résultats distincts : applicable, non applicable et fermeture neutre.

## 7. Tests exécutés

- TypeScript frontend : réussi.
- TypeScript backend : réussi.
- Build Vite : réussi, 2 495 modules transformés.
- Build backend : réussi.
- Tests frontend ciblés : **9/9 réussis**.
- Tests backend REM-BUD : **3/3 réussis**.
- Suite contractuelle FIN04 ciblée : 8 tests FIN04 réussis, 1 ancien test textuel échoue car il cherche encore le message « Auto-validation interdite » dans la route alors que cette règle a été extraite antérieurement dans `remuneration-separation.ts`. Cet échec est antérieur et indépendant du présent correctif.
- MySQL 8.4 d'intégration : non exécuté, aucune écriture sur la base métier n'étant autorisée.
- Recette navigateur : non exécutée faute de session de recette autorisée.

## 8. Fichiers modifiés dans ce lot

- `backend-node/src/modules/hr/hr-remuneration.routes.ts`
- `backend-node/test/remuneration-compatible-budgets.test.ts`
- `frontend/src/modules/hr/RemunerationsAdministration.tsx`
- `frontend/src/components/ui/BusinessDialog.tsx`
- `frontend/src/modules/hr/BudgetExpenseDisbursement.tsx`
- `frontend/src/modules/users/UsersManagementPage.tsx`
- `frontend/src/modules/workshop/WorkshopPlanningPage.tsx`
- `frontend/src/modules/billing/InvoiceDetailPage.tsx`
- `frontend/src/modules/settings/VehicleLocationsSettings.tsx`
- `frontend/src/modules/deliveries/DeliveryDetailPage.tsx`
- `frontend/test/remuneration-budget-dialog.test.ts`

Les changements non commitées du lot précédent ont été préservés.

## 9. Vérifications manuelles restantes

1. Avec un rôle disposant de `hr.remuneration.engage` et `hr.expense.create` mais pas `hr.budget.view`, vérifier qu'un budget compatible apparaît.
2. Tester successivement scopes AGENCY, CONCESSION et GLOBAL, puis le refus OWN.
3. Vérifier budget clôturé, période insuffisante, devise différente et solde insuffisant.
4. Imputer une rémunération isolée et vérifier : une seule dépense brouillon, aucun mouvement Treasury, historique unique.
5. Simuler une erreur réseau pendant l'imputation et pendant un décaissement : modale ouverte, valeurs intactes, second clic impossible.
6. Recetter les parcours historiques listés comme non intégralement migrés avant de déclarer la fiabilisation globale terminée.

## 10. Verdict

- **REM-BUD-01 à 10 : corrigés statiquement et protégés côté serveur ; intégration MySQL réelle encore requise.**
- **Socle de modales asynchrones : corrigé et testé.**
- **Migration globale de tous les anciens appels : partielle, explicitement non qualifiée comme terminée.**

Aucune migration SQL, modification de données, reconstruction Docker, modification de volume, déploiement, dépendance, commit, push ou opération Git destructive n'a été effectué.
