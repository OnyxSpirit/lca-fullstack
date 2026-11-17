# Audit RBAC multi-agences

Le frontend filtre actions et onglets ; le backend réapplique toutes les permissions. Les permissions financières collectives refusent `OWN` dans les transactions. Les rôles métier non système sont normalisés vers `OWN`/`AGENCY`; les libellés UI ne proposent que les scopes métier compatibles. Les grants historiques du rôle système restent `GLOBAL` et sont bornés par le contexte agence sur les routes migrées.

Recette : seul `SUPER_ADMIN` possède 375 permissions ; aucune affectation métier représentative. Les tests RBAC automatisés passent et les endpoints sans jeton retournent 401. Les scénarios multi-profils et révocation sont BLOQUÉS.

Verdict : **PARTIELLEMENT CONFORME**, faute de preuve réelle multi-utilisateurs.
