# Rapport général d'audit technique intégral — ERP LCA

## 1. Présentation du projet

ERP/CRM automobile de La Congolaise de l'Automobile, réalisé par BEROX : React 19/TypeScript/Vite/TanStack Query/Socket.IO, Node.js/Express 5/JWT/Socket.IO, MySQL 8.4 et Docker/Nginx. Le RBAC dynamique porte les scopes OWN, AGENCY, CONCESSION et GLOBAL.

## 2. Objectif de l'audit

Évaluer statiquement l'intégralité du code actif, les processus métier, l'intégrité, la sécurité, le RBAC, la concurrence et la capacité potentielle, sans correction ni action sur les environnements.

## 3. Méthodologie

Inventaire des fichiers/imports/routes, revue croisée frontend/backend/SQL/infrastructure, recherche de patterns à risque, remontée des chaînes causales, comparaison avec ERP-01 à ERP-22 et classement par gravité/certitude. Les anomalies complètes sont définies une seule fois dans 02, 03 et 04.

## 4. Périmètre effectivement examiné

271 fichiers applicatifs TS/TSX (149 frontend, 122 backend), 48 SQL actifs, 34 SQL legacy séparés, 379 tests canoniques, 35 routeurs/497 endpoints, 49 événements nommés et les artefacts Docker/Nginx/MySQL. Les 24 familles de modules listées dans `01-INVENTAIRE-ET-COUVERTURE.md` ont été couvertes.

## 5. Limites de l'analyse statique

Aucun navigateur, service, test, build, base réelle, `EXPLAIN`, charge, pénétration ou observation d'infrastructure externe. Les scénarios de charge sont théoriques ; aucun temps de réponse ou seuil de capacité n'est mesuré. TLS amont et données réelles restent à confirmer.

## 6. Inventaire des modules

CRM, Client 360, véhicules VN/VO/extérieurs, ventes, facturation, trésorerie/encaissements, showroom, livraisons, retours, SAV, OR/atelier, pièces, GED, notifications, RH, reporting/dashboard, activité, administration, utilisateurs, rôles/permissions, paramètres, authentification, agences/concessions, temps réel et infrastructure. Détail dans le rapport 01.

## 7. Synthèse des anomalies

Vingt-quatre anomalies uniques sont cataloguées, triées par gravité dans les rapports 02 à 04.

## 8. Nombre d'anomalies P0

0.

## 9. Nombre d'anomalies P1

7.

## 10. Nombre d'anomalies P2

12.

## 11. Nombre d'anomalies P3

5.

## 12. Anomalies confirmées

18 confirmées par une chaîne causale dans le code.

## 13. Anomalies fortement probables

1 : AUD-LCA-011, dont l'omission SQL est certaine mais dont l'effet métier final dépend des données de budgets utilisées.

## 14. Risques potentiels

5 : AUD-LCA-007, 013, 014, 019 et 024.

| Indicateur | Valeur |
|---|---:|
| Total anomalies | 24 |
| P0 | 0 |
| P1 | 7 |
| P2 | 12 |
| P3 | 5 |
| Confirmées par analyse | 18 |
| Fortement probables | 1 |
| Risques potentiels | 5 |
| À vérifier dynamiquement classées comme telles | 0 |

La validation dynamique reste néanmoins requise pour mesurer les impacts des risques potentiels.

## 15. Régressions identifiées

**0 régression confirmée.** Les réserves historiques sont distinguées des défauts actifs ; voir rapport 11.

## 16. Problèmes de sécurité

11 anomalies comportent une dimension sécurité ou permission ; priorités AUD-LCA-001, 003, 004, 006 et 007.

## 17. Problèmes de concurrence

4 anomalies principales : AUD-LCA-003, 005, 010 et 021.

## 18. Problèmes de performance

5 risques principaux : AUD-LCA-009, 013, 014, 017 et 019.

## 19. Risques sous forte activité

Pool SQL non borné et uploads mémoire sont les facteurs dominants ; rooms périmées et courses CRM s'aggravent avec l'activité.

## 20. Problèmes d'intégrité MySQL

5 constats : AUD-LCA-001, 005, 010, 011 et 021.

## 21. Problèmes frontend

7 constats : AUD-LCA-003, 006, 015, 016, 017, 022 et 023.

## 22. Problèmes backend

Les constats backend majeurs portent sur RBAC/scopes, CRM, GED, reporting, pool et authentification ; ils sont détaillés dans le rapport 06.

