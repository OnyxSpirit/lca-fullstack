# ERP-17 — Préparation de la mise à jour Docker de recette

Date d'inventaire : 2026-10-11. Cette phase est documentaire. Aucune commande de build, `up`, restart, stop, suppression, seed, migration ou écriture dans un volume n'a été exécutée.

## 1. Objectif

Préparer l'intégration des corrections ERP-17 dans les seuls services `frontend` et `backend` du projet `lca-recette`, en conservant MySQL, les volumes, les ports, les réseaux et l'environnement historique. L'audit de levée de blocage conclut que la mise à jour ciblée est techniquement sûre sous les conditions de contrôle décrites ci-dessous.

## 2. État initial

- Dépôt : `/home/silva/Documents/Codex/2026-08-31/ch/outputs/lca-fullstack`.
- Branche : `main`.
- HEAD observé : `4fa8cdf7b2eee56c483e5887975c2d0c82f97de6` (`STABILISATION-ERP-17`), identique à `origin/main`.
- `git status --short` : vide ; `git diff --check` : réussi.
- Le contexte fourni annonçait des changements non commitées sur `b102417`, mais l'état observé au début de la phase 3 est déjà commité et publié. Aucun commit ni push n'a été effectué pendant cette phase.
- Les trois conteneurs recette sont sains. Les conteneurs historiques sont également sains, mais leurs IDs frontend/backend diffèrent de ceux relevés en fin de phase 2 ; cette phase 3 ne les a ni reconstruits ni redémarrés.

## 3. Projet Compose

Projet attendu et confirmé pour les trois services recette : `lca-recette`.

Services réels :

| Service Compose | Conteneur | État |
|---|---|---|
| `frontend` | `lca-recette-frontend-1` | healthy |
| `backend` | `lca-recette-backend-1` | healthy |
| `mysql` | `lca-recette-mysql-1` | healthy |
| `seed-admin` | aucun, profil `tools` | inactif |

## 4. Chemin Compose exact et origine de la dérive

Fichier recette attendu :

`/home/silva/Documents/Codex/2026-08-31/ch/outputs/lca-fullstack/docker-compose.recette.yml`

Empreinte SHA-256 : `e8cd0174c3bcac284274fb97baa76dd446dbfed69c42baea889b35a10d471972`.

Fichier d'environnement attendu :

`/home/silva/Documents/Codex/2026-08-31/ch/outputs/lca-fullstack/.env.recette`

Empreinte SHA-256 : `289c89872d142122fca0c5ebb522d6b80a297613721266346ba0e8a41d346572`.

**Cause technique prouvée :** `lca-recette-mysql-1` a été créé ou remplacé par une invocation Compose utilisant, dans cet ordre, `docker-compose.yml` puis `docker-compose.recette.yml`. Son hash `f354c97d…` est exactement celui du service `mysql` produit par cette fusion. Les conteneurs backend et frontend ont ensuite été créés ou remplacés avec le seul `docker-compose.recette.yml` et leurs hashes correspondent exactement au modèle recette seul. Les labels prouvent les jeux de fichiers utilisés ; ils ne permettent pas d'identifier l'opérateur ou la commande historique complète.

La fusion explique les deux bind mounts d'initialisation et le réseau `lca-recette_private` supplémentaires sur MySQL. Elle ne remplace pas le volume recette et n'empêche pas l'isolation ciblée : MySQL est également connecté aux deux réseaux attendus par le Compose recette.

### Comparaison des labels

| Service | `project` | `service` | `config-hash` courant | Hash Compose recette seul | `project.config_files` |
|---|---|---|---|---|---|
| frontend | `lca-recette` | `frontend` | `21ff846ca7e3…` | `21ff846ca7e3…` | `docker-compose.recette.yml` |
| backend | `lca-recette` | `backend` | `35e6d1c17d28…` | `35e6d1c17d28…` | `docker-compose.recette.yml` |
| mysql | `lca-recette` | `mysql` | `f354c97df3d4…` | `b15ccee6afde…` | `docker-compose.yml,docker-compose.recette.yml` |

