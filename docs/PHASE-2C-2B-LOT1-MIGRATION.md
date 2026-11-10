# Phase 2C-2B — Lot 1 — Première migration fonctionnelle

## 1. Verdict

Le lot 1 migre de bout en bout les six opérations HTTP de notifications personnelles vers le contexte RBAC multi-agences. Les activités exposées par le dépôt ne sont pas des activités personnelles autonomes : ce sont des journaux d'audit ou des activités CRM. Elles sont donc reportées avec leur module propriétaire. Les fonctions de compte et de session restent volontairement liées à l'identité authentifiée, sans scope métier artificiel.

Le modèle appliqué aux notifications est le suivant :

- propriétaire métier : `notifications.user_id` ;
- agence réelle : `notifications.operation_agency_id`, résolue depuis MySQL ;
- `operation_agency_id IS NULL` : notification personnelle indépendante d'une agence ;
- `OWN` : notifications du titulaire dans l'agence active, plus ses notifications indépendantes d'une agence ;
- `AGENCY` : consultation des notifications rattachées à l'agence active ;
- `CONCESSION` et `GLOBAL` : refusés sur ces endpoints métier migrés.

## 2. Audit initial

### 2.1 Classification

| Domaine | Endpoints identifiés | Catégorie | Décision |
| --- | --- | --- | --- |
| Notifications | `GET /api/notifications`, compteur non lu, lecture, lecture globale, archivage, suppression logique | B — ressource personnelle liée éventuellement à une agence | Migrés |
| Activités CRM | `GET /api/leads/:id/activities`, `POST /api/activities` | C — ressource partagée appartenant au CRM | Reportés au lot CRM |
| Journal d'activité | `GET /api/activity`, filtres, détail et PDF | C/D — journal d'audit transversal avec filtrage de divulgation par module | Reporté au lot audit/activités après migration des modules propriétaires |
| Compte utilisateur | `/api/users/me`, mot de passe, avatar, `/api/me`, `/api/logout` | A — compte/session indépendante d'une agence | Conservés, identité serveur déjà imposée |
| 2FA personnel et appareils de confiance | routes `/api/2fa/*` et `/api/auth/2fa/devices/me*` | A/D — sécurité de compte et de session | Conservés ; pas de scope `AGENCY` ajouté |
| Producteurs de notifications | services CRM, ventes, devis, facturation, livraison, atelier, RH, etc. | C/D — producteurs des modules propriétaires | Pas de migration globale ; seule l'émission nominative est filtrée par contexte d'agence |

### 2.2 Dépendances et risques constatés

- La visibilité historique acceptait quatre scopes et pouvait exposer toutes les agences d'un même destinataire.
- L'agence historique de `users.agency_id` ne constitue pas l'agence réelle d'une notification. La colonne canonique est `operation_agency_id`.
- Une notification personnelle sans agence ne doit pas être rattachée artificiellement à l'agence active.
- Les écritures vérifiées avant transaction restaient vulnérables à un changement d'agence ou à un retrait d'autorisation concurrent.
- La room privée `user:{id}` pouvait transporter une notification rattachée à une agence différente de celle de la session Socket.IO.
- Les activités d'audit peuvent révéler des données CRM, RH ou financières ; les migrer isolément contournerait potentiellement l'autorisation du module propriétaire.

## 3. Endpoints migrés

