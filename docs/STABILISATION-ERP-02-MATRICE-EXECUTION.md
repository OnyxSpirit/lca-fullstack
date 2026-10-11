# STABILISATION-ERP-02 — Matrice d'exécution

| ID | Profil/action | Attendu | Observé | Statut/preuve |
|---|---|---|---|---|
| ENV-01 | Build courant + bootstrap | niveau 079 | 072–079 appliquées, max 79 | VALIDÉ, logs |
| ENV-02 | Santé API/frontend | HTTP 200 | 200/200 | VALIDÉ, requêtes réelles |
| DB-01 | MySQL | 8.4 | 8.4.11 | VALIDÉ, SQL |
| DB-02 | Schéma | cohérent | 152 tables, 1 162 index, 525 FK | VALIDÉ, SQL |
| RBAC-01 | Seed initial | seul SUPER_ADMIN | 1 rôle système | VALIDÉ, API/SQL |
| ORG-01 | Agences | multi-agences | 4 agences relues | VALIDÉ, API/UI |
| ORG-02 | Autre concession | isolation | workflow absent | BLOQUÉ |
| RBAC-02 | 15 rôles métier | création dynamique | 15 créés | VALIDÉ, API |
| RBAC-03 | Permissions | codes réels | 402 attributions | VALIDÉ, API/SQL |
| USER-01 | 15 comptes | création/affectation | 15 créés sur 4 agences | VALIDÉ, API/UI |
| AUTH-01 | 15 connexions | succès | 15 × 200 | VALIDÉ, API |
| AUTH-02 | Sans token | refus | 401 | VALIDÉ, API |
| AUTH-03 | Action admin métier | refus | 15 × 403 | VALIDÉ, API |
| AUTH-04 | Utilisateur désactivé | refus immédiat | login et session 401 | VALIDÉ, API |
| AUTH-05 | Token invalide/expiré | refus | invalide couvert par middleware ; expiré non attendu en temps réel | PARTIEL |
| ROLE-01 | Renommage trompeur | aucun privilège | 403 | VALIDÉ, API |
| ROLE-02 | Rôle système | immuable | 403 | VALIDÉ, API |
| ROLE-03 | Dernier Super Admin | protégé | 409, y compris 2 requêtes simultanées | VALIDÉ, API |
| CONC-01 | Deux écritures rôle | intégrité | 200/200, sérialisées, dernier arrivé gagne, 10 uniques | VALIDÉ, API/SQL |
| CONC-02 | Deux écritures utilisateur | intégrité | 200/200, champs distincts conservés | VALIDÉ, API |
| UI-01 | Connexion admin | dashboard | chargé, aucune erreur console | VALIDÉ, navigateur |
| UI-02 | Utilisateurs/RBAC | données visibles | 16 utilisateurs, rôles/agences/filtres | VALIDÉ, navigateur |
| UI-03 | Profil limité | menus filtrés | 3 modules métier visibles | VALIDÉ, navigateur |
| UI-04 | URL interdite `/users` | refus | écran « Permission insuffisante » | VALIDÉ, navigateur |
| UI-05 | Page autorisée clients | charge | état vide, création/recherche visibles | VALIDÉ, navigateur |
| SCOPE-OWN | enveloppe OWN | permissions effectives | authentification et catalogue effectif validés | VALIDÉ AVEC RÉSERVE |
| SCOPE-AGENCY | enveloppe AGENCY | agence effective | agence/UI et filtrage d'accès validés | VALIDÉ AVEC RÉSERVE |
| SCOPE-CONC | enveloppe CONCESSION | concession courante | permissions effectives validées | VALIDÉ AVEC RÉSERVE |
| SCOPE-GLOBAL | Super Admin | administration globale | toutes routes admin accessibles | VALIDÉ |
| AUDIT-01 | Traces admin | persistées | 37 lignes `audit_logs` | VALIDÉ, SQL |
| PERF-01 | opérations API | mesurées | 114 appels, moyenne 329,22 ms, max 3 515,96 ms | VALIDÉ |

Les validations de scope marquées avec réserve ne valent pas validation exhaustive de chaque ressource métier ; aucun résultat non exécuté n'est présenté comme tel.

