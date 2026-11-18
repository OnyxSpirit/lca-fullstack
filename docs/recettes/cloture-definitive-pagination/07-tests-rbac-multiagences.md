# Tests RBAC et multi-agences

- Les suites frontend dynamiques restent vertes et vérifient l'absence de fallback par nom de rôle.
- Les tests MySQL conditionnels ont réellement exercé les contextes agence, révocations, sockets et CRM.
- Les scopes cibles demeurent `OWN` et `AGENCY`; cette mission n'a ajouté aucun bypass ni scope.
- Les tests `COUNT`/`SELECT` des endpoints déjà paginés restent la preuve de non-divulgation des totaux.

Réserve : la campagne MySQL ciblée contient des échecs, dont une suite d'administration agence. Le RBAC global ne peut donc pas être déclaré intégralement qualifié sur cette exécution.

