# Rapport de fin de lot B.3.4.7 — Harmonisation française ciblée

Date : 18 octobre 2026  
Projet : ERP / CRM — La Congolaise de l'Automobile

## 1. Résumé exécutif

Le lot B.3.4.7 a corrigé les libellés prioritaires confirmés par l'audit sans modifier les valeurs techniques, les routes, les permissions, les filtres ni les workflows. La navigation principale, les activités et devis CRM, les essais Showroom et plusieurs abréviations financières visibles sont maintenant présentés en français.

Une table de présentation ciblée centralise les correspondances CRM et Showroom. Toute valeur inconnue reste visible sous une forme explicitement signalée, par exemple `Statut du devis non reconnu (CODE)`, afin de ne jamais la faire passer silencieusement pour un état valide.

La suite frontend complète exécutée sur l'état final passe à **896/896**. Le verdict est **VALIDÉ AVEC RÉSERVES**, la réserve portant uniquement sur l'absence de recette navigateur visuelle et responsive.

## 2. Périmètre inspecté

- Section B.3.4.7 de `docs/RAPPORT-AUDIT-FONCTIONNEL-B340.md`.
- Navigation principale et politique de navigation.
- Tableau de bord, facturation et rapport financier.
- Activités, historique et devis associés dans CRM.
- Mode d'affichage et détails des essais Showroom.
- GED et test existant du bouton « Aperçu ».
- Tests frontend de navigation, CRM, Showroom, GED, reporting, RBAC et workflows commerciaux.

Les lots B.3.4.1 et B.3.4.6 n'ont pas été commencés. Le score CRM, les étapes commerciales et leurs transitions restent inchangés.

## 3. Inventaire des libellés corrigés

| Module | Ancien texte | Nouveau texte | Justification | Impact |
|---|---|---|---|---|
| Navigation | Dashboard Général | Tableau de bord général | Remplacement explicitement demandé | Texte seulement ; route, module, icône et ordre inchangés |
| Showroom | Board | Tableau | Suppression d'un terme anglais visible | La valeur d'URL interne `board` reste inchangée |
| CRM | `activity.type` brut | Libellé métier français | Écart prioritaire confirmé par l'audit | Valeur API inchangée |
| CRM | `activity.status` brut | Libellé métier français | Écart prioritaire confirmé par l'audit | Filtres et mutations inchangés |
| CRM | `quotation.status` brut | Libellé métier français | Écart prioritaire confirmé par l'audit | Conditions sur `draft`, `sent`, etc. inchangées |
| Client 360 | `quotation.status` brut | Libellé métier français | Cohérence du même devis dans le parcours client prioritaire | Pagination et données inchangées |
| Showroom | Statut d'essai brut sauf `planned` | Libellé français pour tous les états connus | Évite `in_progress`, `completed` et `cancelled` visibles | Actions continuent de tester les codes techniques |
| Facturation | CA facturé | Chiffre d'affaires facturé | Abréviation ambiguë dans une carte disposant d'espace | Calcul inchangé |
| Tableau de bord | Évolution du CA Hebdomadaire | Évolution hebdomadaire du chiffre d'affaires | Français et typographie harmonisés | Série et données inchangées |
| Reporting | du CA net | du chiffre d'affaires net | Développement explicite | Ratio inchangé |
| Reporting SAV | CA SAV net facturé | Chiffre d'affaires SAV net facturé | Développement explicite, sigle SAV conservé | KPI inchangé |
| Reporting SAV | CA net facturé | Chiffre d'affaires net facturé | En-tête de tableau plus explicite | Colonne et valeur inchangées |

Le libellé « Score opportunité » n'a pas été renommé : la distinction avec une future progression commerciale appartient au lot B.3.4.6, explicitement hors périmètre.

## 4. Correspondances des statuts techniques

### Activités CRM

- `call` → Appel téléphonique
- `email` → E-mail
- `appointment` / `meeting` → Rendez-vous
- `visit` → Visite
- `test_drive` → Essai routier
- `note` → Note
- `planned` → Planifiée
- `pending` → En attente
- `in_progress` → En cours
- `completed` → Terminée
- `cancelled` → Annulée

### Devis CRM

- `draft` → Brouillon
- `sent` → Émis
- `negotiation` → En négociation
- `accepted` → Accepté
- `rejected` → Refusé
- `cancelled` → Annulé
- `expired` → Expiré
- `converted` → Converti en vente

### Essais Showroom

- `planned` → Planifié
- `in_progress` → En cours
- `completed` → Terminé
- `cancelled` → Annulé

Une valeur absente est présentée comme « non renseignée ». Une valeur non reconnue conserve son code entre parenthèses et est annoncée comme « non reconnue ».

## 5. Fichiers modifiés

- `frontend/src/lib/userFacingLabels.ts`
- `frontend/src/components/layout/Sidebar.tsx`
- `frontend/src/modules/crm/CrmPage.tsx`
- `frontend/src/modules/showroom/ShowroomPage.tsx`
- `frontend/src/modules/customers/CustomerDetailPage.tsx`
- `frontend/src/modules/dashboard/DashboardPage.tsx`
- `frontend/src/modules/billing/BillingPage.tsx`
- `frontend/src/modules/reports/ReportsPage.tsx`
- `frontend/test/harmonisation-fr-b347.test.ts`
- `frontend/test/sav-finance-03.test.ts`
- `docs/RAPPORT-HARMONISATION-FR-B347.md`

