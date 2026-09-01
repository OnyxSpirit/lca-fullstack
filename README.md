# LCA Concession ERP — frontend et backend

Cette livraison contient :

- `frontend/` : React, TypeScript, Vite, TanStack Query et Zustand (état UI uniquement) ;
- `backend/` : NestJS, TypeScript et `mysql2/promise` ;
- `backend-node/` : nouveau backend Express + TypeScript en migration progressive (port 3002) ;
- `backend/database/schema.sql` : schéma MySQL corrigé ;
- `docker-compose.yml` : MySQL et API locale.

Le backend NestJS reste disponible pendant la transition. Consultez `backend-node/README.md` pour les routes déjà migrées avant de modifier `VITE_API_URL`.

## Identité visuelle LCA

Le frontend utilise une direction artistique propre à la concession : noir carbone, rouge profond `#8f1722`, blanc et fond papier. Les composants partagés ont été densifiés, les angles et ombres réduits, la navigation et le tableau de bord retravaillés, et l'écran de connexion ne dépend plus d'un logo distant ni d'un profil de démonstration.

## Démarrage

```bash
docker compose up -d mysql
cd backend
cp .env.example .env
npm install
npm run start:dev
```

Créer ensuite le premier administrateur (changez impérativement le mot de passe) :

```bash
ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD='mot-de-passe-fort' npm run seed:admin
```

Dans un second terminal :

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

- Frontend : `http://localhost:3000`
- API : `http://localhost:3001/api`
- Swagger : `http://localhost:3001/api/docs`

Le schéma SQL est exécuté uniquement lors de l'initialisation d'un volume MySQL vide. En environnement existant, appliquer les fichiers de `backend/database/migrations/` avec l'outil de migration choisi.

## API disponible

- `POST /api/auth/login`, `/refresh`, `/logout`
- `GET|POST|PATCH /api/users`, `/users/me` (création/modification réservée à la direction)
- `GET /api/agencies`
- `GET|POST|PATCH /api/customers`
- `GET|POST /api/leads`, `PATCH /api/leads/:id/stage`
- `GET|POST /api/vehicles`, `GET /api/vehicles/:id`, `PATCH /api/vehicles/:id/status`
- `GET|POST /api/sales`, `PATCH /api/sales/:id/status`
- `POST|DELETE /api/reservations`
- `GET|POST /api/repair-orders`, affectation et changement de statut
- `GET /api/workshop/planning`
- `GET /api/workshop/technicians`
- `GET /api/parts`, mouvements de stock transactionnels
- `GET|POST /api/deliveries`, checklist et signature
- `GET|POST /api/invoices`, paiements et génération PDF
- `GET /api/invoices/payment-methods`
- `GET|POST /api/quotations`
- `GET|POST /api/showroom`, changement de statut
- `GET|PATCH|DELETE /api/notifications`
- `GET /api/audit-logs`
- `GET|POST /api/activities`
- `GET /api/health` (test public de la connexion MySQL)

## Factures PDF

```text
GET /api/invoices/:id/pdf                 affichage dans le navigateur / impression
GET /api/invoices/:id/pdf?download=true   téléchargement
```

Le PDF est généré côté serveur à partir de la facture et de ses lignes. Le frontend fournit les actions **Imprimer** et **PDF** dans la page de facturation.

## Temps réel Socket.IO

Le namespace est `http://localhost:3001/realtime`. Le client doit envoyer l'access token dans `auth.token`. Après validation JWT, la connexion rejoint automatiquement les salons de l'utilisateur et de son agence.

Événements diffusés et consommés par le cache TanStack Query :

- `sales:created`, `sales:status` ;
- `reservations:created`, `reservations:cancelled` ;
- `workshop:repair-order-created`, `workshop:status`, `workshop:assigned` ;
- `parts:stock-changed` ;
- `deliveries:created`, `deliveries:checklist`, `deliveries:delivered` ;
- `billing:invoice-created`, `billing:payment`.
- `showroom:visit-created`, `showroom:status`.

Le frontend contient `src/services/realtime.ts` pour initialiser la connexion après authentification. `AppBootstrap` invalide automatiquement les ressources concernées lorsqu'un événement arrive.

## Données frontend

Les anciens stores et jeux de données fictifs ont été supprimés. Les clients, prospects, véhicules, ventes, atelier, pièces, livraisons, factures, showroom et notifications proviennent de l'API et sont mis en cache par TanStack Query. Zustand reste limité à la session et à l'état d'interface. Le client renouvelle automatiquement le JWT expiré avec le refresh token.

## Pourquoi TypeScript dans le backend ?

NestJS compile les sources TypeScript en JavaScript dans `dist/`, et c'est ce JavaScript que Node.js exécute. TypeScript apporte un contrôle statique des DTO, statuts, résultats SQL et services sans ajouter de contrainte au runtime. Un backend JavaScript pur reste possible, mais offrirait moins de sécurité lors des évolutions de ce projet ERP.

Toutes les routes sauf connexion et renouvellement demandent un bearer token.

## Correspondance MySQL / frontend

MySQL reste la source de vérité et utilise `snake_case` et des statuts anglais. Le backend expose du `camelCase`. Le fichier `frontend/src/services/mysqlStatusMap.ts` documente les traductions vers les libellés français existants.

## Prochaines priorités MVP

- persister les pièces jointes et documents GED ;
- étendre la matrice RBAC détaillée à chaque action métier ;
- ajouter la création des articles de pièces de rechange et des rendez-vous de livraison depuis l'interface ;
- découper le bundle frontend par routes (le build signale encore un chunk principal volumineux).

## XAMPP

La procédure complète se trouve dans `GUIDE_XAMPP.md`. Le fichier `backend/.env.xampp.example` est prévu pour une installation XAMPP standard (`root`, mot de passe vide, port 3306). Après import du schéma, `GET /api/health` permet de confirmer immédiatement que l'API accède à MySQL/MariaDB.