## 23. Problèmes de logique métier

CRM, reporting budget, GED et scopes multi-agence concentrent les constats. Un seul problème financier est établi : l'exhaustivité du reporting AUD-LCA-011.

## 24. Matrice de couverture

La matrice détaillée fichiers/routes/services/tables/sécurité/concurrence figure dans 01. Couverture documentaire : **271/271 fichiers applicatifs actifs identifiés, 100 %**, sans prétendre à une couverture dynamique.

## 25. Liste priorisée des corrections

1. AUD-LCA-001, 003, 004 et 006 ; confirmer/lever AUD-LCA-007.
2. AUD-LCA-002 et 005.
3. AUD-LCA-008 à 014.
4. AUD-LCA-015 à 024.

Le plan détaillé est dans 12.

## 26. Risques de régression des corrections

Modèle de rôles et migration des comptes, ouverture involontaire de scopes, cycles de reconnexion Socket, deadlocks CRM, cohérence fichier/SQL GED, faux rejets liés aux timeouts et compatibilité des profils historiques. Chaque risque possède un test ciblé dans 02 à 04 et 12.

## 27. Points nécessitant une validation dynamique ultérieure

TLS effectif ; matrice multi-agence/concession ; sockets après mutation ; conflit CRM ; PDF entre sessions ; panne audit GED ; budgets concession ; plans SQL sur volumétrie ; saturation pool/uploads à 10/25/50/100 ; compatibilité des données `user_roles`.

## 28. Conclusion générale

Le socle montre une maturité réelle : transactions/verrous nombreux, session persistée, contrôles de fichiers et correctifs historiques conservés. Il n'est cependant pas qualifiable sans réserve pour livraison tant que les sept P1 ne sont pas arbitrés, particulièrement les frontières RBAC/Socket, l'annuaire, la course CRM et l'isolation PDF. Aucun P0 ni corruption financière actuelle n'a été démontré.

## Matrice de synthèse des anomalies

| ID | Module | Gravité | Certitude | Impact | Fichier principal | Statut |
|---|---|---|---|---|---|---|
| AUD-LCA-001 | RBAC | P1 | Confirmée | habilitation non déterministe | `backend-node/src/modules/rbac/rbac.service.ts` | Non corrigé |
| AUD-LCA-002 | Multi-agences | P1 | Confirmée | scopes larges bloqués | `backend-node/src/middleware/agency-scope.ts` | Non corrigé |
| AUD-LCA-003 | Temps réel | P1 | Confirmée | événements ancien périmètre | `backend-node/src/realtime/socket.ts` | Non corrigé |
| AUD-LCA-004 | Utilisateurs | P1 | Confirmée | métadonnées RBAC exposées | `backend-node/src/modules/users/user.routes.ts` | Non corrigé |
| AUD-LCA-005 | CRM | P1 | Confirmée | transition concurrente incohérente | `backend-node/src/modules/crm/crm.routes.ts` | Non corrigé |
| AUD-LCA-006 | Facturation | P1 | Confirmée | fuite inter-session PDF | `frontend/src/services/invoicePdf.ts` | Non corrigé |
| AUD-LCA-007 | Infrastructure | P1 | Risque potentiel | transport clair sans TLS amont | `deploy/nginx-host.conf.example` | Non corrigé |
| AUD-LCA-008 | CRM | P2 | Confirmée | prospect invalide | `backend-node/src/modules/crm/crm.routes.ts` | Non corrigé |
| AUD-LCA-009 | GED | P2 | Confirmée | cible autorisée absente | `backend-node/src/modules/documents/document-access.ts` | Non corrigé |
| AUD-LCA-010 | GED | P2 | Confirmée | audit non atomique | `backend-node/src/modules/documents/document.routes.ts` | Non corrigé |
| AUD-LCA-011 | Reporting | P2 | Fortement probable | budgets concession omis | `backend-node/src/modules/reports/financial-report.service.ts` | Non corrigé |
| AUD-LCA-012 | GED/Facture | P2 | Confirmée | droits contradictoires | `backend-node/src/modules/documents/document-access.ts` | Non corrigé |
| AUD-LCA-013 | MySQL | P2 | Risque potentiel | saturation/file mémoire | `backend-node/src/config/database.ts` | Non corrigé |
| AUD-LCA-014 | GED | P2 | Risque potentiel | pic mémoire upload | `backend-node/src/modules/documents/document-multipart.ts` | Non corrigé |
| AUD-LCA-015 | Auth frontend | P2 | Confirmée | page blanche au démarrage | `frontend/src/stores/authStore.ts` | Non corrigé |
| AUD-LCA-016 | Navigation | P2 | Confirmée | modal clavier dégradé | `frontend/src/components/layout/GlobalSearchModal.tsx` | Non corrigé |
| AUD-LCA-017 | Pièces | P2 | Confirmée | réception bloquée/obsolète | `frontend/src/modules/parts/SparePartsPage.tsx` | Non corrigé |
| AUD-LCA-018 | Avatars | P2 | Confirmée | contenu arbitraire public | `backend-node/src/modules/users/user-avatar.ts` | Non corrigé |
| AUD-LCA-019 | Exploitation | P2 | Risque potentiel | pool consommé par health | `backend-node/src/app.ts` | Non corrigé |
| AUD-LCA-020 | Socket | P3 | Confirmée | room `agency:null` | `backend-node/src/realtime/socket.ts` | Non corrigé |
| AUD-LCA-021 | Auth backend | P3 | Confirmée | session orpheline | `backend-node/src/modules/auth/auth.service.ts` | Non corrigé |
| AUD-LCA-022 | UI partagée | P3 | Confirmée | onglets clavier incomplets | `frontend/src/components/ui/Tabs.tsx` | Non corrigé |
| AUD-LCA-023 | Notifications | P3 | Confirmée | garde frontend incohérent | `frontend/src/App.tsx` | Non corrigé |
| AUD-LCA-024 | Docker | P3 | Risque potentiel | build non reproductible | `docker-compose.yml` | Non corrigé |

