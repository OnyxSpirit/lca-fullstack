# Backend Node.js Express — backend applicatif LCA

Ce dossier est le backend applicatif actuel. Il utilise Express, TypeScript, `mysql2/promise`, JWT et Socket.IO et expose le contrat `/api` attendu par le frontend. Le dossier `backend/` (NestJS) est conservé uniquement comme référence historique et ne doit pas être démarré avec cette version.

## Modules exposés

- `GET /api/health`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/users`
- `GET /api/agencies`
- `GET /api/customers`
- `GET /api/customers/:id`
- écritures et fiche 360° clients ;
- `GET /api/vehicles`
- `GET /api/vehicles/:id`
- `GET /api/sales`
- ventes, réservations et détails ;
- CRM, showroom, stock véhicules, livraisons ;
- SAV, planning atelier, pièces et approvisionnements ;
- facturation, reporting, GED, utilisateurs et paramètres ;
- namespace Socket.IO `/realtime`
- authentification, RBAC réutilisable et filtrage par agence

Le frontend doit pointer exclusivement sur ce service Node.js.

## Installation

```bash
cp .env.example .env
npm install
npm run lint
npm test
npm run dev
```

Express écoute par défaut sur `3001`.

Pour tester le frontend entièrement contre Express plus tard :

```env
VITE_API_URL=http://localhost:3001/api
```

## Production

```bash
npm ci
npm run build
NODE_ENV=production node dist/server.js
```

Appliquez les migrations du dossier `database/migrations/` à la base MySQL avant de démarrer une version qui les requiert.