| Méthode et route | Permission | Scopes acceptés | Ressource et propriété | Règle d'agence | Contrat et tests |
| --- | --- | --- | --- | --- | --- |
| `GET /api/notifications` | `notifications.view` | `OWN`, `AGENCY` | `OWN` impose `n.user_id = contexte.userId` | `OWN` limite à agence active ou `NULL`; `AGENCY` limite strictement à l'agence active | Route, pagination, filtres, tri et réponse conservés ; tests de visibilité et MySQL |
| `GET /api/notifications/unread-count` | `notifications.view` | `OWN`, `AGENCY` | Compteur du titulaire uniquement | Agence active ou notification indépendante | Contrat `{ unreadCount }` conservé |
| `PATCH /api/notifications/read-all` | `notifications.update` | `OWN`, `AGENCY` | Mise à jour du titulaire uniquement | Agence active ou `NULL` | Transaction et autorisation fraîche ; contrat `{ success, updated }` conservé |
| `PATCH /api/notifications/:id/read` | `notifications.update` | `OWN`, `AGENCY` | Chargement serveur avec `user_id`, règle `isOwner` explicite | Agence réelle égale à l'agence active, ou indépendance explicite si `NULL` | `FOR UPDATE`, état archivé/supprimé revalidé, réponse conservée |
| `PATCH /api/notifications/:id/archive` | `notifications.archive` | `OWN`, `AGENCY` | Même stratégie, aucune confiance dans l'identifiant ou une agence client | Même règle | Verrou, suppression logique, audit dans la transaction, réponse conservée |
| `DELETE /api/notifications/:id` | `notifications.delete` | `OWN`, `AGENCY` | Même stratégie ; aucune suppression physique | Même règle | Verrou, suppression logique, audit dans la transaction, réponse conservée |

La stratégie `notificationStrategy` charge la notification depuis MySQL avec son destinataire, son agence réelle et son état. `authorizeAgencyResource` vérifie ensuite agence et propriété. L'absence d'agence n'est acceptée que par la règle explicite `agencyIndependent`.

## 4. Endpoints reportés ou exclus

| Route | Motif | Dépendance | Phase recommandée |
| --- | --- | --- | --- |
| `GET /api/leads/:id/activities` | Activité CRM, non autonome | Autorisation et ownership du prospect | Lot CRM |
| `POST /api/activities` | Création rattachée obligatoirement à un prospect | CRM, affectation commerciale et visibilité du prospect | Lot CRM |
| `GET /api/activity` | Journal d'audit transversal ; `OWN` signifie auteur de l'audit, pas propriétaire de toutes les ressources révélées | Permissions de divulgation CRM/RH/finance/GED | Lot audit après modules propriétaires |
| `GET /api/activity/filters` | Même périmètre transversal | Journal d'audit et permissions des modules | Lot audit |
| `GET /api/activity/:id` et PDF | Les détails dépendent de la permission de la ressource journalisée | Modules propriétaires et politique de divulgation | Lot audit |
| `/api/users/me*`, `/api/me`, `/api/logout` | Fonctions de compte/session déjà contraintes par `request.user.sub` et la session | Authentification, session, mot de passe/avatar | Aucune migration métier requise |
| `/api/2fa/*`, `/api/auth/2fa/devices/me*` | Sécurité de compte indépendante d'une agence ; ajouter `AGENCY` serait incorrect | Politique 2FA et authentification forte | Lot sécurité de compte si évolution du modèle de permission |
| Signatures personnelles `/api/document-marks/signature/me*` | Fichiers et identité documentaire nécessitent une analyse distincte du stockage par agence | GED/signatures et permissions `*.self` | Lot GED/signatures |

Aucune règle métier n'a été inventée pour ces endpoints. Leur comportement historique est préservé.

## 5. Sécurité mise en œuvre

### 5.1 Permissions et ressources

- `requireAgencyBusinessPermission` remplace le middleware historique uniquement sur les routes Notifications migrées.
- `OWN` et `AGENCY` sont les seuls scopes acceptés ; les scopes historiques sont rejetés sans détail interne dans la réponse.
- Le destinataire et l'agence proviennent de MySQL. Aucun `agencyId` ni booléen de propriété fourni par le client n'est utilisé.
- Une notification d'un tiers est absente du chargement autorisé ; une notification de la même personne dans une autre agence est refusée.
- Les notifications indépendantes d'une agence restent accessibles à leur seul destinataire.

### 5.2 Écritures et concurrence

- `withCurrentAgencyAuthorization` recharge le contexte dans la transaction.
- La session, la version du contexte, l'affectation, les rôles et permissions utiles sont relus/verrouillés.
- Les mutations unitaires chargent la ressource avec `FOR UPDATE` puis revalident son état.
- `read-all` applique un prédicat unique combinant identité et agence active ; aucune liste d'identifiants client n'est acceptée.
- Archivage et suppression restent logiques et l'audit est écrit dans la même transaction.

