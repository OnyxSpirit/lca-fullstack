# Frontend LCA

Interface React 19 et TypeScript construite avec Vite. Les données serveur sont
gérées par TanStack Query, Zustand reste réservé à la session et à l’état UI,
et Socket.IO actualise les caches après les événements métier.

## Installation

```bash
cp .env.example .env
npm ci
npm run dev
```

En développement :

```env
VITE_API_URL=http://localhost:3001/api
```

L’interface écoute sur `http://localhost:3000`. En production Docker,
`VITE_API_URL=/api` est injecté au build et Nginx sert l’application ainsi que
les reverse proxies `/api`, `/uploads` et `/socket.io`.

## Scripts

```bash
npm run lint
npm test
npm run build
npm run preview
```

Le build génère `dist/`. Une réussite du build ne remplace pas les parcours
comportementaux dans le navigateur, notamment la navigation profonde, les
réponses 401/403 et les actions conditionnées par permissions.

## Navigation et accès

Les chemins sont centralisés dans `src/navigation/routes.ts`. Les routes
inconnues affichent une page 404 et les routes protégées restaurent la
destination après connexion. Le détail de l’audit historique est conservé
dans `NAVIGATION_AUDIT.md`.

Le frontend consomme les permissions et scopes renvoyés par l’API via
`can(...)`. Il ne doit pas autoriser une action à partir d’un nom de rôle : le
backend demeure l’autorité de sécurité. `SUPER_ADMIN` est le seul rôle système
spécial.

## Temps réel

`src/services/realtime.ts` déduit l’origine backend de `VITE_API_URL`, se
connecte au namespace `/realtime` avec le JWT dans `auth.token` et utilise le
path Engine.IO `/socket.io`. Après reconnexion ou événement, les ressources
concernées sont rafraîchies par TanStack Query.

## Principaux modules

CRM, Clients 360°, véhicules VN/VO, ventes, showroom, livraisons, SAV/OR,
planning atelier, pièces et approvisionnements, facturation, GED, reporting,
notifications, utilisateurs/RBAC et paramètres.
