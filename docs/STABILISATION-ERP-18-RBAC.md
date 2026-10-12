# ERP-18 — RBAC multi-profils

## Inventaire réel

Les 13 profils demandés existent et sont actifs : Super Administrateur, Direction, Responsable commercial, Commercial, Réceptionniste, Responsable livraison, Comptable, Conseiller SAV, Responsable SAV, Chef d'atelier, Technicien, Magasinier et Responsable pièces. Ils appartiennent à l'unique concession et sont répartis sur quatre agences. Les scopes persistés sont respectivement dynamiques (`GLOBAL`, `CONCESSION`, `AGENCY` ou `OWN`) ; aucun contrôle ne repose sur le libellé du rôle.

Les identifiants sont fournis par les mécanismes de recette existants (`ADMIN_*`, `RECETTE_USER_PASSWORD`) et n'ont jamais été affichés. Douze comptes métier ont réussi le login officiel et `/auth/me` en HTTP 200. Le Super Administrateur était déjà connecté dans le navigateur.

## API

- sans jeton, `GET /parts` retourne 401 ;
- les dix profils sans droits Pièces testés retournent 403 sur catalogue, emplacements, commandes, fournisseurs et mutations invalides ;
- Magasinier et Responsable pièces retournent 200 sur les quatre lectures Pièces et 403 sur `/users` ;
- les requêtes de mutation utilisaient exclusivement des identifiants inexistants et n'ont modifié aucune donnée.

## Navigateur

La session Super Administrateur a permis les contrôles CRM et Stock. Les comptes secondaires sont disponibles pour le login API, mais aucune session navigateur secondaire n'était préouverte. Injecter un jeton ou extraire/transmettre le secret vers l'outil navigateur aurait contourné le parcours de connexion attendu. La matrice navigateur multi-profils reste donc **NON EXÉCUTÉE**, conformément à la mission.

## Verdict

**PARTIEL.** Authentification et protections API multi-profils sont prouvées. La preuve navigateur de menus, routes directes et actions par profil nécessite des sessions secondaires ouvertes par la procédure sûre décrite dans les réserves.
