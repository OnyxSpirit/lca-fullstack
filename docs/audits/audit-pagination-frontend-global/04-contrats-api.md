# Contrats API et capacités de pagination

## Contrats paginés exploités

| Domaine | Endpoint | Paramètres observés | Métadonnées | Frontend |
|---|---|---|---|---|
| Clients | `/customers` | page, pageSize, search, type, classification | `PagedResult` | raccordé |
| CRM | `/leads` | page, pageSize, stage, priority, search, commercialId | total, totalPages, stageSummary | liste raccordée, Kanban partiel |
| Véhicules | `/vehicles` | page, pageSize, filtres, sort | total/pages + stats séparées | raccordé |
| Ventes/Devis/Proformas | `/sales`, `/quotations`, `/proformas` | page, pageSize, filtres, tri | `PagedResult` | raccordé |
| Livraisons | `/deliveries` | page, pageSize, statut/recherche | `PagedResult` | raccordé |
| Factures | `/invoices` | page, pageSize, recherche/statut/agence | `PagedResult` + summary | raccordé |
| SAV | `/repair-orders` | page, pageSize, recherche/statut | `PagedResult` | raccordé |
| Pièces | `/parts`, `/purchase-orders` | page, pageSize, agence/filtres | `PagedResult` | raccordé |
| Showroom | `/showroom` | page, pageSize, dates/recherche/tri | items, total, counts, metrics | raccordé |
| Atelier | `/workshop/interventions/history` | page, pageSize | `PagedResult` | raccordé |
| GED/Notifications/Activité/Users/2FA | endpoints dédiés | page, pageSize, filtres | total/pages | raccordé |
| Finance dashboard | `/reports/financial-dashboard/activities` | page, pageSize=20, search, source | total | raccordé |

## Endpoints complets à adapter

Les hooks montrent des réponses tableau sans métadonnées pour `/invoices/:id/payments`, `/refunds`, `/leads/:id/activities`, `/quotations/opportunity/:id`, `/deliveries/candidates`, `/documents/entity/:type/:id`, plusieurs endpoints RH d'un salarié/prestataire, achats directs/ventes Pièces, historiques véhicule, transferts interagences, endpoints avancés comptables et endpoints de rapprochement bancaire.

Adaptation recommandée : accepter `page`, `pageSize`, recherche/tri pertinents ; renvoyer `{items,total,page,pageSize,totalPages}`. Taille par défaut 20, maximum 100, sauf référentiels. Les exports doivent rester exhaustifs via un endpoint d'export distinct et ne pas réutiliser seulement la page affichée.

## Limites arbitraires ou contrats ambigus

- `useEntries` force `pageSize=50` ; `useJournals` force `pageSize=100` sans transmettre une page.
- `useSupplierInvoicesQuery` déclare `any[]` alors que la famille doit converger vers un contrat paginé.
- Les hooks legacy `useCustomersQuery`, `useSalesQuery`, `useRepairOrdersQuery`, `usePartsQuery`, `useVehiclesQuery` retournent des tableaux complets et sont encore utilisés par des sélecteurs/modales.

## Filtres, tri, RBAC et agence

La pagination doit être appliquée **après** les prédicats `OWN`/`AGENCY`, la recherche et les filtres, et **avant** le chargement des lignes larges. Le `COUNT` doit réutiliser exactement le même prédicat et ne jamais révéler un total hors périmètre. Tout tri doit utiliser une liste blanche et un second critère stable (`id`). Le changement d'agence doit produire une nouvelle clé de cache et remettre la page à 1.

## Backend nécessaire

Une adaptation backend est nécessaire pour 35 à 40 des 75 anomalies, principalement les journaux financiers, historiques RH/SAV/Véhicules, rapprochement bancaire, rapports détaillés et listes de sélection legacy. Les autres corrections sont un raccordement frontend à une API déjà paginée ou une pagination cliente acceptable.
