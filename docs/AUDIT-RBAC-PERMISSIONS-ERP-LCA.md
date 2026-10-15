# Audit transversal RBAC — ERP/CRM LCA

Date : 15 octobre 2026  
Nature : audit statique et lectures SQL uniquement. Aucun rôle, droit, code applicatif ou enregistrement n’a été modifié.

## 1. Résumé exécutif

Le refus d’attribution signalé est **confirmé et expliqué**. Le code `workshop.vehicle.view` au singulier n’existe nulle part dans le référentiel actif. La permission canonique est `workshop.vehicles.view`. Elle existe dans la migration 071, le seed, MySQL, le backend et le frontend.

L’attribution de la permission canonique échoue néanmoins réellement : la migration 071 insère cinq permissions Atelier sans les attribuer au rôle système `SUPER_ADMIN`, alors que `createRole` et `updateRole` imposent que l’administrateur possède lui-même toute permission qu’il délègue, avec un scope au moins équivalent. MySQL confirme que ces cinq permissions ont zéro attribution. L’API retourne donc `403 Permission non délégable : workshop.vehicles.view`.

Le même défaut d’amorçage affecte les sept permissions financières de la migration 083. Contrairement au contexte initial de mission, la base locale indique que la migration 083 a été appliquée le 15 octobre 2026 à 03:35:10; ses permissions existent mais ne sont attribuées à aucun rôle.

Verdict : **RBAC globalement cohérent et sans contournement SUPER_ADMIN détecté, mais anomalie P1 d’amorçage bloquant l’administration de douze permissions récentes.** Aucun P0 confirmé.

## 2. Architecture RBAC actuelle

Chaîne effective :

`users → user_roles → roles → role_permissions(scope) → permissions → resolveRbacContext → requirePermission/assertPermission → prédicats territoriaux → API`.

Sources de vérité :

- Référentiel et attributions : tables MySQL `permissions`, `roles`, `role_permissions`, `user_roles`.
- Chargement serveur : `backend-node/src/modules/rbac/rbac.service.ts`, fonction `resolveRbacContext`.
- Authentification : `backend-node/src/middleware/authenticate.ts`; les droits sont relus en base à chaque requête authentifiée.
- Administration : `backend-node/src/modules/users/user.routes.ts` et `user.service.ts`.
- Frontend : `/auth/me` hydrate `frontend/src/stores/authStore.ts`; `can(code)` utilise les codes dynamiques reçus du serveur.
- Actualisation : événement `rbac:updated`, déconnexion socket et nouvel appel `/auth/me` dans `AppBootstrap.tsx`.

Schéma confirmé : unicité de `roles.code`, `roles.name`, `permissions.code`, et clé primaire `(role_id, permission_id)`. Les scopes sont limités par enum à `OWN`, `AGENCY`, `CONCESSION`, `GLOBAL`.

## 3. Analyse de `workshop.vehicle.view`

### Nom exact

- `workshop.vehicle.view` : **absent** du code, des migrations et de MySQL.
- `workshop.vehicles.view` : **présent et actif**, identifiant MySQL 218, module `workshop`, action `view`.

Références concordantes :

- `backend-node/database/migrations/071_workshop_external_vehicle_permissions.sql:4`
- `backend-node/database/seeds/001_system_seed.sql:205`
- `backend-node/src/modules/workshop/workshop-vehicle.routes.ts:35-67`
- `frontend/src/modules/service/NewRepairOrderModal.tsx:29`

### Parcours d’attribution

1. Le catalogue `/permissions`, protégé par `roles.view`, retourne la permission active.
2. `RoleManagementPanel.tsx` l’affiche et présélectionne `AGENCY` lors du cochage.
3. Le frontend envoie `{permissionId, scope}` vers `PATCH /roles/:id`.
4. La route exige `roles.update`; le service exige en plus `roles.permissions.manage`.
5. `assertDelegablePermissions` vérifie que l’acteur possède le code et un scope au moins aussi large.
6. Le Super Administrateur local ne possède pas `workshop.vehicles.view`.
7. L’enregistrement est refusé avant toute écriture.

### Usage métier

La route de recherche véhicule, la création d’un véhicule extérieur et la création d’association exigent le code canonique. Les scopes sont transformés en prédicats véhicule/agence dans `workshop-vehicle.routes.ts`. Aucune dépendance cachée à la variante au singulier n’a été trouvée.

