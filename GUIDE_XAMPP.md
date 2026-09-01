# Test local avec MySQL/MariaDB de XAMPP

## 1. Démarrer la base

Dans le panneau XAMPP, démarrez **MySQL**. Apache n'est pas requis pour React ou NestJS ; il sert seulement si vous utilisez phpMyAdmin.

## 2. Importer le schéma

Ouvrez `http://localhost/phpmyadmin`, puis utilisez **Importer** avec `backend/database/schema.sql`.

Attention : ce fichier recrée les tables et supprime leurs données existantes. Utilisez une base de test ou faites une sauvegarde avant de le réimporter.

Le schéma utilise `utf8mb4`, InnoDB, des clés étrangères, des ENUM et JSON compatibles avec les versions modernes de MariaDB fournies par XAMPP.

## 3. Configurer l'API

Dans `backend/` :

```bash
cp .env.xampp.example .env
npm install
```

Modifiez `.env` si le port, l'utilisateur ou le mot de passe MySQL diffèrent de votre installation. Avec XAMPP standard, l'utilisateur est souvent `root` avec un mot de passe vide.

Créez ensuite le compte administrateur :

```bash
npm run seed:admin
npm run start:dev
```

Vérifiez la connexion MySQL dans le navigateur : `http://localhost:3001/api/health`. La réponse attendue contient `"database":"connected"`.

Swagger est disponible sur `http://localhost:3001/api/docs`.

## 4. Configurer le frontend

Dans un autre terminal :

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

La valeur importante est :

```env
VITE_API_URL=http://localhost:3001/api
```

Ouvrez `http://localhost:3000` et connectez-vous avec `ADMIN_EMAIL` et `ADMIN_PASSWORD` définis dans `backend/.env`.

## Ports occupés

Si XAMPP utilise un autre port MySQL, changez uniquement `DB_PORT`. Si le port 3001 est pris, changez `PORT` côté backend et reportez la même valeur dans `VITE_API_URL` côté frontend.