Aucun fichier backend, SQL, Docker ou PDF n'a été modifié.

## 6. Composants et conventions réutilisés

- La Sidebar, ses routes `ROUTES`, ses icônes et sa politique `canNavigateWithPermissions` restent en place.
- Les composants CRM et Showroom existants sont conservés.
- La fonction de présentation ajoutée est une table simple et typée ; aucune infrastructure i18n ni dépendance n'a été introduite.
- `DocumentPreview`, le bouton « Aperçu », `setPreview(d)` et les routes GED sont inchangés.
- Les composants de tableaux, cartes, badges et boutons existants restent utilisés sans changement de design.

## 7. Tests exécutés

### Campagne ciblée principale

- Navigation, CRM, Showroom, GED, dashboard et permissions : **77/77 PASS**.

### Campagne finale après harmonisation financière

- Tests B.3.4.7, GED et reporting SAV : **14/14 PASS**.

### Campagne finale Client 360

- Tests B.3.4.7, pagination Client 360, GED et reporting SAV : **26/26 PASS**.

### Non-régression complète

- Suite frontend complète sur l'état final : **896/896 PASS**.
- Échec : 0.
- Ignoré : 0.
- Durée : environ 94 secondes.

### Contrôles statiques

- `npm run lint` (`tsc --noEmit`) : **PASS**.
- `npm run build` : **PASS**, 2 507 modules transformés.
- `git diff --check` : **PASS**.

Les 890/890 du lot B.3.4.5 n'ont pas été présentés comme une nouvelle exécution ; la nouvelle suite contient six tests B.3.4.7 supplémentaires et atteint 896 tests.

## 8. Résultats détaillés

- La navigation affiche le nouveau texte tout en conservant `ROUTES.dashboard` et `module: 'dashboard'`.
- Les activités CRM utilisent exclusivement les fonctions de présentation pour le type et le statut visibles.
- Les devis continuent de gouverner les actions avec les codes `draft`, `sent` et `negotiation`.
- Le détail Showroom traduit tous les statuts d'essai connus, tandis que l'autorisation de modification continue de vérifier `planned`.
- Le mode `board` est toujours persisté dans l'URL ; seul le texte du bouton devient « Tableau ».
- Les valeurs inconnues sont couvertes par un test de non-régression.
- Les libellés financiers développés continuent d'afficher les mêmes données.
- Le bouton GED « Aperçu » et son gestionnaire existant sont explicitement couverts.

## 9. Vérification des permissions

Aucun code de permission n'a été modifié. Les campagnes ciblées couvrent notamment :

- la politique centrale de navigation ;
- les actions commerciales gouvernées par les permissions dynamiques ;
- la séparation des permissions CRM et Showroom ;
- les permissions GED et la prévisualisation ;
- les parcours de navigation multi-rôles.

Résultat : aucune régression RBAC détectée.

## 10. Vérification des contrats API

- Aucun hook API n'a été modifié.
- Aucun chemin, paramètre, payload ou query key n'a été modifié.
- Les codes de statut continuent d'être comparés et envoyés sous leur forme technique.
- Aucun événement Socket.IO n'a été modifié.
- Aucune constante persistée ni transition de workflow n'a été renommée.

## 11. Modifications locales préservées

L'état de travail a été inspecté avant modification. Aucun `reset`, `restore`, `stash`, `clean`, changement de branche, commit ou push n'a été exécuté. Les fonctionnalités des lots B.3.4.9 et B.3.4.5 restent couvertes par la suite complète, notamment « Aperçu » et la pagination Client 360.

## 12. Tests non exécutés

- Recette navigateur authentifiée : non exécutée.
- Vérification visuelle responsive réelle : non exécutée.
- Tests backend : non requis, aucun code backend n'ayant changé.
- Test MySQL : non requis, aucune donnée, migration ou requête backend n'ayant changé.

Aucun résultat navigateur n'est revendiqué.

## 13. Risques résiduels

- Les libellés financiers plus longs peuvent nécessiter une confirmation visuelle sur les plus petits écrans, bien que les cartes et tableaux concernés disposent déjà de grilles responsives ou d'un défilement horizontal.
- Des statuts bruts peuvent subsister hors des parcours prioritaires audités ; ce lot ne constitue volontairement pas une refonte linguistique exhaustive de tout l'ERP.
- Un nouveau code de statut CRM ou Showroom apparaîtra explicitement comme non reconnu jusqu'à l'ajout d'un libellé validé, ce qui est le comportement de sécurité attendu.

## 14. Verdict final

**VALIDÉ AVEC RÉSERVES.**

Les corrections ciblées sont implémentées, les contrats techniques et les permissions sont préservés, les tests ciblés et la suite frontend complète passent, et le build est valide. La seule réserve est l'absence de recette navigateur visuelle et responsive sur l'environnement local.
