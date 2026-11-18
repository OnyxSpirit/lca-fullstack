# Plan de correction recommandé

Ce plan est une recommandation d'audit ; aucune correction n'a été appliquée.

## Lot 1 — résultats actuellement inaccessibles

1. Kanban CRM : cursor/page par colonne et bouton « Charger plus » ; conserver les agrégats serveur.
2. Comptabilité : raccorder page/taille/total sur écritures, comptes et journaux ; supprimer les limites fixes invisibles.
3. Factures fournisseur : normaliser le contrat `PagedResult`.
4. Vérifier par tests que filtres, recherche et RBAC précèdent le `COUNT`.

## Lot 2 — journaux financiers et opérationnels

Paginer côté serveur paiements/remboursements, mouvements RH, fonds, achats/ventes Pièces, transferts SAV/Véhicules, rapprochement bancaire et historiques comptables. Taille 20 ou 25 ; maximum 100. Exports séparés et exhaustifs.

## Lot 3 — fiches 360 et historiques

Ajouter des pages indépendantes aux activités CRM, contrats/congés/primes/documents RH, contrats prestataires, historiques OR et véhicule. Réutiliser le modèle multi-page Client 360. Les lignes d'un document restent exemptées.

## Lot 4 — sélecteurs et recherches

Remplacer les hooks legacy complets dans les modales par des recherches serveur temporisées, top 20, avec chargement suivant : clients/ventes de facture, candidats livraison, véhicules Showroom, fournisseurs et catalogues volumineux.

## Lot 5 — cohérence UI

Introduire le composant visuel `ServerPagination`, harmoniser 10/20/50 ou tailles métier existantes, états chargement/vide/erreur, focus clavier, libellés et page dans l'URL pour les pages principales. Conserver `ClientPagination` pour les petits référentiels.

## Ordre et validation

- Une migration de schéma n'est a priori pas nécessaire.
- Chaque lot doit inclure tests API, hooks et composants, ainsi qu'une recette OWN/AGENCY multi-agences.
- Ne jamais modifier simultanément pagination et règles métier d'un workflow financier.
- Mesurer taille JSON et durée SQL avant/après sur 10 000 lignes fictives.
