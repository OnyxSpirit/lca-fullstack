# Rapport — Annulation des dépenses et KPI RH

Date : 15 octobre 2026  
Périmètre : RH & Administration / Budgets & Dépenses / Vue d'ensemble  
Statut : correction applicative terminée, migration et recette SQL réelle non exécutées

## 1. Audit de l'existant

L'annulation existait déjà via `POST /api/hr/expenses/:id/cancel`, le hook TanStack `expenseCancel` et une modale générique. Elle réutilisait toutefois `hr.expense.manage`, interdisait toute dépense approuvée et ne contrôlait que l'existence d'un décaissement. Elle ne contrôlait ni les réservations, ni le montant effectivement payé, et n'émettait ni événement temps réel ni notification persistante.

Les dépenses sont portées par `budget_expenses`. Les transitions immuables sont enregistrées dans `budget_approval_history` et l'audit centralisé. Les décaissements sont portés par `budget_expense_disbursements` et leur réalité comptable par un mouvement `treasury_movements` de source `BUDGET_EXPENSE_DISBURSEMENT`, événement `POSTED`, non contrepassé. Les réservations sont portées par `treasury_reservations`.

Le KPI RH additionnait jusqu'ici toutes les dépenses au statut `approved`. Il présentait donc un engagement comme une sortie effective, même lorsqu'aucun décaissement n'avait eu lieu.

## 2. Correction de l'annulation

Une permission dynamique dédiée `hr.expense.cancel` est préparée par la migration additive `086_hr_expense_cancel_permission.sql`. Elle n'est attribuée automatiquement à aucun rôle métier. Le backend applique cette permission et son scope via le prédicat territorial existant : AGENCY, CONCESSION ou GLOBAL. Le scope OWN demeure explicitement non applicable aux budgets, conformément à l'invariant existant.

La transaction d'annulation :

- verrouille la dépense par `SELECT ... FOR UPDATE` ;
- vérifie le périmètre avant d'exposer la ligne ;
- refuse une seconde annulation ;
- calcule le montant réellement décaissé à partir des mouvements financiers effectifs non contrepassés ;
- refuse les décaissements partiels ou totaux avec des messages distincts ;
- verrouille et refuse les réservations `SUBMITTED` et `ACTIVE` ;
- accepte un brouillon, une dépense soumise, rejetée ou approuvée non payée et sans réservation bloquante ;
- positionne `approval_status=cancelled`, `decided_by`, `decided_at` et `decision_reason` ;
- ajoute la transition dans `budget_approval_history` et l'audit centralisé ;
- ne supprime et ne modifie aucun paiement, mouvement, réservation ou montant initial de budget.

Pour une dépense soumise, le statut `cancelled` clôt la demande en attente dans le modèle existant, sans créer de workflow parallèle. Pour une dépense approuvée non payée, son exclusion immédiate des sommes au statut `approved` libère l'engagement annulable sans écriture de trésorerie.

Le bouton est visible dans les deux listes de dépenses seulement avec `hr.expense.cancel`. La modale affiche référence, libellé, montant, budget et statut. Le motif est obligatoire, reste saisi en cas d'erreur, et la confirmation est désactivée pendant la requête. Aucun dialogue natif du navigateur n'est utilisé.

## 3. KPI corrigés

La vue d'ensemble distingue désormais :

- **Engagé** : somme des dépenses encore `approved` ;
- **Décaissé** : somme des décaissements reliés à des mouvements `POSTED` non contrepassés ;
- **Reste à décaisser** : `max(0, engagé - décaissé)` ;
- **Disponible** : dotation totale active moins les engagements actifs.

La série des six derniers mois est maintenant calculée sur la date de valeur des mouvements financiers effectifs, et non sur la date des dépenses approuvées. Une réservation n'est jamais comptée comme un décaissement. Les rémunérations utilisent le même circuit dépense/décaissement : une rémunération seulement approuvée ne produit donc aucune sortie, et son paiement est compté une seule fois par le décaissement effectif associé.

Le modèle des budgets ne porte actuellement pas de devise : les montants budgétaires historiques sont exprimés dans la devise métier unique de ce module. Aucun agrégat multidevise nouveau n'a été introduit.

## 4. Temps réel et notifications

