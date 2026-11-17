# 11 — Tests backend

Commande ciblée inchangée : `node --import tsx --test` sur 34 fichiers relatifs aux quatre modules.

Résultat : **34 réussis, 0 échec, 0 ignoré**.

Couverture : documents et filtres d'activité, contexte territorial, autorisation agence, audit, RBAC dynamique/persisté, scopes, rôles, concurrence utilisateur, notifications (migration, endpoints, portée, historique, traçabilité), paramètres, utilisateurs, 2FA et appareils de confiance.

Ces tests n'utilisent pas la base MySQL de recette sauf fichiers d'intégration explicitement exclus et comptés dans le rapport suivant.

