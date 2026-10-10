# CORR-ERP-02B — Tests

## Ciblés

Backend : 7 fichiers, **7 réussis**, 0 échoué, 0 ignoré, durée 2,785 s.

Frontend : 4 fichiers, **4 réussis**, 0 échoué, 0 ignoré, durée 7,084 s.

Couverture : matrice CRM-01, scopes Client 360°, agrégats/pagination, recherche ID, doublons scopés, permissions dynamiques, accessibilité statique, recherche clients.

## Compilation

- Lint backend : réussi.
- Build backend : réussi.
- Lint frontend : réussi.
- Build frontend : réussi.

## Volumétrie

La requête d'agrégats n'est pas limitée et la liste est paginée : les cas 0, 1, 200, 201 et 500 suivent le même contrat, sans chargement illimité. Les tests de structure vérifient que l'agrégat porte sur le prédicat complet. Une recette MySQL volumétrique dédiée reste recommandée.

## Suites globales

- Backend, première campagne : 210 exécutés, 168 réussis, 42 échoués, 0 ignoré, 133,687 s. L'unique échec supplémentaire était `crm-pagination-final`, dont les assertions décrivaient l'ancien contrat. Les assertions ont été adaptées au nouveau contrat sans être affaiblies ; son rerun avec le nouveau test donne 2/2 fichiers réussis. La suite globale n'a pas été relancée intégralement après cette adaptation.
- Frontend, campagne finale : 151 exécutés, 124 réussis, 27 échoués, 0 ignoré, 42,513 s. Le nouveau test et `crm-pagination-final` réussissent. Quatre fichiers de comportement (`crm-appointment`, `crm-negotiation-ui`, `crm-reassignment`, `crm-search`) échouent au niveau du processus de fichier sous la charge parallèle ; leur rerun groupé reproduit cette limite d'environnement. Les 23 échecs historiques restent présents.

La référence avant CORR-ERP-02B était backend 168/209 et frontend 127/150. Les différences de total proviennent d'un nouveau fichier de test de chaque côté ; les campagnes ne sont donc pas présentées comme strictement identiques.

## Navigateur

Non exécuté sur un bundle dont la parité avec le workspace est prouvée. Le port 3001 existant n'a pas été arrêté ni remplacé.
