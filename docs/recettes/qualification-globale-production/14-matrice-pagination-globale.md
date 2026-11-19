# Matrice de normalisation des paginations

Convention qualifiée : pagination placée sous la liste, plage visible `début–fin sur total`, tailles 10/20/50/100 (10 par défaut), accès première/précédente/pages/suivante/dernière. Le comptage serveur intervient après les contraintes RBAC et agence.

| Domaine | Surface | Mode | Filtres / tri | État vérifié |
|---|---|---|---|---|
| Pièces | Achats directs | Serveur | recherche, statut, nature, financement, tri | Conforme |
| Pièces | Ventes directes magasin | Serveur | recherche, statut, ordre stable décroissant | Conforme |
| Pièces | Catalogue / stocks | Serveur | recherche et filtres métier | Conforme |
| SAV | Facturation | Serveur (factures centrales) | recherche, statut | Conforme |
| SAV | Transit – opérations | Serveur | périmètre agence ; soldes globaux séparés | Conforme |
| SAV | Journal | Serveur | recherche, dates, type, tri | Conforme |
| Fiscalité RH | Obligations | Serveur | recherche, dates, taxe, statut, tri ; agrégats globaux séparés | Conforme |
| Comptabilité | Plan comptable | Serveur | recherche, classe | Conforme |
| Comptabilité | Écritures | Serveur | recherche, statut | Conforme |
| Comptabilité | Journaux | Serveur | recherche | Conforme |
| Comptabilité | Exercices | Client borné | hiérarchie exercice/périodes conservée | Conforme |
| Trésorerie | Journal des mouvements | Serveur | filtres métier | Conforme |
| Trésorerie | Rapprochements et écarts | Serveur | période et périmètre | Conforme |
| Paramètres | Fournisseurs | Client borné | recherche | Conforme |
| Paramètres | Ponts / postes atelier | Client borné | recherche, statut, liste/grille | Conforme |
| Paramètres | Agences | Client borné | référentiel borné | Conforme |

Les agrégats, sélecteurs de formulaire, détails d’un objet et petites listes contractuellement bornées ne sont pas traités comme des historiques paginables. Les autres référentiels signalés par l’audit global restent suivis dans la matrice d’anomalies tant que leur contrat serveur et leur recette de frontière ne sont pas tous deux qualifiés.

## Frontières couvertes

- total 0 : page 1, plage 0–0 ;
- total 1, 10, 11, 20, 21 et 101 ;
- demande de page au-delà de la dernière : correction vers la dernière page valide ;
- tailles non normalisées : retour à 10, sauf dépassement supérieur à 100 limité à 100 ;
- changement de filtre ou de taille : retour à la page 1 ;
- ordre stable complété par l’identifiant pour éviter doublons et omissions.