## 4. Cause du refus d’attribution

**CONFIRMÉ — double facteur :**

1. Le libellé communiqué au singulier est incorrect; le code canonique est au pluriel.
2. Même avec le bon code, le mécanisme d’amorçage est incomplet : la migration 071 précise qu’elle ne réalise aucune attribution, mais l’API n’autorise pas une exception d’amorçage pour le rôle système. Le seed donne toutes les permissions au Super Administrateur uniquement lors d’une installation neuve; une base existante recevant la migration 071 ne rejoue pas ce seed.

Preuve MySQL : les permissions `workshop.vehicles.view`, `workshop.external_vehicle.create` et les trois `workshop.vehicle.associations.*` sont actives mais affectées à zéro rôle. Le Super Administrateur possède d’autres droits Atelier en `GLOBAL`, mais aucun de ces cinq droits.

Le refus n’a pas été reproduit par une écriture, conformément à la mission. Il est néanmoins déterministe à partir des données et de `assertDelegablePermissions`.

## 5. Cartographie des permissions

Base locale : 260 permissions, 260 codes distincts, toutes actives. Répartition principale : RH 46, Workshop 26, Parts 21, Service 20, Treasury 16, Vehicles 16, Delivery 15, CRM 12, Supplier Finance 11, Billing 10, Documents 9.

241 codes sont explicitement consommés par les contrôles backend/frontend détectés. Dix-neuf droits enregistrés n’ont pas d’usage direct détecté :

`crm.appointment.override_conflict`, `crm.offer.prepare`, `parts.inventory.view`, `parts.purchase_order.update`, `parts.stock.manage`, `parts.view`, `service.documents.manage`, `service.order.close`, `service.order.ready`, `vehicles.archive`, `workshop.bay.manage`, `workshop.intervention.assign`, `workshop.intervention.update`, `workshop.schedule.manage`, `workshop.session.manage`, `workshop.session.view`, `workshop.technicians.manage`, `workshop.time.adjust`, `workshop.time.view`.

Ils sont **orphelins d’usage détecté**, pas automatiquement obsolètes; plusieurs sont des capacités futures ou des permissions remplacées par des contrôles plus fins.

## 6. Comparaison code / migrations / base

- A — usages dynamiques détectés dans le code : 241.
- B — littéraux qualifiés dans migrations/seeds : 263, dont quatre codes `workshop.rate_t1..t4` sont des paramètres métier et non des permissions.
- C — base locale : 260 permissions actives.
- A − C : aucun code utilisé par les contrôles applicatifs ne manque en base.
- C − B : `vehicles.archive`, issu d’une migration legacy et présent en base, mais absent des migrations courantes/seeds inspectés.
- Doublons MySQL : aucun (`COUNT=260`, `COUNT DISTINCT=260`).
- Divergence de casse détectée : aucune.

La comparaison est un contrôle statique assisté par expressions régulières; les usages construits dynamiquement peuvent échapper au comptage.

## 7. Audit du module Atelier

Les routes Atelier sont authentifiées globalement puis protégées par `service.*`, `workshop.*`, `parts.*` ou les cinq permissions de la migration 071. Les recherches et associations de véhicules appliquent des prédicats de scope et contrôlent l’agence cible.

Anomalie majeure : les cinq permissions 071 sont visibles dans le catalogue mais non délégables par l’unique Super Administrateur local. Elles sont donc inutilisables via l’administration normale.

Compatibilité de `workshop.vehicles.view` : les quatre scopes sont techniquement acceptés. `OWN` se traduit en propriété/créateur selon le prédicat et peut être plus restrictif que l’intention métier, mais n’empêche pas l’attribution si l’acteur possède ce scope.

## 8. Audit des autres modules

Les domaines CRM, Clients 360, Véhicules, Atelier, Pièces, Ventes, Livraison, Facturation, Showroom, Treasury, RH, GED, Notifications, Paramètres, Utilisateurs et Reporting emploient des codes dynamiques présents en base. L’authentification est montée globalement sur `/api`; les routes métier sensibles inspectées ajoutent `requirePermission`, `requireAnyPermission` ou un contrôle de service équivalent.

