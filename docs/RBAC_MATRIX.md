# Référence RBAC dynamique LCA

Ce document décrit le modèle d’autorisation, pas une matrice figée par intitulé
de rôle. Les rôles métier sont configurables en base. Ajouter ou renommer un
rôle ne doit pas nécessiter de modifier le code.

## Autorité et évaluation

Le backend `backend-node/` est l’unique autorité. Chaque endpoint sensible :

1. exige une permission explicite avec `requirePermission(...)` ;
2. récupère le scope attribué à cette permission ;
3. applique le périmètre `OWN`, `AGENCY`, `CONCESSION` ou `GLOBAL` ;
4. vérifie l’ownership à partir de la vraie relation métier de la ressource ;
5. refuse un appel direct par identifiant hors périmètre.

Le frontend utilise `can(...)` pour présenter l’interface, mais son masquage
n’est jamais une mesure de sécurité. Les payloads de permissions peuvent être
normalisés depuis leur représentation API sans logique fondée sur le nom du
rôle.

## Scopes

| Scope | Portée attendue |
|---|---|
| `OWN` | ressources réellement affectées à l’utilisateur |
| `AGENCY` | ressources de l’agence autorisée |
| `CONCESSION` | agences de la concession autorisée |
| `GLOBAL` | toutes les concessions |

Un utilisateur de la même agence n’est pas owner par simple appartenance à
l’agence. Par exemple, une visite showroom utilise son commercial affecté et
un essai son advisor. Les autres modules suivent leurs relations métier
respectives.

## Administration et délégation

- `roles.permissions.manage` est requis pour modifier les permissions ou leurs scopes ;
- un administrateur ne peut déléguer une permission qu’il ne possède pas ;
- il ne peut déléguer un scope supérieur au sien ;
- les scopes de `users.view`, `users.create`, `users.update`, activation,
  changement de rôle et changement d’agence sont appliqués côté backend ;
- la protection du dernier `SUPER_ADMIN` actif reste obligatoire ;
- `SUPER_ADMIN` est le seul rôle système spécial.

Les codes comme `DIRECTOR`, `SALES_AGENT` ou `TECHNICIAN` ne confèrent aucun
privilège implicite. Les affectations de ressources se fondent sur état actif,
agence, rôle actif et permissions métier requises.

## Familles de permissions

Le catalogue canonique est le seed
`backend-node/database/seeds/001_system_seed.sql`. Il couvre notamment CRM,
clients, véhicules, ventes, showroom, livraisons, SAV, atelier, pièces,
facturation, GED, reporting, utilisateurs, rôles et paramètres. Le seed ou une
migration versionnée est la source à modifier lorsqu’une permission évolue.

## Contrôles de non-régression

Les tests doivent au minimum couvrir : rôle arbitraire avec permission,
intitulé historique sans permission, utilisateur inactif, autre agence,
ressource OWN personnelle, ressource OWN d’un autre utilisateur, scopes
AGENCY/CONCESSION/GLOBAL et appel direct hors scope. Les recherches de noms de
rôle dans le runtime servent à détecter les hardcodes, pas à documenter une
autorisation.

## Rôles à l’installation

Une installation neuve crée uniquement le rôle système **Super Administrateur**
(`SUPER_ADMIN`, système et actif). Toutes les permissions actives du catalogue
lui sont affectées avec le scope `GLOBAL`, après la déclaration complète du catalogue.
Les rôles métier sont créés dynamiquement par le Super Admin selon l’organisation
de la concession, avec les permissions et scopes `OWN`, `AGENCY`, `CONCESSION`, `GLOBAL`.
Aucun nom de rôle métier ne confère de privilège. Le bypass exige le code
`SUPER_ADMIN` et le statut système persisté, pour un rôle et un utilisateur actifs.

Cette évolution du seed concerne les installations neuves uniquement. Le bootstrap
ne rejoue pas le seed sur une base versionnée et ne supprime aucun rôle existant.
Aucune migration de nettoyage ni modification du schéma consolidé 033 n’est nécessaire.
