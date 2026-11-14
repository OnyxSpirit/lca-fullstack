# Non-régression

Lint TypeScript frontend et backend : vert. Build frontend et backend : vert. Tests ciblés : 4/4. Tests MySQL réels : 26/26 sur les suites exécutées. Les données de production et `concession_erp` n’ont jamais été utilisées.

Après ajout des tris : lint 2/2, builds 2/2, contrats de tri 3/3 et pagination/recherche/filtres/scopes showroom 12/12. La première exécution de cette dernière suite a été empêchée par le sandbox (`listen EPERM`) ; la relance autorisée avec port local éphémère passe intégralement.