Les dix-neuf permissions sans usage direct doivent être revues module par module avant toute suppression. `vehicles.archive` est particulièrement incohérente : le test actuel garantit l’absence d’archivage DELETE, alors que le droit subsiste dans la base.

Résultat : **aucune permission utilisée dans le code n’est absente de la base; aucun bypass transversal confirmé.** L’audit exhaustif d’exécution de chaque route n’a pas été réalisé.

## 9. Audit des scopes

Attributions locales : 175 `AGENCY`, 11 `CONCESSION`, 252 `GLOBAL`, aucune `OWN` actuellement attribuée.

- L’API valide seulement l’enum et la délégabilité hiérarchique (`OWN < AGENCY < CONCESSION < GLOBAL`).
- Le frontend propose systématiquement les quatre scopes pour chaque permission.
- Les incompatibilités métier, par exemple `OWN` sur une ressource collective, sont généralement rejetées au moment d’utiliser la route, pas au moment de l’attribution.

Cette séparation respecte le principe demandé, mais crée une UX trompeuse : une attribution peut être enregistrée puis s’avérer inutilisable. Aucun catalogue de scopes autorisés par permission n’existe.

## 10. Audit du Super Administrateur

Un seul utilisateur actif possède le rôle système actif `SUPER_ADMIN`. Les protections observées : rôle système non modifiable/désactivable/supprimable; dernier Super Administrateur protégé lors des opérations utilisateur; absence de bypass général par nom de rôle.

`isSuperAdmin` est calculé mais `assertPermission` ne l’utilise pas pour contourner les permissions, ce qui est conforme. En contrepartie, toute nouvelle permission doit être explicitement amorcée sur le rôle système, faute de quoi personne ne peut la déléguer.

Le Super Administrateur local possède les droits d’administration des rôles, mais pas les douze permissions récentes concernées; il ne peut donc pas les attribuer.

## 11. Audit des routes backend

- JWT HS256 vérifié avec algorithme imposé.
- Session active et non révoquée vérifiée en base à chaque requête.
- Rôle et permissions actifs relus en base à chaque requête.
- Plusieurs rôles actifs sont refusés par `MULTIPLE_ACTIVE_ROLES`; la base locale ne contient aucun utilisateur dans cet état.
- Les routes d’administration sont séparées : lecture, création, mise à jour, désactivation, suppression, gestion des permissions.
- Les écritures de rôles sont transactionnelles et les doublons sont protégés par contraintes.

Point modéré : `GET /permissions` exige seulement `roles.view`, alors que la matrice complète peut révéler toutes les capacités disponibles. Ce n’est pas une élévation de privilèges, mais l’exposition peut être limitée selon la politique de moindre information.

## 12. Audit des interfaces frontend

Le panneau de rôles masque l’éditeur de permissions sans `roles.permissions.manage`, invalide les caches TanStack Query après mutation et recharge le détail persisté du rôle avant édition.

Écarts :

- le catalogue affiche des permissions que l’acteur ne peut pas déléguer;
- tous les scopes sont proposés sans métadonnée de compatibilité;
- l’erreur API apparaît dans un toast mais n’explique pas le prérequis d’amorçage;
- la navigation reste fondée sur une permission de module générique (`workshop.view`), tandis que certaines actions exigent des permissions fines; ce choix est cohérent mais peut afficher une page où certaines actions restent absentes.

Le masquage frontend n’est pas utilisé comme protection unique; le backend revalide les droits.

## 13. Audit de la synchronisation

Les migrations insèrent le référentiel; il n’existe pas de synchronisation automatique code→permissions. Le bootstrap applique les migrations en attente, mais le seed complet n’est pas rejoué sur une base existante.

Après modification d’un rôle, `notifyRbacUsers` émet `rbac:updated` et déconnecte les utilisateurs concernés. Le frontend recharge `/auth/me`. Même avec un ancien JWT, le backend relit les droits en base à chaque requête : une session frontend éventuellement obsolète ne permet pas de conserver un droit retiré côté serveur.

Stratégie recommandée : toute migration ajoutant une permission doit aussi amorcer explicitement le rôle système `SUPER_ADMIN` en `GLOBAL`, de façon idempotente, sans affecter les rôles métier. Ajouter un contrôle de démarrage/audit qui refuse ou signale toute permission active non détenue par le rôle système lorsque la politique de délégation l’exige.

