# Phase 2C-2B — Lot 2 — Administration et habilitations

## 1. Verdict

Le lot 2 migre **16 endpoints** dont la classification est certaine : cycle de vie central des agences et des rôles, référentiels de rôles consultables localement, et gestion des affectations/rôles d'une affectation dans l'agence active. Les fonctions Utilisateurs encore fondées simultanément sur `users.agency_id`, `user_roles` et les profils RH sont reportées plutôt que déclarées artificiellement multi-agences.

Les opérations centrales exigent le véritable `SUPER_ADMIN` système et leur permission explicite. Les opérations locales utilisent uniquement les rôles de l'agence active, les scopes `OWN/AGENCY`, une ressource chargée côté serveur et une transaction qui conserve l'autorisation jusqu'au commit.

## 2. Audit

### 2.1 Périmètre examiné

**71 endpoints** administratifs ou personnels connexes ont été examinés :

- 27 routes Utilisateurs, affectations, rôles et permissions ;
- 25 routes Paramètres, agences et référentiels ;
- 15 routes 2FA, centre de sécurité et appareils de confiance ;
- 4 routes de cycle de vie des cachets.

| Catégorie | Familles | Décision |
| --- | --- | --- |
| Centrale certaine | création/modification/désactivation d'agence ; création/modification/désactivation/suppression de rôle partagé | Migrée |
| Locale certaine | lecture des affectations visibles ; statut/primaire de l'affectation active ; attribution/retrait de rôle non système ; lecture rôles/permissions | Migrée |
| Personnelle | `/users/me*`, appareils 2FA personnels, profil/session | Conservée sans scope métier artificiel |
| Incertaine ou dépendante | CRUD utilisateur historique, paramètres concession, fiscalité, tarifs, fabricants, documents, cachets, administration 2FA | Reportée |

### 2.2 Permissions concernées

- Centrales : `settings.agencies.manage`, `roles.create`, `roles.update`, `roles.disable`, `roles.delete`, `users.assign_agency` pour la création inter-agences d'une affectation.
- Locales : `users.view`, `users.assign_agency`, `users.assign_role`, `roles.view`.
- Les permissions centrales ne deviennent pas des scopes. Les permissions locales n'acceptent que `OWN` ou `AGENCY`.

### 2.3 Risques identifiés

- `users.agency_id` ne représente pas toutes les affectations d'un utilisateur multi-agences.
- `user_roles` reste le modèle historique et ne doit pas autoriser une opération locale dans une autre agence.
- Un rôle partagé peut contenir des permissions `CONCESSION/GLOBAL` et provoquer une élévation s'il est attribué localement sans inspection.
- Une vérification hors transaction laisserait une fenêtre au changement d'agence, au retrait du rôle de l'acteur ou à la désactivation de son affectation.
- La désactivation d'une affectation ou d'une agence pouvait laisser des sessions et sockets attachées à l'ancien contexte.
- Les paramètres et référentiels mixtes n'ont pas tous une classification centrale/locale validée.

## 3. Endpoints migrés

### 3.1 Administration centrale

| Méthode et route | Permission | Contrôle et ressource | Transaction / tests |
| --- | --- | --- | --- |
| `POST /api/agencies` | `settings.agencies.manage` | Vrai `SUPER_ADMIN`; validation du corps avant MySQL; agence créée sans rôle automatique | Autorisation centrale fraîche; MySQL réel |
| `PATCH /api/agencies/:id` | `settings.agencies.manage` | Vrai `SUPER_ADMIN`; agence chargée/verrouillée côté serveur | Autorisation centrale maintenue pendant l'écriture |
| `PATCH /api/agencies/:id/status` | `settings.agencies.manage` | Vrai `SUPER_ADMIN`; contrôles utilisateurs/opérations actifs conservés | Verrou agence; invalidation des contextes de session |
| `POST /api/users/:id/agencies` | `users.assign_agency` | Vrai `SUPER_ADMIN`; utilisateur et agence actifs chargés côté serveur; doublon refusé | Transaction, audit, déconnexion cible |
| `POST /api/roles` | `roles.create` | Vrai `SUPER_ADMIN`; `SUPER_ADMIN` réservé; permissions validées | Autorisation centrale fraîche + transaction existante |
| `PATCH /api/roles/:id` | `roles.update` | Vrai `SUPER_ADMIN`; rôle système immuable | Rôle verrouillé; utilisateurs concernés resynchronisés |
| `PATCH /api/roles/:id/status` | `roles.disable` | Vrai `SUPER_ADMIN`; rôle système non désactivable | Verrou et notification RBAC |
| `DELETE /api/roles/:id` | `roles.delete` | Vrai `SUPER_ADMIN`; rôle système non supprimable; remplacement contrôlé | Réaffectation atomique et notification RBAC |

