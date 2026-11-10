# Audit global RBAC — état par domaine

État audité : 10 novembre 2026, arbre de travail non commité inclus. Les totaux couvrent **664 déclarations HTTP** : 663 dans 47 fichiers de routes et `GET /api/health` dans `app.ts`. Les 52 entrées « anomalie » désignent une absence de garde d’action directement détectable ; elles sont suspectées jusqu’à confirmation manuelle des helpers ou règles personnelles.

| Domaine | Total | Validé | Migré, preuves incomplètes | Partiel | Non migré | Hors migration | Anomalie suspectée | État et travaux restants |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| Activité/audit | 5 | 0 | 0 | 0 | 0 | 0 | 5 | Qualifier accès audit transversal, agence et confidentialité |
| Authentification/2FA | 29 | 0 | 0 | 0 | 15 | 12 | 2 | Fonctions pré-auth/personnelles à conserver ; administration 2FA encore historique |
| Facturation | 21 | 0 | 0 | 0 | 21 | 0 | 0 | Priorité critique après ventes/livraisons ; paiements et fiscalité |
| Core/PDF vente | 1 | 0 | 0 | 0 | 1 | 0 | 0 | Dériver l’agence depuis la vente/document |
| CRM | 12 | 12 | 0 | 0 | 0 | 0 | 0 | Validé par garde, ressource, transaction, Socket et recette MySQL existante |
| Clients | 10 | 0 | 9 | 1 | 0 | 0 | 0 | CRUD migré ; Client 360 reste hybride avec producteurs historiques |
| Dashboard | 2 | 0 | 0 | 0 | 2 | 0 | 0 | Migrer après producteurs et définir agrégats autorisés |
| Livraisons | 35 | 0 | 0 | 20 | 15 | 0 | 0 | Routeur principal partiel ; services/checklists historiques ; transactions non fraîches |
| Marques documentaires | 23 | 0 | 0 | 0 | 19 | 4 | 0 | Fonctions personnelles séparées ; cachets/signatures centrales ou locales à décider |
| GED/documents | 11 | 0 | 0 | 0 | 11 | 0 | 0 | Agence à dériver du parent, contrôle téléchargement et archives |
| RH/prestataires | 136 | 0 | 0 | 0 | 109 | 0 | 27 | Plus grand lot ; scopes historiques, référentiels concession, données sensibles |
| Notifications | 6 | 6 | 0 | 0 | 0 | 0 | 0 | Validé, y compris contexte historique et ciblage agence |
| Pièces/magasin | 62 | 0 | 0 | 0 | 62 | 0 | 0 | Helper historique ; transferts inter-agences et catalogues à arbitrer |
| Proformas | 6 | 0 | 6 | 0 | 0 | 0 | Implémenté ; recette MySQL/isolation encore manquante |
| Devis | 11 | 0 | 11 | 0 | 0 | 0 | Implémenté ; validation MySQL complète manquante |
| Contexte RBAC | 3 | 0 | 3 | 0 | 0 | 0 | 0 | Architecture présente ; tests session/Socket à conserver et étendre |
| Reporting | 20 | 0 | 0 | 0 | 12 | 0 | 8 | Définir consolidation autorisée, confidentialité et producteurs |
| Ventes | 10 | 0 | 10 | 0 | 0 | 0 | Implémenté et tests ciblés réussis ; recette MySQL dédiée manquante |
| Paramètres | 25 | 0 | 3 | 0 | 21 | 0 | 1 | Trois routes centrales modernes ; gouvernance locale/centrale incomplète |
| Showroom | 18 | 0 | 18 | 0 | 0 | 0 | Implémenté ; anciens tests et recette MySQL à réaligner |
| Trésorerie/comptabilité | 52 | 0 | 0 | 0 | 52 | 0 | 0 | Critique ; comptes concession/agence, séparation des tâches et mouvements |
| Utilisateurs/admin | 27 | 0 | 13 | 8 | 0 | 5 | 1 | Administration multi-agences partielle ; annuaire/identité hérités |
| Retours véhicules | 17 | 0 | 0 | 0 | 17 | 0 | 0 | Chaîne vente/avoir/remboursement historique à migrer atomiquement |
| Véhicules/stock | 33 | 0 | 22 | 0 | 6 | 0 | 5 | Stock principal implémenté ; catalogues/référentiels et routes auxiliaires ouvertes |
| Atelier/SAV | 88 | 0 | 0 | 0 | 85 | 0 | 3 | Helpers historiques, OR, garanties, pièces et facturation fortement couplés |
| Application/santé | 1 | 0 | 0 | 0 | 0 | 1 | 0 | Public minimal, hors scope métier |
| **Total** | **664** | **18** | **95** | **29** | **448** | **22** | **52** | Réconcilié avec l’inventaire exhaustif |

## Dépendances structurantes

1. Finaliser Livraisons avant Facturation et encaissements.
2. Migrer Pièces avant la clôture Atelier/SAV.
3. Migrer RH/prestataires avant dépenses, rémunérations et reporting personnel.
4. Stabiliser tous les producteurs avant Dashboard, Client 360 et Reporting.
5. Traiter GED et marques documentaires par dérivation depuis leur ressource parente.

## Domaines supplémentaires découverts

L’inventaire distingue aussi les retours véhicules, les autorisations financières de livraison, les services additionnels de livraison, les marques documentaires, les achats directs de pièces, la logistique interne, les rapprochements bancaires et les opérations SAV financières. Ils sont intégrés aux domaines ci-dessus et non omis comme sous-systèmes techniques.
