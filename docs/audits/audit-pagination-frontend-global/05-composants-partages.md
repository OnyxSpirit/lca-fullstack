# Composants partagés

## Composants existants

| Composant/contrat | Emplacement | Usage | Observation |
|---|---|---|---|
| `ClientPagination` / `useClientPagination` | `frontend/src/components/common/ClientPagination.tsx` | RH, rémunérations, Treasury, mappings | correct pour données déjà chargées |
| `TableEmptyState` | `frontend/src/components/common/TableEmptyState.tsx` | tables principales | harmonise chargement/erreur/vide, pas la pagination |
| `PagedResult<T>` / `pageParams` | `frontend/src/api/erpHooks.ts` | principaux modules métier | bon contrat de référence |
| contrôles locaux Précédent/Suivant | nombreuses pages | serveur | duplication de markup et règles |
| `CUSTOMER_360_PAGE_SIZES` | `customers/customer360Pagination.ts` | sept collections 360 | modèle robuste multi-collection |

## Duplications

Les contrôles serveur sont réimplémentés dans Clients, CRM, Ventes, Devis, Livraisons, Factures, SAV, Showroom, GED, Notifications, Users, 2FA, Activité et Atelier. Ils diffèrent sur les tailles, le libellé du total, la gestion de page hors plage et l'accessibilité.

## Recommandation proportionnée

Créer ultérieurement un petit composant visuel `ServerPagination` sans refondre les hooks. Props proposées : `page`, `pageSize`, `total`, `totalPages`, tailles autorisées, `onPageChange`, `onPageSizeChange`, libellé et état de chargement. Il ne doit contenir aucune logique RBAC ni requête.

Conserver `ClientPagination` pour les petits référentiels, mais documenter son seuil d'emploi (par exemple maximum attendu inférieur à 200). Ne pas l'utiliser pour masquer l'absence de pagination serveur d'un journal continu.

Ajouter un helper de normalisation des réponses paginées et une convention de clé React Query incluant `userId`, `activeAgencyId`, filtres, tri, page et taille.
