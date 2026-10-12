# Guide d'administration

## Modèle d'habilitation

L'installation neuve crée uniquement `SUPER_ADMIN`, rôle système actif avec permissions globales. Les rôles métier sont créés par le Super Administrateur selon l'organisation LCA. Un nom de rôle ne confère jamais de droit.

Les scopes sont :

- `OWN` : ressources appartenant à l'utilisateur selon la relation métier ;
- `AGENCY` : agence de l'utilisateur ;
- `CONCESSION` : agences de la concession ;
- `GLOBAL` : ensemble du périmètre applicatif.

Certaines ressources collectives refusent `OWN`. L'interface ne propose que les actions autorisées, mais l'API reste l'autorité.

## Procédure recommandée

1. définir une matrice métier LCA par fonction ;
2. créer un rôle avec un code stable, un libellé et une description ;
3. attribuer uniquement les permissions nécessaires avec le scope minimal ;
4. créer l'utilisateur dans son agence ;
5. affecter le rôle ;
6. tester au moins un accès autorisé et un refus 403 ;
7. tracer la validation et réviser périodiquement les droits.

## Protections

Le dernier Super Administrateur actif ne peut pas être désactivé. Un rôle système ne se transforme pas en rôle métier. Désactivation, changement sensible et déconnexion révoquent les sessions concernées selon le workflow prévu. Ne jamais partager un compte administrateur.

## Administration courante

Surveiller utilisateurs inactifs, rôles sans propriétaire métier, scopes excessifs, paramètres de concession/agence, journaux d'audit, sessions, notifications, espace GED et santé Docker. Toute modification financière, RH ou documentaire doit respecter la séparation des responsabilités définie par la LCA.

