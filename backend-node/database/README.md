# Base de données LCA

## Nouvelle installation

1. Créer une base MySQL 8 vide et configurer `backend-node/.env`.
2. Depuis `backend-node`, lancer `npm run db:bootstrap`.
3. Lancer `npm run seed:admin` avec `ADMIN_EMAIL` et `ADMIN_PASSWORD` définis
   dans l'environnement.

Le bootstrap applique le baseline, le seed système puis les migrations `034+`
dans l'ordre. Il exige les variables
`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` et `DB_NAME`.

Le baseline correspond au niveau logique 033 : 89 tables, 159 permissions
système, RBAC dynamique et scopes `OWN`, `AGENCY`, `CONCESSION`, `GLOBAL`. Il
ne contient aucune donnée métier fictive. Le seed ajoute uniquement les
référentiels et permissions système nécessaires.

## Installation existante

Ne jamais exécuter le baseline. Le runner lit `schema_migrations` et applique
uniquement les migrations futures non enregistrées (`034` et suivantes).
Avant adoption sur une installation historique au niveau 033, effectuer une
sauvegarde MySQL complète puis créer explicitement la ligne de marquage 033
après contre-audit. Cette opération n'est jamais automatique.

Une base non vide sans `schema_migrations` est considérée ambiguë : le runner
s'arrête avec `DATABASE_AMBIGUOUS`, sans écrire, et demande une intervention
manuelle. Une base versionnée sous 033 est refusée avec
`DATABASE_VERSION_UNSUPPORTED`. Un doublon de numéro dans `migrations/` est
refusé avec `DUPLICATE_MIGRATION_VERSION`. Un redémarrage du
backend ou la recréation d'un conteneur avec son volume MySQL ne rejoue donc
jamais le baseline.

## Sources

- Source d'initialisation : `baseline/001_initial_schema.sql`.
- Données système : `seeds/001_system_seed.sql`.
- Évolution actuelle : `migrations/034_role_deletion_permission.sql` ; prochaine version : `035_*.sql`.
- Les migrations `001`–`033` sont conservées dans `legacy-migrations/`
uniquement pour traçabilité. `schema.sql` et `all_migrations.sql` ont été
supprimés : le baseline est l’unique schéma consolidé.

## Règles pour une migration future

- nommer le prochain fichier `035_description.sql`, puis incrémenter sans doublon ;
- ne jamais modifier un fichier déjà enregistré en production ;
- sauvegarder MySQL, les uploads et la GED avant déploiement ;
- valider la migration sur une copie isolée et vérifier un second bootstrap ;
- documenter toute opération non additive et sa restauration.

Le backend Docker lance `node dist/scripts/database-bootstrap.js` avant le
serveur. En local, la commande équivalente est `npm run db:bootstrap`.

L’état enregistré peut être consulté sans mutation avec :

```sql
SELECT version, name, checksum, applied_at
FROM schema_migrations
ORDER BY version;
```

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
Le module RH & Administration a été consolidé dans cette photographie locale 033.
Une installation déjà versionnée 033 ne reçoit donc volontairement ni ses six tables
ni ses structures RH et fiscales ni leurs permissions : lors du passage réel en production, une migration additive
034+ devra reprendre exactement ce delta, sans réexécuter le baseline ni le seed.