`withCurrentCentralAuthorization` recharge la session et le contexte depuis MySQL, verrouille l'autorité système et confirme la permission avant d'exécuter le service. Un rôle portant seulement un nom ressemblant à `SUPER_ADMIN`, même avec `is_system=TRUE`, ne satisfait pas la règle exacte `code='SUPER_ADMIN' AND is_system=TRUE`.

### 3.2 Administration locale

| Méthode et route | Permission | Scope/règle d'agence | Sécurité |
| --- | --- | --- | --- |
| `GET /api/users/:id/agencies` | `users.view` | `OWN` : soi-même; `AGENCY` : utilisateur affecté à l'agence active | Ne retourne que l'affectation de l'agence active; le central peut tout lire |
| `PATCH /api/users/:id/agencies/:assignmentId/status` | `users.assign_agency` | Affectation réelle = agence active | Contexte frais, `FOR UPDATE`, invalidation des sessions ciblées |
| `PATCH /api/users/:id/agencies/:assignmentId/primary` | `users.assign_agency` | Affectation réelle = agence active | Verrou et garde de compatibilité historique conservée |
| `POST /api/users/:id/agencies/:assignmentId/roles` | `users.assign_role` | Affectation active de l'agence active | Rôle actif/non système; chaque permission et scope doivent être délégables en `OWN/AGENCY` |
| `DELETE /api/users/:id/agencies/:assignmentId/roles/:roleId` | `users.assign_role` | Affectation réelle = agence active | Rôle système non retirable localement; retrait ciblé uniquement |
| `GET /api/permissions` | `roles.view` | Local `OWN/AGENCY` ou vrai central | Catalogue partagé, métadonnées de délégation conservées |
| `GET /api/roles` | `roles.view` | Local `OWN/AGENCY` ou vrai central | Référentiel nécessaire à l'attribution locale |
| `GET /api/roles/:id/permissions` | `roles.view` | Local `OWN/AGENCY` ou vrai central | Consultation préalable à la délégation |

Les quatre écritures locales emploient la connexion de `withCurrentAgencyAuthorization`. La session, l'agence active, l'affectation de l'acteur, ses rôles et permissions restent donc verrouillés pendant le chargement de la cible, la vérification de délégation, l'écriture et l'audit.

## 4. Endpoints reportés

| Famille / routes | Motif | Décision nécessaire | Phase recommandée |
| --- | --- | --- | --- |
| `/api/users`, `/api/users/:id`, création, modification, statut, reset, avatar admin | Services encore couplés à `users.agency_id`, `user_roles`, techniciens et profils RH | Définir identité centrale vs affectation locale et rôle historique principal | Lot Utilisateurs/RH dédié |
| `/api/users/directory` | Annuaire opérationnel utilisé par plusieurs modules | Définir visibilité inter-agences par usage métier | Avec modules consommateurs |
| `GET /api/agencies`, `GET /api/settings/agencies` | Sert à la fois au changement d'agence et à l'administration | Séparer agences accessibles de la session et catalogue administratif | Lot Paramètres/UX agence |
| `/api/settings`, `/api/concessions/current*` | Paramètres concession, fiscalité et identité collective | Décider central vs surcharge locale | Lot Paramètres |
| Tarifs atelier et overrides | Modèle mixte concession/agence | Politique de surcharge validée | Lot Atelier/Paramètres |
| Fabricants et références documentaires | Référentiels partagés | Gouvernance centrale ou délégation locale | Lot Référentiels |
| Routes 2FA administratives | Scopes spécifiques et contraintes d'authentification forte | Politique centrale/locale sécurité | Lot Sécurité de compte |
| Cachets | Ressources documentaires avec agence et cycle de révocation | Ownership et délégation GED | Lot GED/cachets |

