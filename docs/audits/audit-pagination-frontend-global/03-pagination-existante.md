# Analyse de la pagination existante

## Pagination serveur correctement raccordée

Le contrat partagé `PagedResult<T>` dans `frontend/src/api/erpHooks.ts` expose `items`, `total`, `page`, `pageSize`, `totalPages`. Il est correctement exploité par Clients, CRM Liste, Véhicules, Ventes, Devis, Proformas, Livraisons, Factures, SAV, Pièces, Showroom et historique Atelier. Les clés React Query incluent filtres, page et taille ; les mutations invalident les familles de clés.

Autres contrats solides : Activité (`rows` + `pagination`), Notifications, GED, Utilisateurs, 2FA, personnel unifié, congés/primes, dépenses RH, journal Treasury, vues comptables avancées et activités du dashboard financier.

## Pagination cliente

`frontend/src/components/common/ClientPagination.tsx` fournit deux variantes : composant render-prop et hook. Il découpe avec `slice`, propose 10/25/50, recale la page lorsque la collection change et remet à 1 lors du changement de taille. Utilisateurs principaux : RH, Rémunérations, Budget Treasury, mappings Treasury et plusieurs tableaux de `TreasuryPage.tsx`.

Cette solution est fonctionnelle mais ne réduit ni le transfert réseau ni le temps de filtrage. Elle convient aux petits référentiels, pas aux mouvements, dépenses ou historiques continus.

## Paginations partielles

- Kanban CRM : chaque colonne appelle une vraie API paginée, mais uniquement `page=1`; aucune action ne charge la suite.
- Comptabilité : écritures `pageSize=50` et journaux `pageSize=100` sans état de page complet ; comptes retournent `items/total` mais la navigation n'est pas systématique.
- Factures fournisseur : le hook passe des filtres mais type la réponse comme tableau, empêchant l'usage fiable des métadonnées.
- SAV caisse : pagination des factures mais balances/transferts/items secondaires non paginés dans le même écran.

## Recherche, filtres et tri

Les écrans serveur principaux réinitialisent la page à 1 lors d'un changement de recherche, filtre, taille ou tri. Les tris de Ventes, Devis, Véhicules et Showroom sont transmis au serveur avec ordre stable prévu par les tests historiques. Les listes client-paginées filtrent uniquement le jeu déjà téléchargé ; ce comportement doit être indiqué et ne convient pas à un volume important.

## Actualisation et changement d'agence

La page courante est généralement un `useState`, donc non conservée après F5. Le changement d'agence invalide les données via les clés contextualisées, mais les composants locaux ne partagent pas une convention unique de remise à page 1. Les écrans principaux le font indirectement par remontage/contexte ; un test explicite doit être ajouté lors de la correction globale.

## Vérification dynamique

Cette mission étant un audit, aucun test dynamique ni mutation n'a été lancé. Les comportements ci-dessus sont **vérifiés dans le code et les tests existants**, pas rejoués manuellement dans un navigateur pendant cet audit.
