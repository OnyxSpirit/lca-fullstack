# RBAC — rôles

Le backend persiste `roles.is_active`, exclut les rôles inactifs du calcul des permissions et révoque/recalcule les habilitations via l’architecture existante. Le frontend actualise maintenant simultanément le détail et la liste des rôles, supprimant l’état actif obsolète après mutation.

Les rôles système restent protégés et les scopes métier demeurent exclusivement `OWN` et `AGENCY`.