Le hash MySQL courant `f354c97df3d4…` correspond au hash statique du Compose fusionné. Les hashes fusionnés de backend/frontend (`161d7d2f…` et `bba6e7cd…`) ne correspondent pas à leurs conteneurs actuels, confirmant qu'ils ne dépendent pas de ce modèle fusionné.

## 5. Services et dépendances

### Frontend

- Build context : `/home/silva/Documents/Codex/2026-08-31/ch/outputs/lca-fullstack/frontend`.
- Dockerfile : `frontend/Dockerfile`, SHA-256 `b8092eddac0f5251e42ed5b46eb6567d7eade6f06f469fd90185be0a04b7b1a5`.
- `.dockerignore` : SHA-256 `9843b115871606a69bf53d630f344e45a2106cf18fa0fb725e30fa1c8c8d57de` ; exclut `node_modules`, `dist`, `.env*` sauf exemple, coverage et logs.
- Dépendances : `frontend/package-lock.json`, SHA-256 `52295db0943793e708554db1255292ed66a3042e2848eb4f2035aef08e233734`.
- Build multi-stage Node 22 puis Nginx 1.27 ; argument `VITE_API_URL=/api`.
- Dépend de `backend` sain, sans volume.

### Backend

- Build context : `/home/silva/Documents/Codex/2026-08-31/ch/outputs/lca-fullstack/backend-node`.
- Dockerfile : `backend-node/Dockerfile`, SHA-256 `f98af4db639bcd1932550c797e685bd34de6287c0089cb9890b12812263d398c`.
- `.dockerignore` : SHA-256 `d2dbcee987a7ecb1ab51737fba581a56461165bb7f835ae1d35289092781b468` ; exclut tests, environnements, `node_modules`, `dist`, uploads, GED et logs.
- Dépendances : `backend-node/package-lock.json`, SHA-256 `8ccc73bb7e18c122b1ec8609693405d57267ff2158d3e580c807b88ac7d1c834`.
- Build multi-stage Node 22 ; runtime non-root `node`.
- Dépend de `mysql` sain.
- Commande de démarrage : `node dist/scripts/database-bootstrap.js && node dist/server.js`. Le bootstrap peut appliquer le baseline/system seed sur une base détectée vide et contrôle les migrations connues : ce comportement doit être pris en compte même si aucun fichier de migration ERP-17 n'a changé.

### MySQL

- Image uniquement : `mysql:8.4` ; aucun rebuild requis.
- Ne doit pas être ciblé ni recréé par ERP-17.

## 6. Conteneurs et images actuels

| Conteneur | ID | Image / ID image | Création image |
|---|---|---|---|
| `lca-recette-frontend-1` | `3825fe4f6c82d28c1c43e9096712c75c33076e064fbc8791e89ad8cfb1f6bd19` | `lca-recette-frontend:latest` / `sha256:10437171bfe2ac7160327dbead0e4c5931f42b8c4e3bd234d2f6d24be19fd389` | 2026-10-11 11:23:12 +01 |
| `lca-recette-backend-1` | `f95ed37f5408b4af94e55471c6523079e49be5a6850e0455717ef5407da32ff0` | `lca-recette-backend:latest` / `sha256:b6a770eb0090fbf7d69a97df1c77fbad00799044ce2aa6413a4926b2ee349982` | 2026-10-11 18:11:33 +01 |
| `lca-recette-mysql-1` | `5e7de0bab86f85dc17b8349c4e5dc91355902c9f7a5ef127845cd78b4966aa09` | `mysql:8.4` / `sha256:b3b90af2a6552ae30c266fdb7d5dd55f3afb72404bb78d37fe8a23eb857fd3fb` | 2026-07-27 |

Les images à reconstruire sont uniquement `lca-recette-frontend` et `lca-recette-backend`. Aucun changement de dépendance ou lockfile n'est introduit entre `b102417` et `4fa8cdf`.

