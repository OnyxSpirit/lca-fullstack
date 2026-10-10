# CORR-ERP-02B — Changements

## Backend CRM

Fichier : `backend-node/src/modules/crm/crm.routes.ts`.

- La réponse paginée `/leads` comporte `stageSummary`, calculé par `GROUP BY o.stage` sur le même prédicat de recherche, filtres et scope que les lignes.
- Le total est dérivé de l'ensemble des groupes ; les pages utilisent le helper de pagination existant.
- La recherche inclut `CAST(l.id AS CHAR) LIKE ?`. Aucun identifiant hors scope n'est visible puisque le scope SQL précède ce terme.
- `/leads/duplicates` normalise l'e-mail et les chiffres du téléphone, recherche seulement les prospects visibles et limite la réponse à dix correspondances.
- La création reste autorisée : aucune fusion, suppression ou contrainte unique nouvelle.

## Frontend CRM

Fichiers : `frontend/src/api/erpHooks.ts`, `frontend/src/modules/crm/CrmPage.tsx`, `frontend/src/modules/crm/NewLeadModal.tsx`.

- Kanban et liste utilisent désormais le contrat paginé.
- Le Kanban affiche 50 prospects par page, avec navigation explicite, tandis que compteurs et budgets proviennent des agrégats globaux filtrés.
- Le formulaire vérifie les doublons avant la première confirmation ; une seconde action « Créer quand même » préserve le comportement non bloquant.
- Toute modification du téléphone ou de l'e-mail invalide la confirmation précédente.

## Accessibilité

Fichiers : `CrmPage.tsx`, `CustomersListPage.tsx`, `CustomerDetailPage.tsx`.

Les cartes CRM et lignes de tableaux auditées reçoivent rôle accessible, ordre de tabulation, nom accessible, activation Entrée/Espace et anneau de focus. Les boutons d'action existants restent séparés ; aucun bouton n'est imbriqué.

## Tests ajoutés

- `backend-node/test/crm-functional-reliability.test.ts`
- `frontend/test/crm-functional-reliability.test.ts`