Les fonctions personnelles restent inchangées et liées à `request.user.sub`. Les protections existantes du dernier `SUPER_ADMIN` dans la désactivation/modification d'utilisateur sont conservées et couvertes par non-régression, mais ces routes ne sont pas déclarées migrées.

## 5. Sécurité

### 5.1 Super Administrateur

- reconnaissance depuis MySQL uniquement ;
- utilisateur, session et rôle actifs ;
- code exact `SUPER_ADMIN` et `is_system=TRUE` ;
- permission centrale explicite ;
- rôles système non modifiables, désactivables, supprimables ou attribuables localement ;
- protection historique du dernier compte privilégié préservée.

### 5.2 Élévation et isolation

- aucune confiance dans un `agencyId` client pour une écriture locale ;
- l'affectation est chargée par `(assignmentId,userId)` puis son `agency_id` est comparé à l'agence active ;
- un rôle local doit être non système et toutes ses permissions doivent être détenues par l'acteur avec un scope `OWN/AGENCY` au moins équivalent ;
- tout rôle contenant un scope `CONCESSION/GLOBAL`, une permission absente ou supérieure est refusé ;
- les autres affectations et rôles de l'utilisateur ne sont jamais supprimés.

### 5.3 Sessions et Socket.IO

- après attribution, retrait, changement de statut ou de primaire, les sockets de l'utilisateur cible sont déconnectées après commit ;
- une affectation désactivée remet à `NULL` l'agence active des sessions concernées et incrémente leur version ;
- une agence désactivée invalide de même les contextes de session puis revalide les sockets ;
- la résolution suivante choisit uniquement une autre affectation active autorisée ou refuse l'accès.

## 6. Validation

### 6.1 Tests ciblés et non-régression

- Tests statiques Administration/RBAC : séparation centrale/locale, ressource réelle, délégation, sessions et Socket.IO.
- Suites : `app.test.ts`, fondations multi-agences, paramètres RBAC, utilisateurs centraux, infrastructure d'autorisation, contexte agence et révocation de session.
- Résultat final : **151 tests réussis, 0 échec**.

Anomalie corrigée pendant la passe : la validation d'une création d'agence invalide devait rester un `400` avant toute résolution MySQL/RBAC. Un validateur de route précède désormais le guard central.

### 6.2 MySQL 8.4 réel

Conteneur `mysql:8.4` jetable en `tmpfs`, base isolée, migrations appliquées jusqu'à 115, aucun volume persistant ni base LCA existante utilisée.

Résultat : **1 scénario d'intégration réussi, 0 échec**, couvrant :

- vrai et faux rôle système ;
- central avec/sans permission ;
- manager agence A et cible multi-agences A/B ;
- lecture bornée à A et refus d'une mutation sur B ;
- attribution/retrait local et plusieurs rôles ;
- refus d'une permission/scope non délégable ;
- création centrale d'agence ;
- création, modification, désactivation et suppression centrale d'un rôle ;
- session révoquée ;
- absence de modification de l'affectation B.

Le conteneur a été arrêté puis supprimé automatiquement après succès.

### 6.3 Vérifications techniques

- `npm run lint` : réussi.
- `npm run build` : réussi.
- `git diff --check` : réussi lors de la passe précédant le rapport, puis rejoué en clôture.
- Aucun test frontend, navigateur ou E2E.

## 7. Compatibilité

- Routes, méthodes, corps et formes de réponse conservés.
- Validation `400` avant MySQL conservée pour les créations d'agence invalides.
- RBAC historique inchangé pour tous les endpoints reportés et modules non migrés.
- Aucun scope historique supprimé et aucun nouveau scope créé.
- Aucune permission, aucun rôle ni association métier existante modifié par le code du lot.
- Les changements de rôles/agences des tests ont eu lieu uniquement dans MySQL isolé.
- Aucun fichier frontend modifié.

## 8. État du dépôt

- Aucun commit.
- Aucun push.
- Aucun déploiement.
- Aucune base métier existante modifiée.
- Aucun volume Docker existant supprimé.
- Toutes les modifications non commitées des phases et lots précédents sont préservées.
