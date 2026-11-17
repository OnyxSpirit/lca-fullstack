# RBAC et sécurité

Contrat réglementaire : `PermissionScope = 'OWN' | 'AGENCY'` côté backend et frontend. La délégation valide la compatibilité par permission et interdit les valeurs hors contrat. L’agence active reste obligatoire pour `AGENCY`; les opérations `OWN` exigent un prédicat de propriété explicite.

Les privilèges centraux du rôle système ne recréent pas un scope de données global. Le changement d’agence est résolu depuis le contexte de session courant et les ressources sont revalidées côté serveur.
