# Backend Node.js Express — migration progressive

Ce dossier remplace progressivement `backend/` (NestJS) sans le supprimer. Il utilise Express, TypeScript, `mysql2/promise`, JWT et Socket.IO tout en conservant le contrat `/api` attendu par le frontend.

## Première tranche migrée

- `GET /api/health`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/users`
- `GET /api/agencies`
- `GET /api/customers`
- `GET /api/customers/:id`
- `GET /api/customers/:id/timeline`
- `GET /api/vehicles`
- `GET /api/vehicles/:id`
- `GET /api/sales`
- `GET /api/sales/:id`
- namespace Socket.IO `/realtime`
- authentification, RBAC réutilisable et filtrage par agence

Les écritures et les autres modules restent servis par NestJS jusqu’à leur migration. Ne basculez `VITE_API_URL` sur Express que pour tester les routes déjà listées, ou placez un proxy de transition route par route.

## Installation

```bash
cp .env.example .env
npm install
npm run lint
npm test
npm run dev
```

Express écoute par défaut sur `3002` afin de pouvoir fonctionner en parallèle de NestJS sur `3001`.

Pour tester le frontend entièrement contre Express plus tard :

```env
VITE_API_URL=http://localhost:3002/api
```

## Production

```bash
npm ci
npm run build
NODE_ENV=production node dist/server.js
```

Le schéma MySQL et les migrations restent ceux du dossier `database/` commun aux deux backends.

## Prochain ordre de migration

1. écritures clients, véhicules, ventes et réservations ;
2. leads, showroom et activités ;
3. atelier et pièces ;
4. livraisons et facturation ;
5. notifications Socket.IO, GED, paramètres, exports et PDF ;
6. tests contractuels complets, puis suppression du backend NestJS.
