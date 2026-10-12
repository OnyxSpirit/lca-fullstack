# Inventaire et couverture

## Méthode et périmètre

Audit statique en lecture seule réalisé le 12 octobre 2026 sur l'arbre courant. Les fichiers ont été inventoriés par type, rattachés aux imports/montages actifs, puis examinés par domaines frontend, backend/métier et données/sécurité. Aucun navigateur, service, test, build, requête de charge ou accès aux secrets n'a été utilisé.

| Nature | Actif examiné | Mesure documentaire |
|---|---:|---|
| Frontend TS/TSX | 149 fichiers | 11 586 lignes, 32 pages, 11 modales, 18 composants partagés, 13 couches API, 8 services, 35 routes JSX |
| Backend TypeScript | 122 fichiers | 7 186 lignes, dont 99 fichiers métier/6 401 lignes, 35 routeurs et 497 déclarations d'endpoints |
| SQL | 48 actifs | baseline, 46 migrations actives et seed ; 34 legacy et 1 fixture séparés |
| Tests | 379 canoniques | 227 backend et 152 frontend ; examinés statiquement, non relancés |
| Temps réel | 1 serveur + clients | 49 noms d'événements inventoriés, rooms utilisateur/agence/global |
| Infrastructure | 2 Compose, 2 Dockerfile | Nginx frontend/hôte, MySQL, scripts de migration et healthchecks |
| Documentation historique | ERP-01 à ERP-22 et livraison | utilisée pour différencier correction, réserve et régression |

Le dépôt contient 1 298 fichiers suivis. Les 271 fichiers applicatifs TS/TSX actifs ont été inventoriés et soumis à une revue statique ciblée : **271/271, soit 100 % de couverture documentaire du code applicatif actif identifié**. Ce taux n'est ni une couverture de branches ni une preuve dynamique.

## Distinction des catégories

- **Code actif :** `frontend/src`, `backend-node/src`, baseline/migrations/seed actifs, Docker/Nginx et scripts appelés par les images.
- **Historique non actif :** `backend-node/database/legacy-migrations` (34 fichiers), conservé pour comparaison d'upgrade mais non traité comme chemin d'installation courant.
- **Généré ou dépendances :** `dist`, `coverage`, `node_modules`, artefacts de build ; exclus de l'analyse applicative.
- **Tests :** inventoriés séparément ; ils fournissent des preuves de scénarios mais ne sont pas exécutés.
- **Documentation :** consultée comme historique, jamais comme preuve suffisante du comportement courant.

## Matrice de couverture des modules actifs

La colonne « éléments » synthétise les composants examinés ; les tables sont celles principalement rencontrées, non un dictionnaire exhaustif du schéma.