### 5.3 Temps réel

`emitToUserAgencyContext` conserve l'événement `notifications:created` et son payload minimal `{ id }`, mais inspecte le contexte de chaque socket privée :

- notification sans agence : émise aux sessions du destinataire ;
- notification avec agence : émise seulement aux sockets dont l'agence active correspond ;
- après changement d'agence, la synchronisation de session Socket.IO met à jour les rooms et le contexte ;
- une ressource refusée par HTTP n'est donc pas révélée par l'événement nominatif.

Le système Socket.IO global et les producteurs des autres modules n'ont pas été refondus.

## 6. Tests et résultats

### 6.1 Tests statiques et unitaires ciblés

Commande ciblée : tests d'activités territoriales, contexte historique des notifications, fiabilité dynamique, scope endpoint, traçabilité RBAC et visibilité multi-agences.

Résultat : **27 tests réussis, 0 échec**.

Ces tests couvrent notamment :

- séparation des quatre permissions Notifications ;
- rejet de `CONCESSION`/`GLOBAL` ;
- identité plus agence active ;
- stratégie serveur, ownership explicite et agence indépendante ;
- transactions, verrouillage et absence de suppression physique ;
- contrats de pagination/filtres et snapshots historiques ;
- filtrage Socket.IO par agence active ;
- absence de modification du journal d'activité historique.

La suite de non-régression regroupant `app.test.ts`, autorisation agence, contexte agence, révocation de session et tests Notifications concernés a ensuite produit **132 tests réussis, 0 échec**. Elle a révélé puis permis de corriger une régression de contrat : un identifiant de notification syntaxiquement invalide devait rester rejeté en `400` avant toute résolution RBAC/MySQL. La validation de route est désormais exécutée avant le middleware de permission, sans modifier la vérification d'autorisation des identifiants valides.

### 6.2 MySQL 8.4, HTTP et Socket.IO réels

Environnement : conteneur `mysql:8.4` jetable, `tmpfs`, base `lca_phase2c2b_isolated`, aucun volume et aucune base LCA existante utilisée. Les migrations ont été appliquées jusqu'à la version 115.

Résultat : **1 scénario d'intégration réussi, 0 échec**.

Le scénario vérifie :

- notifications personnelles `NULL`, agence A et agence B ;
- exclusion d'un tiers et d'une autre agence ;
- lecture unitaire, `read-all`, archivage et suppression logique ;
- `OWN`, élévation contrôlée à `AGENCY`, rejet de `GLOBAL` ;
- changement d'agence et retrait/rétablissement du rôle d'agence ;
- identifiant inexistant ou falsifié ;
- session révoquée ;
- absence d'événement Socket.IO pour l'agence inactive et réception pour l'agence active.

Le conteneur a été arrêté après le test et supprimé automatiquement.

### 6.3 Validation TypeScript et dépôt

- `npm run lint` : réussi.
- `npm run build` : réussi.
- `git diff --check` : réussi.
- Aucun test frontend, navigateur ou E2E n'a été exécuté.

## 7. Compatibilité

- Routes, méthodes HTTP, pagination, filtres, tris, formats de réponse et événement `notifications:created` conservés.
- Aucun paramètre `agencyId` ajouté aux routes personnelles.
- Les refus nécessaires utilisent `403`, les ressources absentes `404`, les sessions invalides `401` et les changements concurrents de contexte `409` selon les contrats communs.
- Le RBAC historique (`requirePermission`, quatre scopes et `request.rbac`) reste en place pour tous les modules non migrés.
- Aucune permission, aucun rôle et aucune association rôle-permission métier du dépôt n'a été modifié par ce lot.
- Aucun fichier frontend n'a été modifié.
- Les contrats de connexion, rafraîchissement et déconnexion restent inchangés.

## 8. État du dépôt

- Aucun commit.
- Aucun push.
- Aucun déploiement.
- Aucune base existante modifiée.
- Aucun volume Docker existant supprimé.
- Les modifications non commitées antérieures des phases 2A, 2B, 2C-1 et 2C-2A ont été préservées.
