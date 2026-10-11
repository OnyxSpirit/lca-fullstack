# STABILISATION-ERP-02 — Tests exécutés

## Automatisation API

`scripts/stabilisation-erp-02-provision.mjs` est idempotent sur les créations : inventaire du catalogue, 4 agences, 15 rôles, 15 utilisateurs, 15 connexions, refus admin, protection du rôle système/dernier administrateur, renommage sans élévation et révocation de session.

`scripts/stabilisation-erp-02-concurrency.mjs` teste deux mises à jour simultanées du rôle DIRECTION, deux mises à jour simultanées du TECHNICIEN et deux tentatives simultanées de désactivation du dernier Super Admin ; les valeurs de recette sont restaurées ensuite.

## MySQL/Docker

Requêtes réelles dans MySQL 8.4.11 : niveau 079, tables, index, FK, permissions, rôles, attributions, utilisateurs, agences, concession et audit. Journaux backend inspectés. `docker ps` et `docker stats --no-stream` collectés. Les conteneurs existants sont restés sains et le port 3001 n'a pas été interrompu.

## Navigateur réel

Frontend `http://127.0.0.1:4176` : login admin, dashboard/sidebar, page Utilisateurs & RBAC, filtres agences/rôles, pagination, logout/changement de compte, login RECEPTIONNISTE, menus restreints, refus direct `/users`, page Clients autorisée et état vide. Aucune erreur/warning console capturée pendant ces parcours.

## Limites

Non exécutés : expiration temporelle réelle d'un JWT, seconde concession, suppression métier, exports, CRUD de chaque module, Web Vitals, charge et tous les 120 scénarios de la cartographie. Socket.IO n'a pas fait l'objet d'un scénario événementiel dédié ; aucun échec de transport n'a été observé dans le parcours UI.

