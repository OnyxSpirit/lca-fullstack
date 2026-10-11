# STABILISATION-ERP-02 — Transmission ChatGPT

## Synthèse

Objectif atteint : environnement de recette isolé, construit depuis les sources actuelles, base MySQL 8.4 initialisée au niveau 079, organisation multi-agences, RBAC dynamique, comptes fictifs et contrôles réels API/UI/SQL/concurrence.

État initial préservé : `lca-frontend-1`, `lca-backend-1`, `lca-mysql-1` et le port 3001 sont restés actifs. Les modifications et fichiers non suivis préexistants n'ont pas été supprimés. Aucun commit, push, déploiement ou intervention VPS.

Documents consultés : les onze livrables STABILISATION-ERP-01, `docs/RBAC_MATRIX.md`, les rapports RBAC/recette antérieurs et le code actif. Les chiffres de départ ont été vérifiés contre le dépôt/base : le catalogue actif en contient 252, et non une hypothèse de 255.

Environnement : projet `lca-recette`; frontend 4176, backend 3004, MySQL 33321, tous liés à `127.0.0.1`; trois volumes nommés dédiés. Le bootstrap reconstruit `dist`, exécute baseline + migrations 072–079, puis démarre l'API. MySQL 8.4.11, 152 tables, 1 162 index, 525 FK.

Rôle initial : exactement `SUPER_ADMIN`. Organisation : une concession existante, quatre agences. Une seconde concession est impossible via workflow officiel, donc test inter-concessions bloqué sans contournement SQL.

RBAC : 15 rôles métier créés, 402 attributions, 15 utilisateurs fictifs, scopes OWN/AGENCY/CONCESSION et GLOBAL représentés. Les 15 logins réussissent, les 15 accès à l'administration des rôles sont refusés. Dernier Super Admin 409, rôle système 403, utilisateur désactivé 401, renommage trompeur sans élévation 403.

Tests navigateur : admin (dashboard, sidebar, utilisateurs, rôles, agences, pagination) puis RECEPTIONNISTE (menus réduits, `/users` refusé, `/customers` autorisé), sans erreur console observée. Tests API : 114 appels instrumentés plus concurrence. Tests SQL : version, migrations, structures, catalogues, comptes et 37 audits.

Performance : 114 appels, moyenne 329,22 ms, maximum 3 515,96 ms ; mémoire au repos frontend 4,664 MiB, backend 55,75 MiB, MySQL 521,5 MiB.

Anomalies : STAB02-ENV-001 corrigée et validée (réseau hôte séparé) ; STAB02-ORG-001 bloquée (seconde concession) ; STAB02-CONC-001 ouverte pour décision (last-write-wins). Code applicatif métier non modifié. Ajouts : Compose recette, deux scripts de recette, dix documents. Les données sont conservées et les conteneurs laissés actifs.

Préparation CRM : rôles COMMERCIAL/RESPONSABLE_COMMERCIAL/RECEPTIONNISTE, comptes et agences sont prêts ; commencer par créer des prospects/clients attribués à deux utilisateurs et deux agences, puis prouver OWN et AGENCY par liste, recherche et accès direct ID avant Vente/Livraison/SAV.

État final détaillé et décompte des statuts : voir `STABILISATION-ERP-02-MATRICE-EXECUTION.md` et `STABILISATION-ERP-02-VERDICT-A-Z.md`.

