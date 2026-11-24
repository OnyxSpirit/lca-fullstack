# RBAC multi-agences et sécurité

Le test réel affecte le même rôle à deux agences. Après réactivation, le changement d'agence active réussit et la permission est recalculée dans la seconde agence. Une désactivation de la définition du rôle s'applique naturellement aux deux affectations, sans inventer un statut par agence.

Contrôles vérifiés :

- acteur dépourvu de `roles.disable` refusé ;
- rôle système refusé ;
- rôle inactif impossible à attribuer comme nouveau rôle opérationnel ;
- scope `GLOBAL` refusé pour un rôle métier ;
- seuls `OWN` et `AGENCY` restent acceptés ;
- les autorisations de cachets exigent déjà un rôle actif dans le moteur automatique et en Livraison ;
- les affectations d'agence et les comptes sont distincts du statut de la définition du rôle.

La journalisation utilise maintenant un contexte EXPLICIT dérivé de l'agence active et sa concession canonique.