## 7. Ports

- Frontend recette : `127.0.0.1:4176 -> 80/tcp`.
- Backend recette : `127.0.0.1:3004 -> 3001/tcp`.
- MySQL recette : `127.0.0.1:33321 -> 3306/tcp`.
- Frontend historique : `0.0.0.0:3001 -> 80/tcp`, à ne pas toucher.

## 8. Volumes et bind mounts

Volumes recette, tous étiquetés projet `lca-recette` et distincts des volumes `lca_*` historiques :

| Volume | Destination | Écriture |
|---|---|---|
| `lca_recette_mysql_data` | MySQL `/var/lib/mysql` | oui |
| `lca_recette_ged_data` | backend `/app/ged-storage` | oui |
| `lca_recette_uploads_data` | backend `/app/uploads` | oui |

Bind mounts recette attendus : `deploy/mysql.cnf` en lecture seule et `backend-node/database` en lecture seule sur le backend. Dérive MySQL constatée : deux binds supplémentaires, `baseline/001_initial_schema.sql` et `seeds/001_system_seed.sql`, vers `/docker-entrypoint-initdb.d`, tous deux en lecture seule. Aucun volume historique n'est monté dans un service recette.

## 9. Réseaux

Réseaux recette attendus :

- `lca-recette_recette_private`, bridge interne ;
- `lca-recette_recette_host`, bridge non interne.

Frontend et backend utilisent ces deux réseaux. MySQL les utilise aussi, mais reste en plus attaché à `lca-recette_private`, réseau interne créé par la configuration fusionnée. Les réseaux historiques `lca_private` et `lca_public` sont distincts.

Les alias réseau actuels sont `backend` pour le backend et `mysql` pour MySQL sur `lca-recette_recette_private` et `lca-recette_recette_host`. `DB_HOST=mysql` reste donc résolvable après recréation du backend avec le Compose recette seul. Les deux adresses possibles pointent vers le même conteneur MySQL. Le réseau supplémentaire de MySQL n'est ni requis ni modifié par la mise à jour ciblée.

## 10. Corrections à intégrer

| Correction | Sources | Service | Rebuild/recréation ciblée |
|---|---|---|---|
| Gardes permissions réservation/consommation Pièces | `frontend/src/modules/service/RepairOrderDetailPage.tsx` | frontend | oui/oui |
| Contexte Garantie et formulaire Nouvel OR | `frontend/src/modules/service/NewRepairOrderModal.tsx` | frontend | oui/oui |
| Plafond kilométrique PDF | `backend-node/src/modules/documents/warranty-document-renderer.ts` | backend | oui/oui |
| Projection TTC facture atelier | `backend-node/src/modules/documents/commercial-document.ts`, `invoice-document-lines.ts` | backend | oui/oui |
| Tests historiques, GED/PDF | `backend-node/test/*`, `frontend/test/*` | aucun runtime (`test` backend exclu par `.dockerignore`) | non |
| Documentation et script de lecture | `docs/*`, `scripts/stabilisation-erp-17-readonly.mjs` | aucun | non |

Aucun Dockerfile, Compose, fichier d'environnement, migration, baseline, seed ou lockfile n'est modifié par ERP-17.

## 11. Services à reconstruire

Uniquement `backend` et `frontend`. `mysql` et `seed-admin` sont exclus. Le lancement futur doit utiliser `--no-deps` afin que MySQL ne fasse pas partie du plan d'application. La dérive MySQL peut rester en place pour cette mise à jour applicative : le conteneur partage déjà les réseaux recette et conserve le bon volume. Sa normalisation éventuelle constitue une opération séparée, non nécessaire à ERP-17 et non autorisée ici.