Après le COMMIT uniquement, le backend émet `hr:expense-updated` vers les agences du budget et les utilisateurs globaux. Le bootstrap Socket.IO existant invalide alors les caches RH, Trésorerie et tableau de bord, sans polling.

Une notification persistante est créée via le service existant uniquement pour les utilisateurs disposant de `hr.expense.view` dans l'agence ou la concession concernée. L'auteur de l'annulation est exclu. La clé d'événement stable `hr.expense.cancelled:<id>` évite les doublons. La notification ne contient ni montant ni détail de paiement.

## 5. Tests et résultats

| Contrôle | Résultat |
|---|---|
| Lint backend (`tsc --noEmit`) | OK |
| Build backend (`tsc`) | OK |
| Lint frontend (`tsc --noEmit`) | OK |
| Build frontend (`vite build`) | OK |
| Contrats ciblés backend annulation/KPI | OK |
| Contrats ciblés frontend modale/KPI | OK |
| `hr-treasury-corrections` | OK |
| `remuneration-compatible-budgets` | OK |
| `treasury-functional-corrections` backend et frontend | OK |
| `git diff --check` | OK |
| Archive officielle SHA-256 | OK — `7a05ce52ace2033a5beb0b1f8ff967e346f4e63c8c0fe20bf29b91b0500ea3cc` |

Les tests ciblés couvrent les contrats des cas demandés : permission et scope, verrouillages, absence de suppression, réservation active, paiement partiel/total, seconde annulation, motif, traçabilité, source financière des KPI, événement après transaction et notification limitée.

Les tests SQL d'écriture 01 à 20 n'ont pas été exécutés : aucune base MySQL isolée n'était mise à disposition dans cette mission, et toute écriture sur la base métier est interdite. Ils ne sont donc pas déclarés validés en conditions MySQL réelles. Le verrouillage `FOR UPDATE` et la relecture du statut fournissent la protection attendue contre deux demandes concurrentes, mais ce scénario reste à confirmer sur une base isolée.

Les anciens tests financiers suivants échouent sans lien avec ce changement : `treasury-flow-integration`, `treasury-foundation` et `tres-financial-workflows`. Ils recherchent principalement des fragments mono-ligne ou à quotes simples qui ne correspondent plus au formatage actuel, ainsi que l'ancien libellé « Disponible à engager ». Les assertions fonctionnelles ciblées de la présente correction passent ; aucun échec historique n'a été masqué ni modifié.

## 6. Fichiers modifiés

- `backend-node/database/migrations/086_hr_expense_cancel_permission.sql`
- `backend-node/src/modules/hr/hr.routes.ts`
- `backend-node/test/hr-expense-cancellation-kpi.test.ts`
- `frontend/src/api/hrHooks.ts`
- `frontend/src/modules/hr/HrAdministrationPage.tsx`
- `frontend/src/modules/hr/HrAnalytics.tsx`
- `frontend/test/hr-expense-cancellation-kpi.test.ts`
- `docs/RAPPORT-ANNULATION-DEPENSES-KPI-RH-LCA.md`

## 7. Mise en service contrôlée restant à autoriser

1. Sauvegarder et qualifier une base MySQL isolée dérivée d'un schéma représentatif.
2. Exécuter le gestionnaire normal de migrations jusqu'à 086 sur cette base isolée.
3. Attribuer explicitement `hr.expense.cancel` aux seuls rôles choisis, avec les scopes requis.
4. Jouer les vingt scénarios fonctionnels, financiers, territoriaux et concurrents sur cette base.
5. Vérifier les montants avant/après, l'historique, les notifications et les invalidations Socket.IO.
6. Ne mettre à jour l'environnement métier qu'après validation et autorisation explicite.

## 8. Risques résiduels et verdict

La correction est additive et ne change aucune donnée métier existante. Tant que la migration 086 n'est pas appliquée et la permission explicitement attribuée, aucun utilisateur ne pourra appeler l'annulation, ce qui est le comportement de sécurité attendu. Le risque résiduel principal est l'absence de recette MySQL réelle sur les scénarios concurrents et les combinaisons de réservations/décaissements.

**Verdict : code compilé et contrats ciblés validés ; prêt pour recette isolée, mais non qualifié pour activation sur la base métier sans migration contrôlée, attribution RBAC explicite et tests SQL autorisés.**
