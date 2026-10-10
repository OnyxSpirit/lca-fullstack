# STABILISATION-ERP-01 — Transmission ChatGPT

## 1. Contexte et résultat

Mission préparatoire du 11 octobre 2026, sans exécution métier ni modification du produit. Verdict de préparation : **PRÊT AVEC RÉSERVES**. Le dépôt est largement implémenté mais la recette générale n’est pas encore exécutée.

## 2. État initial

L’arbre contenait les modifications non committées d’AUDIT-ERP-03 et la fixture CRM antérieure, ainsi que les documents non suivis RECETTE-ERP-02/AUDIT-ERP-03. Ils ont été préservés. Les conteneurs `lca-frontend-1`, `lca-backend-1`, `lca-mysql-1` et le port 3001 n’ont pas été touchés.

## 3. Inventaire chiffré

- 24 modules backend, 23 espaces frontend, 29 routes React.
- 490 routes API déclarées.
- 151 tables/structures SQL recensées dans baseline/migrations.
- 255 permissions métier consolidées; scopes OWN/AGENCY/CONCESSION/GLOBAL.
- 120 capacités identifiées, 34 workflows, 16 profils de recette, 120 scénarios fonctionnels plus 8 E2E.
- 217 fichiers de test backend, 61 artefacts MySQL/intégration, 151 fichiers de test frontend.

## 4. Modules et intégrations

Auth, dashboard, CRM, showroom, clients, devis, véhicules, ventes, facturation, livraison, retours, SAV, atelier, garanties, pièces, fournisseurs, trésorerie, rapprochement bancaire, RH, budgets/stock interne, GED, signatures/cachets, notifications/activité, reporting et administration/settings. CRM→devis→vente→facture→Treasury→livraison constitue l’axe commercial; SAV relie client/véhicule/atelier/pièces/garantie/billing; RH/budgets/fournisseurs convergent vers Treasury.

## 5. RBAC

Seul SUPER_ADMIN est système. Quinze rôles métier supplémentaires sont proposés dynamiquement, sans création persistante. Chaque famille doit être testée en positif, négatif, OWN, AGENCY, CONCESSION, GLOBAL, utilisateur/rôle inactif et accès direct hors scope.

## 6. Environnement prévu

MySQL 8.4 jetable sans réutiliser le volume persistant; build backend courant avant bootstrap; contrôle niveau 079 et checksums; backend/frontend sur ports isolés; préfixe `REC01-`; deux concessions, quatre agences; aucune donnée réelle. Snapshot de base après référentiels/RBAC, clone séparé pour concurrence et performance.

## 7. Données et ordre

Organisation → RBAC/utilisateurs → employés → référentiels → clients/prospects → véhicules → pièces/comptes/budgets → transactions par API. Les états métier ne sont jamais forcés arbitrairement si un workflow existe.

## 8. Couverture et statut

La couverture **prévue** est 120/120 capacités (100 %), mais 0 scénario de cette nouvelle matrice est marqué VALIDÉ. Historique AUDIT-ERP-03 : backend global 178/217 fichiers, frontend 755/786 tests; ciblés ventes, lint/build et MySQL étaient verts. Les suites globales restent une réserve, pas une réussite.

## 9. Fonctionnalités insuffisamment couvertes

Matrice navigateur multi-rôles, inter-concessions, responsive complet, parcours RH/finance bout en bout, cachet hors PV livraison (non implémenté/démontré), performance générale, endurance Socket.IO, import/export à gros volume et plusieurs concurrences intermodules.

## 10. Risques et réserves

Tests textuels fragiles, suites rouges, bootstrap possible depuis dist périmé, 490 routes, dialogues natifs, essais planifiés sans scheduler, règle financière post-paiement à confirmer, signature non qualifiée, aucune mesure de performance globale. La livraison avec paiement partiel est une capacité volontaire : elle ne solde pas artificiellement la facture et doit tracer l’autorisation.

## 11. Campagnes

15 campagnes : environnement; RBAC; CRM/clients; véhicules; ventes; facturation; livraison; SAV/atelier; pièces; RH; finance; paramètres/documents; observabilité/reporting; performance/concurrence; E2E/non-régression. Première recommandation : Campagne 01 puis 02.

## 12. Critères de validation

Zéro P0/P1 ouverte; 100 % scénarios critiques exécutés; parcours A–H verts; RBAC inter-scope vert; stocks/finance/statuts rapprochés; PDF critiques visuellement contrôlés; aucun 5xx/deadlock non géré; seuils p95 acceptés; réserves métier signées.

## 13. Fichiers créés

Les onze documents `docs/STABILISATION-ERP-01-*` : CARTOGRAPHIE, WORKFLOWS, RBAC, DONNEES, MATRICE-TESTS, PARAMETRES, PERFORMANCE, FEUILLE-ROUTE, RESERVES, TRANSMISSION-CHATGPT et VERDICT-A-Z.

## 14. Vérifications et limites

Analyse statique des routes, pages, services, SQL, permissions, tests et rapports; aucune suite relancée car la mission interdit la modification/exécution métier et demande une préparation. Aucun code/test/migration/base/volume/service n’a été modifié. Le catalogue effectif doit être confirmé par la campagne 01 sur bootstrap frais.

## 15. Reprise recommandée

Créer la base jetable et le dossier de preuves, construire le backend, bootstrapper jusqu’à 079, inventorier la table `permissions`, créer uniquement dans cet environnement les 16 profils, puis exécuter REC-AUTH et REC-ADM avant tout scénario métier.
