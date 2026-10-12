# Base de données livrée

Ce dossier est un miroir destiné à la revue. Les fichiers canoniques exécutés par l'application restent sous `application/backend-node/database/`.

- `schema/001_initial_schema.sql` : baseline fraîche consolidée au niveau 071 ;
- `schema/001_system_seed.sql` : référentiels et permissions système, sans données métier client ;
- `migrations/034_*.sql` à `079_*.sql` : historique d'upgrade ; sur une installation fraîche, le runner ignore les versions incorporées à la baseline et applique 072–079 ;
- `application/backend-node/database/legacy-migrations/` : 001–033 conservées uniquement pour traçabilité, jamais rejouées par le runner actuel.

Le bootstrap refuse une base non vide sans journal `schema_migrations` et une version historique non supportée. Il ne faut jamais appliquer manuellement la baseline sur une base existante. MySQL 8.4.11 a été qualifié avec la baseline et les migrations jusqu'à 079.

Après initialisation, vérifier en lecture seule :

```sql
SELECT version, name, checksum, applied_at
FROM schema_migrations
ORDER BY version;
```

Le seed crée le rôle système Super Administrateur, mais aucun compte réel. Le compte initial est créé via `seed-admin` avec `ADMIN_EMAIL` et `ADMIN_PASSWORD` fournis par un canal sécurisé, puis le mot de passe doit être changé.
