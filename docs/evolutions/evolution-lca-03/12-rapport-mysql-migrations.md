# MySQL et migration

MySQL 8.4 vérifié dans l'environnement isolé `evolution-lca-03-final`. Le bootstrap frais a appliqué les 67 migrations jusqu'au niveau 137, avec 0 étape non `APPLIED` et 0 avertissement historique au démarrage. Le contrôle `npm run db:migrations:verify` est vert (104 migrations vérifiées, référence immuable jusqu'à 134 et exception historique déclarée). Les migrations 135, 136, 137 et le runner n'ont pas été modifiés ; aucune migration 138 n'était nécessaire. Les scopes persistés interdits sont au nombre de 0.