## Synthèse par module

| Module | P0 | P1 | P2 | P3 | Risques | Couverture |
|---|---:|---:|---:|---:|---|---|
| RBAC/Utilisateurs/Agences | 0 | 4 | 1 | 0 | permissions, isolation | complète statique |
| CRM/Client 360 | 0 | 1 | 1 | 0 | concurrence, invariants | complète statique |
| Vente/Véhicules/Livraison | 0 | 0 | 0 | 0 | réserves historiques | complète statique |
| Facturation/Trésorerie | 0 | 1 | 1 | 0 | session PDF, permission GED | complète statique |
| SAV/Atelier/Pièces | 0 | 0 | 1 | 0 | refresh réception | complète statique |
| GED/Fichiers | 0 | 0 | 4 | 0 | trace, recherche, mémoire, avatar | complète statique |
| Reporting/RH/Dashboard | 0 | 0 | 1 | 0 | budget concession | complète statique |
| Authentification/Temps réel | 0 | 1 | 1 | 2 | révocation, robustesse | complète statique |
| Frontend transversal | 0 | 0 | 2 | 2 | crash/accessibilité/gardes | complète statique |
| Infrastructure/MySQL | 0 | 1 | 2 | 1 | TLS, pool, reproductibilité | complète statique |

## Verdict final A–U

| Lettre | Indicateur | Résultat |
|---|---|---|
| A | Modules audités | 24 familles actives |
| B | Fichiers actifs examinés | 271 TS/TSX, plus 48 SQL actifs et configurations |
| C | Taux de couverture documenté | 100 % des TS/TSX actifs identifiés (271/271) |
| D | Total anomalies | 24 |
| E | P0 | 0 |
| F | P1 | 7 |
| G | P2 | 12 |
| H | P3 | 5 |
| I | Confirmées | 18 |
| J | Risques potentiels | 5 (plus 1 fortement probable) |
| K | Régressions confirmées | 0 |
| L | Anomalies avec dimension sécurité | 11 |
| M | Anomalies de concurrence | 4 |
| N | Risques de performance principaux | 5 |
| O | Problèmes financiers | 1, reporting seulement |
| P | Problèmes d'intégrité MySQL | 5 |
| Q | P0/P1 prioritaires | AUD-LCA-001 à 007 |
| R | Modules les plus exposés | RBAC/utilisateurs, temps réel, CRM, GED, infrastructure |
| S | Forte activité | pool non borné, uploads mémoire, rapports et rooms périmées |
| T | Limites | statique, sans navigateur/services/DB/charge/pentest |
| U | Rapport général | `docs/audit-final-erp-lca/13-RAPPORT-GENERAL-AUDIT.md` |

**Verdict : NON QUALIFIÉ EN L'ÉTAT — sept P1 à lever ; audit uniquement, aucune correction appliquée.**