## 14. Permissions de la migration 083

État réel local : migration 083 **appliquée**, malgré le contexte de mission qui l’annonçait non appliquée.

Les sept codes financiers existent, sont actifs et utilisés par les routes/frontend récents. Ils ont tous zéro attribution :

- `hr.budget.fund.request`
- `hr.budget.fund.request.view`
- `hr.budget.fund.approve`
- `treasury.reservation.submit`
- `treasury.reservation.approve`
- `treasury.reservation.cancel`
- `treasury.reservation.expire`

Ils subissent exactement le même blocage de délégation que les cinq permissions Atelier. Ce constat est **confirmé P1**. Aucune modification n’a été effectuée.

## 15. Matrice RBAC-01 à RBAC-30

| ID | État | Preuve / résultat observé | Priorité |
|---|---|---|---|
| RBAC-01 | Contrôle statique | Création transactionnelle, unicité code/nom | — |
| RBAC-02 | Contrôle statique | Mise à jour transactionnelle, rôle système interdit | — |
| RBAC-03 | Contrôle statique | Attribution simple supportée si délégable | — |
| RBAC-04 | Contrôle DB | Refus déterministe : droit absent du rôle acteur | P1 |
| RBAC-05 | Contrôle statique | État complet remplacé en transaction | — |
| RBAC-06 | Contrôle statique | OWN accepté; sémantique dépend de la route | P2 |
| RBAC-07 | Contrôle statique | AGENCY accepté et prédicats présents | — |
| RBAC-08 | Contrôle statique | CONCESSION accepté et prédicats présents | — |
| RBAC-09 | Contrôle statique | GLOBAL accepté si délégable | — |
| RBAC-10 | Contrôle statique | Retrait par remplacement transactionnel | — |
| RBAC-11 | Contrôle statique | Duplicat payload refusé; contrainte PK en base | — |
| RBAC-12 | Contrôle statique | Permission absente/inactive → HTTP 400 | — |
| RBAC-13 | Contrôle DB | Aucun code applicatif utilisé absent de la base | — |
| RBAC-14 | Contrôle statique | Droits relus sur chaque requête | — |
| RBAC-15 | Contrôle statique | Invalidation Query + événement temps réel | — |
| RBAC-16 | Contrôle statique | `/auth/me` et reconnexion relisent la base | — |
| RBAC-17 | Contrôle statique | Auth globale et middlewares dynamiques | — |
| RBAC-18 | Contrôle statique | `can()` et navigation dynamique | P2 UX |
| RBAC-19 | Contrôle statique/DB | Dernier Super Admin protégé; un actif | — |
| RBAC-20 | Contrôle statique | Aucun bypass `SUPER_ADMIN` dans `assertPermission` | — |
| RBAC-21 | Contrôle statique | Isolation AGENCY implémentée | Non testé |
| RBAC-22 | Contrôle statique | Isolation CONCESSION implémentée | Non testé |
| RBAC-23 | Contrôle statique | GLOBAL implémenté | Non testé |
| RBAC-24 | Contrôle DB | Sept droits 083 actifs mais non attribuables | P1 |
| RBAC-25 | Contrôle DB | Cinq droits Atelier 071 non attribuables | P1 |
| RBAC-26 | Contrôle statique | Codes Pièces présents; certains droits sans usage direct | P3 |
| RBAC-27 | Contrôle statique | Codes Stock présents; `vehicles.archive` orphelin | P2 |
| RBAC-28 | Contrôle statique/DB | RH cohérent sauf trois droits 083 non amorcés | P1 |
| RBAC-29 | Contrôle statique/DB | Treasury cohérent sauf quatre droits 083 non amorcés | P1 |
| RBAC-30 | Non testé | Aucune suite fonctionnelle ni écriture autorisée | Non testé |

Aucun de ces contrôles statiques n’est présenté comme une recette fonctionnelle réelle.

## 16. Anomalies P0 / P1 / P2 / P3

### P0

Aucune anomalie P0 confirmée.

### RBAC-P1-01 — Amorçage Atelier impossible