Analyse des dépendances : le modèle recette déclare backend → MySQL sain et frontend → backend sain. `--no-deps` empêche Compose de créer ou recréer les dépendances non explicitement ciblées. La procédure séquence backend puis frontend, au lieu de les appliquer ensemble, afin de vérifier le healthcheck backend avant de remplacer le frontend. Le bootstrap DB du backend reste le seul effet indirect potentiel sur MySQL ; aucune migration, baseline ou seed n'a changé dans ERP-17.

## 12. Risques et mesures préventives

| Risque | Probabilité | Impact | Prévention | Contrôle après |
|---|---|---|---|---|
| Mauvais projet/Compose | moyenne, dérive prouvée | critique | `-p lca-recette`, `-f` et `--env-file` absolus ; contrôle labels préalable | labels projet/service/config |
| Recréation MySQL recette | faible avec `--no-deps`, critique sinon | critique | cibler `backend frontend`, `--no-deps`, comparer ID MySQL avant/après | ID MySQL inchangé |
| Impact historique | faible | critique | capturer les trois IDs historiques ; ne jamais citer leurs services | IDs, ports et health inchangés |
| Perte MySQL/GED/uploads | faible | critique | sauvegardes cohérentes avant opération ; volumes jamais supprimés | volumes/compteurs/empreintes |
| Bootstrap/migrations au restart backend | moyenne | élevée | vérifier HEAD et absence de migrations modifiées ; dump préalable | logs bootstrap et tables de migration |
| Seed/admin ou rotation secret | faible | élevée | ne pas activer profil `tools`, ne pas modifier `.env.recette` | hash du fichier env ; audit auth |
| Secrets JWT changés | faible | élevée | empreinte `.env.recette` avant/après, aucune édition | sessions/auth et hash identique |
| Ports/réseaux changés | faible | élevée | Compose absolu unique ; `--no-deps` | `docker ps`, inspect réseaux/ports |
| Interruption recette | certaine quelques secondes lors de la recréation ciblée | moyenne | fenêtre de maintenance, frontend après backend sain | health et parcours login |
| PDF/GED incompatibles | faible | élevée | préserver volumes, test de génération sur nouvelle ressource uniquement | ancien document lisible, nouveau correct |
| Retour arrière écrasant des données | moyenne si restauration aveugle | critique | rollback image sans restaurer MySQL/GED/uploads par défaut | données créées après update conservées |

## 13. Mesures préventives et conditions préalables

Avant toute autorisation, il faut :

1. Confirmer que la commande future utilisera uniquement `docker-compose.recette.yml` et que MySQL restera volontairement intact via `--no-deps`.
2. Capturer à nouveau les six IDs, les trois IDs image recette, les ports, les réseaux et les empreintes de configuration.
3. Vérifier que les hashes statiques frontend/backend sont toujours `21ff846c…` et `35e6d1c…` avant build.
4. Vérifier que MySQL porte toujours l'ID `5e7de0bab86f…`, le volume `lca_recette_mysql_data` et l'alias `mysql` sur `lca-recette_recette_private`.
5. Expliquer le commit/push `4fa8cdf` déjà présent malgré l'état non commité attendu.
6. Obtenir et vérifier les trois sauvegardes décrites ci-dessous.

## 14. Commandes futures exactes — NE PAS EXÉCUTER

Répertoire d'exécution pour toutes les commandes :

`/home/silva/Documents/Codex/2026-08-31/ch/outputs/lca-fullstack`

Après levée explicite du blocage seulement :

```bash
docker compose -p lca-recette -f /home/silva/Documents/Codex/2026-08-31/ch/outputs/lca-fullstack/docker-compose.recette.yml --env-file /home/silva/Documents/Codex/2026-08-31/ch/outputs/lca-fullstack/.env.recette build backend frontend
docker compose -p lca-recette -f /home/silva/Documents/Codex/2026-08-31/ch/outputs/lca-fullstack/docker-compose.recette.yml --env-file /home/silva/Documents/Codex/2026-08-31/ch/outputs/lca-fullstack/.env.recette up -d --no-deps backend
docker compose -p lca-recette -f /home/silva/Documents/Codex/2026-08-31/ch/outputs/lca-fullstack/docker-compose.recette.yml --env-file /home/silva/Documents/Codex/2026-08-31/ch/outputs/lca-fullstack/.env.recette up -d --no-deps frontend
```