| Module | Frontend | Backend/routes/services | Tables principales | Permissions/sécurité | Concurrence/limite | Verdict |
|---|---|---|---|---|---|---|
| CRM/prospection | pages CRM, formulaires | `crm` | leads, opportunities, activities | scopes CRM | transitions/patch | AUD-LCA-005, 008 |
| Client 360 | customers, service history | `customers` | customers, vehicles, sales | scope ressource | agrégations | aucune autre anomalie démontrée |
| Véhicules VN/VO | 7 fichiers/1 436 lignes | `vehicles`, images | vehicles, external_vehicles | permissions véhicule | réservations, staging image | contrôles historiques présents |
| Ventes | formulaires/consultation | `sales` | sales, sale_items | scope agence | idempotence/transaction | aucun défaut nouveau démontré |
| Facturation | 6 fichiers | `billing` | invoices, invoice_lines | permissions facture | génération PDF | AUD-LCA-006, 012 |
| Encaissements/trésorerie | 3 fichiers | `treasury` | payments, treasury_* | scopes financiers | verrous/idempotence | contrôles historiques présents |
| Showroom/réception | 2 fichiers | `showroom` | visits/receptions | scope agence | création concurrente | aucune anomalie distincte |
| Livraison | 6 fichiers | `deliveries` | deliveries, checklists | permissions livraison | transaction/idempotence | contrôles historiques présents |
| Retours véhicule | 1 page | `vehicle-returns` | vehicle_returns | scope ressource | transitions | aucune anomalie distincte |
| SAV/service | 10 fichiers | routes workshop/service | repair_orders | permissions SAV | états et clôture | aucune anomalie distincte |
| Atelier/OR | 1 page atelier | `workshop` (11 fichiers) | work_orders, work_sessions | RBAC atelier | sessions/verrous | correctifs ERP-19 présents |
| Pièces/magasin | 5 fichiers | `parts` | parts, stocks, purchase_orders | RBAC pièces | stocks/réceptions | AUD-LCA-017 |
| GED | 4 fichiers | `documents`, 12 fichiers | documents, versions, links | politique par entité | upload/version | AUD-LCA-009, 010, 012, 014 |
| Notifications | 2 fichiers | `notifications` | notifications | `notifications.view` | Socket/cache | AUD-LCA-023 |
| RH/administration | 15 fichiers | `hr` | employees, payroll, leave | scopes RH | paie/budgets | aucune anomalie distincte |
| Reporting/dashboard | 4 fichiers | `reports`, `dashboard` | agrégations multi-tables | scopes rapports | requêtes lourdes | AUD-LCA-011, 013 |
| Administration système | settings/activity | `settings`, `activity` | settings, audit_logs | permissions admin | last-write-wins connu | réserve historique, pas de régression |
| Utilisateurs | 3 fichiers | `users` | users, user_roles | gestion et annuaire | sessions | AUD-LCA-001, 003, 004, 018 |
| Rôles/permissions | UI settings/users | `rbac` | roles, permissions, role_permissions | délégation/scopes | invalidation temps réel | AUD-LCA-001 à 003 |
| Authentification | login/store/client | `auth` | refresh_tokens | JWT/session/revocation | rotation | AUD-LCA-015, 021 |
| Agences/concessions | sélecteurs/paramètres | services de scope | agencies, concessions | AGENCY/CONCESSION/GLOBAL | multi-agence | AUD-LCA-002 |
| Temps réel | bootstrap/service | `realtime/socket.ts` | refresh_tokens/users | handshake/rooms | sockets longues | AUD-LCA-003, 020 |
| Fichiers/images | upload/avatar | GED, véhicule, avatar | documents/users/vehicles | path/MIME/signature | mémoire/staging | AUD-LCA-014, 018 |
| Infrastructure/exploitation | n/a | app/env/database | n/a | TLS/headers | pool/health | AUD-LCA-007, 013, 019, 024 |

## Routes, SQL, tests et dépendances

- Backend : 497 déclarations d'endpoints (212 GET, 168 POST, 96 PATCH, 15 DELETE, 6 PUT), toutes rattachées aux 35 routeurs actifs.
- Analyse SQL statique : environ 1 004 appels repérés, 249 usages transactionnels et 347 occurrences `FOR UPDATE`. Ces valeurs sont des comptes lexicaux, pas une preuve d'exécution.
- Les déclarations de tables/index/contraintes cumulées dans les migrations ne sont pas présentées comme le nombre du schéma final, afin de ne pas compter les recréations historiques.
- Tests pertinents observés : permissions, transactions, idempotence, concurrence ciblée, migrations/restauration, frontend composants/API. Les scénarios spécifiques de chaque anomalie sont indiqués dans les catalogues 02 à 04.

## Limites explicites

- Aucun rendu visuel, appel API réel, `EXPLAIN`, état de base, métrique CPU/RAM, test de pénétration ou charge.
- Les routes générées dynamiquement et les données réelles ne peuvent être garanties par l'analyse statique.
- Les configurations externes (TLS amont, pare-feu, secrets, supervision) n'étaient pas observables.
- Les lignes minifiées sur une seule ligne rendent certains périmètres de localisation larges, mais les chemins/fonctions cités sont ceux du code courant.
