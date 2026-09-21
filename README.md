# LCA ERP — concession automobile

LCA est un ERP/CRM automobile composé de trois éléments :

- `frontend/` : React 19, TypeScript, Vite, TanStack Query, Zustand et Socket.IO Client ;
- `backend-node/` : unique backend, fondé sur Express 5, TypeScript, `mysql2/promise`, JWT et Socket.IO ;
- MySQL 8 : schéma canonique, données système et migrations dans `backend-node/database/`.

Il n’existe aucun second backend à installer ou à démarrer.

```text
React → Nginx → Express (`backend-node`) → MySQL
                  ↕ Socket.IO
```

Arborescence essentielle :

```text
lca-fullstack/
├── backend-node/
│   ├── src/
│   ├── test/
│   ├── database/{baseline,seeds,migrations,legacy-migrations}/
│   └── Dockerfile
├── frontend/
├── scripts/
├── docker-compose.yml
├── .env.example
├── README.md
└── DEPLOYMENT.md
```

## Prérequis

Les images officielles utilisent Node.js 22, MySQL 8.4 et Nginx 1.27. En
local, utilisez Node.js 22 avec le npm fourni, ou des versions compatibles avec
les lockfiles. Le déploiement exige Docker avec le plugin Compose moderne. Les
versions contrôlées lors de cette mise à jour documentaire sont Node.js
24.11.1, npm 11.7.0, Docker 29.8.0 et Compose 5.5.1.

## Démarrage local

```bash
cd backend-node
cp .env.example .env
npm ci
npm run db:bootstrap
npm run seed:admin
npm run dev
```

Avant `seed:admin`, renseignez un mot de passe fort dans `ADMIN_PASSWORD` de
`backend-node/.env`. Dans un autre terminal :

```bash
cd frontend
cp .env.example .env
npm ci
npm run dev
```

- interface : `http://localhost:3000` ;
- API : `http://localhost:3001/api` ;
- santé MySQL : `http://localhost:3001/api/health` ;
- Socket.IO : path `/socket.io`, namespace `/realtime`.

Pour XAMPP, consultez [GUIDE_XAMPP.md](GUIDE_XAMPP.md). Pour Docker et un VPS,
consultez [DEPLOYMENT.md](DEPLOYMENT.md).

## Base de données

- nouvelle base vide : le bootstrap applique la baseline consolidée 040
  `backend-node/database/baseline/001_initial_schema.sql`, puis
  `backend-node/database/seeds/001_system_seed.sql`, sans rejouer 034–040 ;
- base versionnée existante : seules les migrations absentes de
  `backend-node/database/migrations/`, à partir de `034`, sont appliquées ;
- base non vide sans table `schema_migrations` : arrêt de sécurité, sans écriture.

Ne rejouez jamais le baseline sur une installation existante. La version de la
baseline fraîche est indépendante du plan d'upgrade : une base 039 applique
toujours 040. Les migrations
`001` à `033` de `backend-node/database/legacy-migrations/` sont conservées uniquement pour la
traçabilité. La procédure détaillée se trouve dans
[`backend-node/database/README.md`](backend-node/database/README.md).

## Environnement

Le backend utilise `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`,
`DB_POOL_SIZE`, `FRONTEND_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, les
TTL JWT, `UPLOAD_DIR`, `GED_STORAGE_DIR` et facultativement `DATABASE_ROOT`.
`DB_HOST` est un nom d’hôte seul (`127.0.0.1` ou `mysql`), jamais une URL.

Le frontend utilise uniquement `VITE_API_URL`. En local :

```env
VITE_API_URL=http://localhost:3001/api
```

En Docker, il est compilé avec `/api` et Nginx assure le reverse proxy.

## Installation Docker

```bash
cp .env.example .env
# Remplacer toutes les valeurs factices et conserver .env hors Git.
docker compose config --quiet
docker compose build
docker compose up -d
docker compose --profile tools run --rm seed-admin
```

Le Compose actuel valide aussi `ADMIN_PASSWORD` lors de la résolution de la
configuration, même si le profil `tools` n’est exécuté qu’ensuite. Il faut donc
le renseigner avant `docker compose config --quiet`.

La première installation initialise MySQL, démarre le bootstrap, puis Express
et Nginx. Une mise à jour de production suit une procédure différente :
sauvegarde, migrations futures, healthchecks et smoke tests, sans supprimer les
volumes. Voir `DEPLOYMENT.md`.

## Stockage persistant

En Docker, les volumes `lca_mysql_data`, `lca_uploads_data` et
`lca_ged_data` conservent respectivement MySQL, les médias publics et la GED.
Les scripts `scripts/backup.sh` et `scripts/restore.sh` sauvegardent et
restaurent les trois ensembles avec contrôle SHA-256.

## Sécurité et temps réel

Le backend est l’autorité pour l’authentification, les permissions dynamiques,
les scopes (`OWN`, `AGENCY`, `CONCESSION`, `GLOBAL`) et l’ownership métier. Le
frontend masque ou désactive les actions via `can(...)`, sans constituer une
barrière de sécurité. `SUPER_ADMIN` est le seul rôle système spécial.

Après authentification JWT, Socket.IO rejoint les salons de l’utilisateur et
de son périmètre. Les événements métier invalident les caches TanStack Query ;
les notifications nominatives restent adressées au véritable destinataire.

## Vérifications

```bash
cd backend-node
npm run lint
npm test
npm run build

cd ../frontend
npm run lint
npm test
npm run build

cd ..
docker compose config --quiet
git diff --check
```

Certaines suites d’intégration nécessitent une instance MySQL de test et des
variables dédiées. Ne pointez jamais les tests destructifs vers la production.

## Documentation complémentaire

- `DEPLOYMENT.md` : serveur, Docker, HTTPS, sauvegarde, restauration et upgrade ;
- `GUIDE_XAMPP.md` : développement local avec MySQL de XAMPP ;
- `backend-node/README.md` : runtime et variables Express ;
- `backend-node/database/README.md` : baseline, seed et migrations ;
- `docs/RBAC_MATRIX.md` : permissions et scopes dynamiques ;
- `docs/CUSTOMERS_360_PRODUCTION.md` : diagnostic de la fiche Client 360° ;
- `frontend/NAVIGATION_AUDIT.md` : historique de validation de navigation.

Avant toute opération de production, sauvegardez MySQL, uploads et GED. Ne
rejouez jamais le baseline, ne lancez jamais les migrations historiques 001–033
et ne supprimez jamais les volumes pour effectuer une mise à jour.

## Rôles à l’installation

Une installation neuve crée uniquement le rôle système **Super Administrateur**
(`SUPER_ADMIN`, système et actif). Toutes les permissions actives du catalogue
lui sont affectées avec le scope `GLOBAL`, après la déclaration complète du catalogue.
Les rôles métier sont créés dynamiquement par le Super Admin selon l’organisation
de la concession, avec les permissions et scopes `OWN`, `AGENCY`, `CONCESSION`, `GLOBAL`.
Aucun nom de rôle métier ne confère de privilège. Le bypass exige le code
`SUPER_ADMIN` et le statut système persisté, pour un rôle et un utilisateur actifs.

Cette évolution du seed concerne les installations neuves uniquement. Le bootstrap
ne rejoue pas le seed sur une base versionnée et ne supprime aucun rôle existant.
Aucune migration de nettoyage ni modification du schéma consolidé 033 n’est nécessaire.
