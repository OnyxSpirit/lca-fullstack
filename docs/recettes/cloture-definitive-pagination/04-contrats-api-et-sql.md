# Contrats API et SQL

Le contrat de référence est `{ items, total, page, pageSize, totalPages }`, page 1 et taille 10 par défaut, plafond 100. `COUNT` et `SELECT` doivent partager exactement le même prédicat RBAC et les mêmes filtres, puis appliquer un tri stable avant `LIMIT/OFFSET`.

## Contrats revérifiés

- `/invoices/:id/payments`, `/refunds` et collections de crédits : pagination serveur indépendante.
- `/vehicle-interagency-transfers` : total, page et taille.
- Rapprochement bancaire : relevés, lignes, groupes et écarts paginés indépendamment.
- `/parts/:id/movements` : contrat serveur paginé (PAG-080).

## Contrats encore insuffisants

- `/leads/:id/activities` conserve un `LIMIT 200` et retourne un tableau brut.
- `/quotations/opportunity/:id` retourne une collection complète.
- `/vehicles/:id/360` embarque plusieurs historiques complets.
- Plusieurs écrans RH, Trésorerie et configuration utilisent `useClientPagination` sur des réponses complètes.

Ces points expliquent les statuts `ANOMALIE RÉSIDUELLE` de la matrice.