Impact : permissions 071 impossibles à attribuer depuis l’interface. Cause confirmée : absence d’attribution au rôle système combinée à `assertDelegablePermissions`. Fichiers : migration 071, `rbac.service.ts`, `user.service.ts`. Reproduction sûre : sélectionner `workshop.vehicles.view` sur un rôle puis sauvegarder; résultat attendu actuel 403. Correction : migration additive et idempotente ciblant uniquement le rôle système.

### RBAC-P1-02 — Amorçage financier impossible

Impact : workflows 083 inaccessibles. Cause identique, sept permissions concernées. Correction : même stratégie, sans attribution aux rôles métier.

### RBAC-P2-01 — Scopes UI non contextualisés

Impact : attribution valide techniquement mais inutilisable métier. Cause : liste globale de quatre scopes sans métadonnées par permission. Correction : référentiel explicite de scopes autorisés, partagé API/UI.

### RBAC-P2-02 — Catalogue non filtré par délégabilité

Impact : l’administrateur découvre le refus seulement à la sauvegarde. Correction : exposer `delegable` et `maxDelegableScope`, tout en conservant la validation serveur.

### RBAC-P2-03 — `vehicles.archive` orphelin

Impact : droit assignable sans action correspondante. Correction : documenter comme réservé ou le déprécier formellement après étude métier.

### RBAC-P3-01 — Nom singulier ambigu

Impact : confusion opérationnelle entre `workshop.vehicle.view` et `workshop.vehicles.view`. Correction : documenter le code canonique et ajouter une validation/outillage de recherche dans l’administration.

## 17. Risques de sécurité

- Risque principal actuel : déni d’administration légitime, pas élévation de privilèges.
- Ajouter un bypass global pour SUPER_ADMIN serait un P0 potentiel; il est explicitement déconseillé.
- Une migration corrective trop large qui attribuerait les droits à tous les rôles introduirait une élévation de privilèges.
- Les scopes techniquement valides mais métier incohérents peuvent générer des accès refusés inattendus; les contrôles serveur limitent l’exposition.
- L’absence de tests fonctionnels multi-agences laisse l’isolation territoriale non qualifiée en conditions réelles.

## 18. Corrections recommandées

1. Créer, lors d’une mission de correction séparée, une migration additive idempotente attribuant uniquement les cinq droits 071 et sept droits 083 au rôle `SUPER_ADMIN` système en `GLOBAL`.
2. Ne jamais utiliser le nom de rôle comme bypass dans `requirePermission`.
3. Ajouter une vérification automatisée : toute permission active doit être administrable par au moins un rôle système autorisé.
4. Enrichir le catalogue avec scopes autorisés et niveau maximal délégable.
5. Filtrer ou annoter l’interface selon la délégabilité de l’acteur.
6. Ajouter des tests MySQL/API couvrant RBAC-01 à RBAC-30 et la non-régression multi-agences.
7. Inventorier officiellement les dix-neuf permissions sans usage direct avant décision de conservation.

## 19. Plan d’évolution priorisé

- P1 immédiat : corriger l’amorçage 071/083 par migration additive ciblée, puis vérifier les douze attributions.
- P1 : exécuter RBAC-04 et RBAC-24 par API avec un rôle de test sur une base isolée.
- P2 : publier les métadonnées de scopes et délégabilité dans `/permissions`.
- P2 : qualifier AGENCY, CONCESSION et GLOBAL sur données isolées.
- P3 : documenter les codes canoniques et les permissions réservées/non utilisées.

## 20. Verdict final

**VERDICT : RISQUE P1 CONFIRMÉ — ADMINISTRATION PARTIELLEMENT BLOQUÉE.**

Le socle RBAC dynamique, l’authentification et les contrôles backend sont cohérents. Le problème Atelier n’est ni un cache, ni un ancien JWT, ni une incompatibilité intrinsèque de scope. Il provient d’un défaut d’amorçage du rôle système après ajout de permissions, aggravé par une confusion singulier/pluriel dans le code communiqué.

La base locale est restée inchangée. Aucun test d’écriture, rebuild Docker, redémarrage, migration, commit, push, tag ou déploiement n’a été effectué. L’archive officielle reste conforme au SHA-256 `7a05ce52ace2033a5beb0b1f8ff967e346f4e63c8c0fe20bf29b91b0500ea3cc`.
