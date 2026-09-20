# Backend LCA

`backend-node/` est l’unique backend applicatif. Il utilise Node.js 22,
Express 5, TypeScript, `mysql2/promise`, JWT, PDFKit et Socket.IO. Son contrat
HTTP est préfixé par `/api` et son namespace temps réel est `/realtime`.

## Installation locale

```bash
cp .env.example .env
npm ci
npm run db:bootstrap
npm run seed:admin
npm run dev
```

Renseignez `ADMIN_PASSWORD` avant le seed. Le serveur écoute sur le port défini
par `PORT` (`3001` par défaut). `GET /api/health` vérifie la connexion MySQL.

## Variables

| Variable | Rôle | Exemple local |
|---|---|---|
| `NODE_ENV` | environnement du runtime | `development` |
| `PORT` | port HTTP | `3001` |
| `FRONTEND_URL` | origine CORS autorisée | `http://localhost:3000` |
| `DB_HOST` / `DB_PORT` | serveur MySQL | `127.0.0.1` / `3306` |
| `DB_USER` / `DB_PASSWORD` | compte MySQL | `root` / vide en XAMPP local |
| `DB_NAME` / `DB_POOL_SIZE` | base et taille du pool | `concession_erp` / `10` |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | secrets distincts, 32 caractères minimum | valeurs aléatoires |
| `JWT_ACCESS_TTL` / `JWT_REFRESH_TTL` | durée des jetons | `15m` / `7d` |
| `UPLOAD_DIR` | médias publics | `uploads` |
| `GED_STORAGE_DIR` | documents GED privés | `ged-storage` |
| `DATABASE_ROOT` | racine SQL, facultative | `database` |

Un hôte MySQL est `127.0.0.1` ou `mysql`, jamais `http://localhost:3306`.

## Base et migrations

`npm run db:bootstrap` est l’entrée canonique :

- base vide : baseline 001–033, seed système, puis migrations `034+` ;
- base versionnée : migrations `034+` absentes seulement ;
- base non vide non versionnée : arrêt sans écriture.

Les commandes historiques `db:migrate:billing` et
`db:migrate:customers360` sont conservées pour diagnostic ciblé d’anciennes
installations ; elles ne remplacent pas le bootstrap et ne constituent pas le
flux normal de mise à niveau. Voir `database/README.md`.

## Développement et validation

```bash
npm run lint
npm test
npm run build
npm start
```

`npm start` exécute `dist/server.js` et exige donc un build préalable. Les
tests unitaires injectent un environnement de test ; les tests d’intégration
MySQL supplémentaires doivent utiliser une base isolée.

## Sécurité et stockage

Toutes les autorisations métier sont contrôlées côté serveur par permissions
et scopes dynamiques. L’ownership s’appuie sur la relation métier de chaque
ressource, jamais sur une simple appartenance de rôle. `SUPER_ADMIN` est le
seul rôle système spécial.

`/uploads` expose les médias prévus à cet effet. La GED est stockée séparément
dans `GED_STORAGE_DIR` et servie via les routes autorisées. En Docker, ces deux
répertoires sont des volumes persistants distincts.

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