Effets attendus : nouvelles images backend/frontend, recréation exclusive de leurs deux conteneurs, réutilisation des volumes GED/uploads, conservation du conteneur MySQL et de tous les ports. Risque résiduel : le backend exécute `database-bootstrap.js` au démarrage. Les commandes n'activent pas le profil `tools` et ne ciblent jamais `mysql`.

## 15. Sauvegarde préalable — commandes futures exactes

Ces commandes écrivent uniquement dans le répertoire de sauvegarde hôte et créent deux conteneurs auxiliaires éphémères en lecture seule sur les volumes. Elles ne doivent être exécutées qu'après approbation :

```bash
mkdir -p /home/silva/Documents/Codex/2026-08-31/ch/outputs/lca-fullstack/backups/erp17-pre-update-20261011
docker exec lca-recette-mysql-1 sh -c 'exec mysqldump --single-transaction --routines --triggers --events -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"' > /home/silva/Documents/Codex/2026-08-31/ch/outputs/lca-fullstack/backups/erp17-pre-update-20261011/mysql.sql
docker run --rm --read-only --mount type=volume,src=lca_recette_ged_data,dst=/source,readonly --mount type=bind,src=/home/silva/Documents/Codex/2026-08-31/ch/outputs/lca-fullstack/backups/erp17-pre-update-20261011,dst=/backup alpine:3.20 tar -C /source -czf /backup/ged.tar.gz .
docker run --rm --read-only --mount type=volume,src=lca_recette_uploads_data,dst=/source,readonly --mount type=bind,src=/home/silva/Documents/Codex/2026-08-31/ch/outputs/lca-fullstack/backups/erp17-pre-update-20261011,dst=/backup alpine:3.20 tar -C /source -czf /backup/uploads.tar.gz .
docker image tag sha256:10437171bfe2ac7160327dbead0e4c5931f42b8c4e3bd234d2f6d24be19fd389 lca-recette-frontend:erp17-pre-update-20261011
docker image tag sha256:b6a770eb0090fbf7d69a97df1c77fbad00799044ce2aa6413a4926b2ee349982 lca-recette-backend:erp17-pre-update-20261011
cp /home/silva/Documents/Codex/2026-08-31/ch/outputs/lca-fullstack/docker-compose.recette.yml /home/silva/Documents/Codex/2026-08-31/ch/outputs/lca-fullstack/backups/erp17-pre-update-20261011/docker-compose.recette.yml
cp /home/silva/Documents/Codex/2026-08-31/ch/outputs/lca-fullstack/.env.recette /home/silva/Documents/Codex/2026-08-31/ch/outputs/lca-fullstack/backups/erp17-pre-update-20261011/.env.recette
sha256sum /home/silva/Documents/Codex/2026-08-31/ch/outputs/lca-fullstack/backups/erp17-pre-update-20261011/mysql.sql /home/silva/Documents/Codex/2026-08-31/ch/outputs/lca-fullstack/backups/erp17-pre-update-20261011/ged.tar.gz /home/silva/Documents/Codex/2026-08-31/ch/outputs/lca-fullstack/backups/erp17-pre-update-20261011/uploads.tar.gz /home/silva/Documents/Codex/2026-08-31/ch/outputs/lca-fullstack/backups/erp17-pre-update-20261011/docker-compose.recette.yml /home/silva/Documents/Codex/2026-08-31/ch/outputs/lca-fullstack/backups/erp17-pre-update-20261011/.env.recette
```

Prérequis : image `alpine:3.20` déjà disponible localement ou téléchargement explicitement autorisé. Vérifier que les archives sont non vides et lisibles. La copie `.env.recette` contient des secrets et doit être protégée avec des permissions hôte strictes avant exécution.

