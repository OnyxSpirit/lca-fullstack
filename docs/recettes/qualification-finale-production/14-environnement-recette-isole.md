# Environnement de recette isolé

- Base finale : `lca_qualification_finale_v2` sur le MySQL local de recette.
- API : `http://127.0.0.1:3105`.
- Frontend : `http://127.0.0.1:4179`.
- Concession fictive : `QF_LCA`.
- Agences : `QF_ALPHA` et `QF_BETA`.
- Utilisateurs : domaines `@qualification.invalid`.
- Références clients : préfixe `QF-CUST-`.

Les tests refusent de s'exécuter si le nom de base ou l'URL API ne correspondent pas exactement à ces cibles isolées.
