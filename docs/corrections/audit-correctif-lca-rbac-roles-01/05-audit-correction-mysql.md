# Audit et correction MySQL

## Modèle constaté

- `roles.is_active BOOLEAN NOT NULL` est la source de vérité ;
- `role_permissions` conserve les permissions et leur scope ;
- `user_roles` porte les rôles système/compatibilité ;
- `user_agency_roles` porte les rôles métier par affectation d'agence.

La désactivation est un `UPDATE`, jamais une suppression. Elle ne modifie ni les permissions configurées, ni les affectations, ni `users.is_active`.

## Preuve MySQL 8.4

Le test isolé crée un rôle, une permission, un utilisateur, deux agences et deux affectations. Il démontre successivement `TRUE → FALSE → TRUE`, la lecture HTTP et SQL, la conservation d'une permission et de deux affectations, ainsi que le maintien du compte utilisateur actif.

Résultat : **1 test réussi, 0 échec, 0 ignoré**, 34,191 s, dont 6,505 s de scénario métier après migrations.

Aucune migration applicative n'a été ajoutée.