## 16. Retour arrière sans perte de données récentes

Le retour arrière normal remplace uniquement le code des images. Il ne restaure jamais automatiquement MySQL, GED ou uploads :

```bash
docker image tag lca-recette-backend:erp17-pre-update-20261011 lca-recette-backend:latest
docker image tag lca-recette-frontend:erp17-pre-update-20261011 lca-recette-frontend:latest
docker compose -p lca-recette -f /home/silva/Documents/Codex/2026-08-31/ch/outputs/lca-fullstack/docker-compose.recette.yml --env-file /home/silva/Documents/Codex/2026-08-31/ch/outputs/lca-fullstack/.env.recette up -d --no-deps --no-build backend
docker compose -p lca-recette -f /home/silva/Documents/Codex/2026-08-31/ch/outputs/lca-fullstack/docker-compose.recette.yml --env-file /home/silva/Documents/Codex/2026-08-31/ch/outputs/lca-fullstack/.env.recette up -d --no-deps --no-build frontend
```

Toute restauration de dump ou d'archive est une procédure d'incident distincte, soumise à validation métier et à comparaison des données créées après mise à jour. Aucune restauration aveugle de volume n'est autorisée.

## 17. Contrôles post-mise à jour

1. Infrastructure : six conteneurs sains ; IDs historiques et MySQL recette inchangés ; ports 3001/4176/3004/33321 inchangés ; volumes et réseaux identiques.
2. API : `/api/health`, authentification, Facturation, SAV, Garantie et GED.
3. Frontend : gardes Pièces avec profils autorisé/refusé, Nouvel OR, contexte Garantie, Facturation A1/A2 et filtre Atelier.
4. PDF : nouveau document uniquement ; `100 000 km`, lignes HT/TTC, totaux 23 780 + 41 615 = 65 395, pagination et absence de chevauchement ; archives historiques non régénérées.
5. RBAC : Super Admin puis profils métier disponibles ; menus, accès directs, refus backend et scopes d'agence.
6. Données : contrôles en lecture seule de REC15, REC16-GAR-01, REC16-CONC, factures, stocks, GED et uploads ; aucune mutation de test sur ces ressources.
7. Non-régression : backend 69+2 ignorés, frontend 62/62, GED/PDF, builds et `git diff --check`.

## 18. Conditions d'arrêt

Arrêt immédiat si : hash frontend/backend du Compose recette diffère des valeurs auditées ; ID MySQL ou historique change ; MySQL perd `lca-recette_recette_private`, l'alias `mysql` ou `lca_recette_mysql_data` ; volume/réseau/port diffère ; sauvegarde absente ou illisible ; empreinte `.env.recette` change ; build ou plan cible MySQL ; bootstrap annonce une migration inattendue ; service historique devient unhealthy ; nouveau PDF/GED échoue ; données REC15/REC16 divergent.

## 19. État Docker final de cette préparation

Recette : frontend `3825fe4f6c82`, backend `f95ed37f5408`, MySQL `5e7de0bab86f`, tous healthy. Historique observé : frontend `323a78fc5f2b`, backend `ce40bb9ad897`, MySQL `9b37c86b3190`, tous healthy. Aucun conteneur n'a été reconstruit, redémarré, arrêté, recréé ou modifié pendant cette préparation ; aucune donnée et aucun volume n'ont été écrits.

## 20. Verdict de préparation

La provenance fusionnée du MySQL est expliquée et circonscrite. Le Compose recette seul reproduit exactement la configuration actuelle de backend/frontend. MySQL partage les réseaux et alias nécessaires, son volume est distinct, et les commandes ciblées séquentielles avec `--no-deps` n'ont aucune raison de le recréer ou de modifier ses montages/réseaux. L'environnement historique appartient au projet `lca`, avec images, volumes et réseaux distincts.

Verdict technique : **A. SÛR SOUS CONDITIONS**.

Les commandes restent interdites tant qu'une autorisation explicite d'exécution n'a pas été donnée.
