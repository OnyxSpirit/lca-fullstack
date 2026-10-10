# Développement local avec MySQL de XAMPP

Cette procédure utilise `backend-node/`, l’unique backend du projet. Apache
n’est requis que pour phpMyAdmin ; React et Express utilisent leurs propres
ports.

## 1. Préparer MySQL

Démarrez MySQL dans XAMPP et créez une base vide `concession_erp`. Le projet
cible MySQL 8. Les variantes MariaDB de XAMPP ne sont pas la cible certifiée :
validez leur compatibilité avant de les utiliser.

## 2. Configurer et initialiser le backend

```bash
cd backend-node
cp .env.example .env
npm ci
npm run db:bootstrap
```

La configuration locale fournie utilise `DB_HOST=127.0.0.1`, `DB_PORT=3306`,
`DB_USER=root` et un `DB_PASSWORD` vide. Adaptez uniquement les valeurs qui
diffèrent dans XAMPP. `DB_HOST` ne doit contenir ni `http://` ni numéro de port.

Le bootstrap initialise une base vide. Sur une base non vide dépourvue de
`schema_migrations`, il s’arrête volontairement : sauvegardez puis suivez la
procédure d’adoption décrite dans `backend-node/database/README.md`. Il ne
supprime pas automatiquement une base existante.

Renseignez ensuite dans `.env` :

```env
ADMIN_EMAIL=admin@lca.local
ADMIN_PASSWORD=un-mot-de-passe-initial-fort
```

Puis lancez :

```bash
npm run seed:admin
npm run dev
```

Contrôlez `http://localhost:3001/api/health`. La réponse doit indiquer que la
base est connectée.

## 3. Démarrer le frontend

Dans un autre terminal, depuis la racine du projet :

```bash
cd frontend
cp .env.example .env
npm ci
npm run dev
```

Conservez :

```env
VITE_API_URL=http://localhost:3001/api
```

Ouvrez `http://localhost:3000`. Si le port backend change, reportez le même
port dans `VITE_API_URL`. L’URL de connexion utilisateur reste `/login` dans le
frontend ; ce n’est pas l’adresse de l’API.

## 4. Vérifier avant de développer

```bash
cd backend-node
npm run lint
npm run build

cd ../frontend
npm run lint
npm run build
```

Les médias sont écrits dans `backend-node/uploads/` et les documents GED dans
`backend-node/ged-storage/`, sauf surcharge de `UPLOAD_DIR` et
`GED_STORAGE_DIR`.
