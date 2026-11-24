# Permissions effectives et sessions

Le moteur ne fait pas confiance aux permissions du JWT. À chaque requête, `resolveAgencyRbacContext` relit la session, l'utilisateur, l'affectation d'agence, les rôles et les permissions actives.

Les rôles métier sont joints avec `r.is_active=TRUE`; le rôle système `SUPER_ADMIN` l'est également. Une session créée avant la désactivation reçoit donc immédiatement un refus sur une nouvelle requête. Après réactivation, la même session retrouve les permissions configurées.

Le test MySQL le démontre avec un token émis avant la désactivation : accès 200 avant, 403 après, puis 200 après réactivation. Le compte et les affectations ne sont pas désactivés.

Pour plusieurs rôles, `mergeAgencyPermissions` conserve la portée la plus forte parmi `OWN` et `AGENCY`; retirer un rôle inactif ne supprime pas les droits fournis par les autres rôles actifs.
