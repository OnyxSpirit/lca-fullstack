# Audit technique et plan d’évolution — Centre d’administration de la sécurité 2FA

Date : 16 octobre 2026  
Mode : audit statique en lecture seule.  
Périmètre : authentification JWT/TOTP, sessions, administration 2FA, RBAC/scopes, frontend, MySQL, Docker et temps réel.

## 1. Résumé exécutif

L’ERP possède déjà un socle 2FA solide : challenge préalable à l’émission des JWT, TOTP chiffré en AES-256-GCM, anti-rejeu, codes de récupération à usage unique, politiques individuelles et par rôle, révocation de sessions, audit, notifications et RBAC dynamique. Ces fonctions ne sont pas codées exclusivement sur le nom `SUPER_ADMIN`, sauf les invariants de protection du véritable rôle système.

Le futur centre de sécurité reste toutefois à construire. Il manque principalement :

- des paramètres 2FA persistés et administrables dynamiquement ;
- un mécanisme d’appareils de confiance ;
- une liste/révocation des appareils personnels et administrés ;
- un véritable parcours de réauthentification renforcée (« step-up ») pour les opérations sensibles ;
- une séparation claire, côté interface et modèle de session, entre connexion, confiance d’appareil et authentification forte récente.

Le message « Une authentification récente est requise » provient d’une fenêtre fixe de dix minutes calculée depuis `refresh_tokens.authenticated_at`. Le refresh JWT conserve l’identifiant de session et ne met jamais cet horodatage à jour. Surtout, les champs TOTP/mot de passe affichés dans l’administration ne peuvent pas renouveler la fenêtre : `assertRecentSession()` est exécuté avant leur validation. Une session âgée de plus de dix minutes doit donc se déconnecter/reconnecter ; aucun parcours de step-up n’existe.

Une apparente erreur « immédiate » après une connexion réellement neuve n’est pas expliquée par la règle nominale et doit être vérifiée en environnement réel. Le risque principal est une interprétation de fuseau : MySQL renvoie les `DATETIME` sous forme de chaînes (`dateStrings: true`) puis Node exécute `new Date(...)`, alors que Docker ne fixe explicitement ni le fuseau MySQL ni celui du backend. Une session restaurée ou simplement rafraîchie peut aussi être perçue à tort par l’utilisateur comme une connexion récente.

L’architecture recommandée ajoute une table de jetons d’appareils opaques hachés et révoquables, réutilise la table globale `settings`, ajoute quatre permissions granulaires, et introduit un step-up lié à la session. Aucun secret cryptographique ne doit être administrable depuis l’interface.

## 2. Sources examinées

Rapports :

- `docs/RAPPORT-AUDIT-POLITIQUE-2FA-PAR-ROLE.md` ;
- `docs/RAPPORT-IMPLEMENTATION-2FA-LCA.md` ;
- `docs/DIAGNOSTIC-CONFIGURATION-2FA-LCA.md` ;
- `docs/RAPPORT-AUDIT-COMPLET-AUTH-2FA-LCA.md` ;
- `docs/RAPPORT-CORRECTION-BOUCLE-2FA-LCA.md` ;
- `docs/RAPPORT-CORRECTION-401-POST-2FA-LCA.md`.

Code principal :

- `backend-node/src/config/env.ts` ;
- `backend-node/src/config/database.ts` ;
- `backend-node/src/modules/auth/auth.routes.ts` ;
- `backend-node/src/modules/auth/auth.service.ts` ;
- `backend-node/src/modules/auth/two-factor.service.ts` ;
- `backend-node/src/modules/auth/two-factor-admin.routes.ts` ;
- `backend-node/src/modules/auth/two-factor-admin.service.ts` ;
- `backend-node/src/modules/auth/two-factor-crypto.ts` ;
- `backend-node/src/modules/rbac/permission-scope-policy.ts` ;
- `backend-node/src/modules/rbac/rbac.service.ts` ;
- `backend-node/src/modules/users/user-access.ts` ;
- `backend-node/database/migrations/087_two_factor_authentication.sql` ;
- `frontend/src/stores/authStore.ts` ;
- `frontend/src/services/apiClient.ts` ;
- `frontend/src/api/twoFactorHooks.ts` ;
- `frontend/src/modules/auth/TwoFactorSettings.tsx` ;
- `frontend/src/modules/users/TwoFactorAdministration.tsx` ;
- `frontend/src/modules/users/RoleManagementPanel.tsx` ;
- `docker-compose.yml`.

## 3. Cartographie de l’existant

### 3.1 Connexion initiale

`login()` valide le mot de passe, charge les rôles actifs et calcule l’état 2FA effectif. Si le facteur est actif ou obligatoire, aucun access/refresh token n’est émis : un challenge opaque est créé.

- facteur actif : `LOGIN_VERIFY`, statut `two_factor_required` ;
- obligation sans facteur : `LOGIN_SETUP`, statut `two_factor_setup_required` ;
- absence de facteur et d’obligation : émission directe des JWT et création d’une session.

Le challenge UUID est lié au hash `IP + User-Agent`, expire, possède un compteur de tentatives, un blocage exponentiel et devient inutilisable après consommation. Les routes publiques sont soumises aux limiteurs du login.

### 3.2 TOTP et enrôlement

- TOTP SHA-1, six chiffres, période de 30 secondes ;
- tolérance uniquement sur la période passée de 30 secondes ;
- `last_accepted_time_step` empêche le rejeu ;
- secret temporaire puis activation transactionnelle après premier code valide ;
- secret chiffré AES-256-GCM avec IV aléatoire, tag et version de clé ;
- QR code et clé manuelle exposés uniquement pendant l’enrôlement ;
- une erreur de clé/déchiffrement échoue fermement en HTTP 503.

### 3.3 Codes de récupération

Dix codes aléatoires sont créés lors de l’activation ou d’une régénération. Seul leur hash SHA-256 salé par domaine applicatif est stocké. Chaque code est consommé sous verrou et audité. Une récupération réussie mène à une session marquée 2FA vérifiée.

### 3.4 JWT, refresh tokens et sessions

Les JWT HS256 contiennent `sub`, e-mail, rôles, agence et `sid`. Ils ne contiennent ni secret 2FA, ni politique, ni horodatage d’authentification forte applicatif. La source de vérité de session est `refresh_tokens` : hash du refresh token, expiration, révocation, `authenticated_at`, `two_factor_verified_at` et marqueur grandfathered.

Le refresh :

- vérifie le refresh JWT et son hash persistant ;
- conserve le même `sid` ;
- recalcule la conformité 2FA ;
- effectue une rotation du refresh token ;
- ne modifie ni `authenticated_at` ni `two_factor_verified_at`.

Le middleware HTTP relit la session et la politique effective à chaque requête. Socket.IO vérifie la session et le RBAC à la connexion, mais n’appelle pas actuellement `assertSessionCurrent()` ; cette asymétrie mérite un test ciblé lors des futurs lots de sécurité.

### 3.5 Révocation

- logout : révocation de la session courante ;
- changement/réinitialisation du mot de passe ou désactivation de compte : révocation des sessions concernées ;
- activation personnelle 2FA : révocation des autres sessions ;
- reset administratif : révocation de toutes les sessions de la cible ;
- nouvelle obligation individuelle/par rôle : révocation des sessions non vérifiées et non grandfathered ;
- modification RBAC : déconnexion Socket.IO et synchronisation des permissions.

### 3.6 Politique effective

La règle est : `Super Admin système OU obligation individuelle OU au moins un rôle obligatoire`. Un second rôle ne peut pas diminuer l’obligation. Le résolveur RBAC actuel refuse toutefois plusieurs rôles actifs (`MULTIPLE_ACTIVE_ROLES`) et l’administration impose exactement un rôle métier principal.

### 3.7 Administration existante

| Fonction | Permission | Scope supporté | Sécurité complémentaire |
|---|---|---|---|
| Voir son état | `auth.2fa.view` | OWN | session authentifiée |
| Gérer son facteur | `auth.2fa.manage` | OWN | session récente ; TOTP pour désactivation/régénération |
| Voir l’état d’un utilisateur | `auth.2fa.users.view` | AGENCY, CONCESSION, GLOBAL | contrôle territorial de la cible |
| Imposer/retirer individuellement | `auth.2fa.users.enforce` | AGENCY, CONCESSION, GLOBAL | contrôle territorial + step fort actuel |
| Réinitialiser un facteur | `auth.2fa.users.reset` | AGENCY, CONCESSION, GLOBAL | contrôle territorial + motif + step fort actuel |
| Gérer les politiques de rôles | `auth.2fa.policy.manage` | GLOBAL | scope exact GLOBAL + step fort actuel |

Le véritable Super Administrateur système reste protégé : obligation calculée indépendamment de la table, retrait refusé, et reset par un non-Super Admin refusé. Cette exception cible `code='SUPER_ADMIN' AND is_system=TRUE`, pas un simple libellé de rôle.

### 3.8 Journalisation et notifications

Les activations, désactivations, récupérations, blocages, régénérations, resets et changements de politiques sont audités. Le writer supprime automatiquement les champs dont le nom ressemble à mot de passe, token, secret, cookie ou hash. Les changements administratifs génèrent aussi des notifications sans matériel secret.

## 4. Paramètres 2FA actuellement disponibles

| Paramètre | Défaut | Borne actuelle | Stockage/source | Dynamique | UI |
|---|---:|---:|---|---|---|
| `TWO_FACTOR_ENCRYPTION_KEY` | absent/null | Base64 décodant exactement 32 octets | secret d’environnement | non, redémarrage | jamais |
| `TWO_FACTOR_KEY_VERSION` | `v1` | texte | environnement | non | jamais |
| `TWO_FACTOR_ISSUER` | `ERP LCA` | aucune borne explicite | environnement | non | non |
| `TWO_FACTOR_CHALLENGE_TTL_SECONDS` | 300 s | max. 900 s | environnement | non | non |
| `TWO_FACTOR_SETUP_TTL_SECONDS` | 600 s | max. 1 800 s | environnement | non | non |
| `TWO_FACTOR_MAX_ATTEMPTS` | 5 | max. 20 | environnement | non | non |
| `TWO_FACTOR_EXISTING_SESSION_GRACE_SECONDS` | 604 800 s | max. 2 592 000 s | environnement | non | non |
| Fenêtre d’authentification récente | 600 s | valeur codée en dur | code `assertRecentSession()` | non | texte informatif seulement |
| Algorithme TOTP | SHA-1 | fixe | code | non | non |
| Chiffres/période/tolérance | 6 / 30 s / passé 30 s | fixes | code | non | non |
| Nombre de codes de récupération | 10 | fixe | code | non | non |
| TTL access/refresh JWT | 15 min / 7 jours | variables libres | environnement JWT | non | non |

Le Compose transmet explicitement la clé et sa version. Les autres variables 2FA ne sont pas transmises dans `docker-compose.yml` et prennent donc leurs valeurs par défaut, sauf ajout externe au mécanisme Compose. Une valeur d’exemple ressemblant à une clé Base64 valide est présente dans un fichier d’exemple racine ; elle doit rester une valeur non opérationnelle et ne jamais être réutilisée comme secret réel.

Les paramètres cryptographiques (clé, version disponible, algorithme de chiffrement) doivent rester hors de toute interface dynamique.

## 5. Appareils de confiance : état actuel

**Fonction absente.** Aucune table, route, cookie HttpOnly, jeton d’appareil, empreinte persistante, durée de confiance, liste ou révocation d’appareil n’a été trouvée.

À ne pas confondre :

- `two_factor_grandfathered` est une transition temporaire des sessions préexistantes à la migration 087 ;
- `context_hash(IP + User-Agent)` protège un challenge court contre un changement de contexte ;
- le refresh token représente une session, pas une preuve qu’un navigateur peut éviter un futur challenge TOTP après une nouvelle saisie du mot de passe.

## 6. Diagnostic de l’authentification récente

### 6.1 Contrôle exact

`assertRecentSession()` lit `refresh_tokens.authenticated_at` par `sid`, vérifie que la session n’est pas révoquée, puis calcule :

`Date.now() - new Date(authenticated_at).getTime() <= 10 minutes`.

Au-delà, il lève HTTP 401 : « Une authentification récente est requise. Reconnectez-vous. »

`assertRecentAndStrong()` enchaîne ensuite seulement :

1. le contrôle d’ancienneté ;
2. si le facteur de l’acteur est actif, la validation TOTP ;
3. sinon, la validation du mot de passe.

### 6.2 Signification des horodatages

- `authenticated_at` : création initiale de la session après mot de passe et, le cas échéant, challenge 2FA ;
- `two_factor_verified_at` : session initialement validée par TOTP/récupération ;
- `iat` JWT : instant de signature du token, renouvelé au refresh, mais non utilisé par le contrôle récent ;
- `last_accepted_time_step` : anti-rejeu TOTP, pas une preuve générale de step-up récent.

### 6.3 Comportement du refresh

Le refresh conserve le `sid` et met à jour uniquement le hash et l’expiration du refresh token. Il ne repousse volontairement pas `authenticated_at`. Un refresh automatique juste avant une action n’est donc pas une nouvelle authentification.

### 6.4 Comportement frontend

Les écrans d’administration affichent un champ TOTP et un champ mot de passe, puis envoient ces preuves dans la mutation. Ils n’exposent ni statut/compte à rebours de la fenêtre récente, ni bouton de step-up. Si la fenêtre est dépassée, la preuve fournie n’est jamais examinée, car le backend échoue avant. Le seul parcours disponible est une reconnexion complète.

### 6.5 Causes possibles d’un refus « immédiat »

1. **Session restaurée** : l’application se croit connectée à partir de `localStorage`; aucune nouvelle saisie du mot de passe n’a eu lieu.
2. **Refresh récent confondu avec reconnexion** : le JWT est neuf mais la session et `authenticated_at` sont anciens.
3. **Délai réel supérieur à dix minutes** entre création de session et opération.
4. **Écart de fuseau** : le pool impose `dateStrings: true`; un `DATETIME` sans zone est ensuite donné à `new Date()`. Aucun `TZ` ni `time_zone` commun n’est imposé dans le Compose. Un écart MySQL/Node peut vieillir artificiellement la valeur dès sa lecture.
5. **Session absente/révoquée ou `sid` incohérent** : le même message est utilisé lorsque la requête de session ne renvoie aucune ligne.

L’audit statique ne permet pas d’affirmer laquelle explique un cas réel sans lire les horloges et la ligne de session concernée. La quatrième cause est une fragilité démontrable du code ; elle doit être testée avec plusieurs fuseaux.

### 6.6 Trois notions distinctes

| Notion | État actuel | Cible |
|---|---|---|
| Session connectée | JWT + refresh token + ligne persistante | inchangé, mot de passe toujours requis à la création |
| Appareil de confiance | absent | preuve opaque distincte, 7 jours par défaut |
| Authentification forte récente | approximation par âge de connexion + preuve renvoyée à chaque mutation | step-up explicite, horodaté côté serveur et lié à la session |

## 7. Architecture cible des appareils de confiance

### 7.1 Principes

Après une validation TOTP réussie et un consentement explicite « Faire confiance à ce navigateur », le serveur génère au moins 32 octets aléatoires. Le navigateur reçoit le jeton uniquement dans un cookie :

- `HttpOnly` ;
- `Secure` en production ;
- `SameSite=Strict` par défaut (Lax seulement si un parcours intersite justifié apparaît) ;
- `Path=/api/auth` ;
- expiration alignée sur l’expiration absolue.

La base ne conserve que le hash SHA-256 du jeton opaque à haute entropie. L’adresse IP reste une métadonnée d’audit et de détection, jamais l’unique preuve. Le User-Agent peut être haché et comparé avec prudence : une variation doit conduire à une nouvelle vérification, sans constituer une identité robuste à elle seule.

### 7.2 Table additive proposée : `two_factor_trusted_devices`

Champs recommandés :

- `id` UUID/CHAR(36), clé primaire ;
- `user_id`, FK cascade ;
- `token_hash CHAR(64)`, unique ;
- `device_name VARCHAR(120)` nullable et modifiable par l’utilisateur ;
- `user_agent_hash CHAR(64)` et résumé non sensible du navigateur ;
- `created_at`, `last_used_at`, `expires_at` ;
- `revoked_at`, `revoked_by`, `revoke_reason` ;
- IP de création/dernière utilisation uniquement comme métadonnée bornée ;
- index `(user_id, revoked_at, expires_at)` et index unique du hash.

Aucun secret brut, TOTP, refresh token ni cookie ne doit apparaître dans les audits.

### 7.3 Cycle de vie

1. mot de passe valide ;
2. si 2FA active/obligatoire, vérification du cookie de confiance ;
3. cookie absent/invalide/expiré/révoqué : challenge TOTP normal ;
4. cookie valide : session créée sans nouveau TOTP, mais marquée comme authentifiée par appareil ;
5. l’expiration absolue d’origine n’est jamais repoussée par les connexions ;
6. rotation du jeton à chaque utilisation réussie, par mise à jour atomique, sans repousser `expires_at` ;
7. révocation personnelle, administrative, globale sur reset 2FA, désactivation de compte ou changement de mot de passe ;
8. suppression du cookie lors de la révocation locale et réponse générique en cas de jeton inconnu.

Le cookie ne remplace jamais le mot de passe. Il ne satisfait jamais à lui seul le step-up d’une opération sensible.

### 7.4 Paramètres dynamiques

Réutiliser la table `settings` avec `scope_type='global'`, `scope_id=0` :

- `security.2fa.trusted_devices.enabled` : booléen, défaut `false` au déploiement puis activation contrôlée ;
- `security.2fa.trusted_devices.duration_days` : défaut 7 ;
- `security.2fa.trusted_devices.max_duration_days` : plafond applicatif, par exemple 30 ;
- `security.2fa.strong_auth.duration_minutes` : défaut 10, borne recommandée 1–30 ;
- règles de révocation activables uniquement lorsqu’elles ne diminuent pas les invariants minimaux.

Le plafond maximal doit aussi exister dans le code pour empêcher une valeur de base excessive de neutraliser la borne de sécurité.

## 8. Architecture du centre d’administration

Une nouvelle page « Centre de sécurité 2FA » devrait être accessible selon les permissions effectives, pas selon le rôle. Sections :

1. **Vue générale** : paramètres non secrets et indicateurs agrégés autorisés.
2. **Paramètres généraux** : confiance appareil, durée bornée, durée du step-up, règles de révocation.
3. **Politiques par rôle** : réemploi de `TwoFactorRolePolicies` et des routes existantes.
4. **Politiques individuelles** : réemploi de l’état et des actions de `TwoFactorUserAdministration`, avec recherche/pagination des utilisateurs dans le scope.
5. **Appareils de confiance** : liste paginée, recherche, utilisateur, navigateur résumé, dates, statut et révocation.
6. **Mes appareils** : consultation, renommage optionnel et révocation OWN.
7. **Opérations sensibles** : explication de la fenêtre forte et modal de step-up ; aucune clé ni secret affiché.

TanStack Query peut gérer les lectures, mutations et invalidations. Socket.IO n’est pas nécessaire pour les paramètres ou listes. Une révocation de session/appareil peut éventuellement déconnecter les sockets de la cible via le mécanisme existant, mais ne justifie pas un nouveau canal temps réel.

## 9. Authentification forte cible

Ajouter une notion persistante `strong_auth_at` liée à la session, distincte de `authenticated_at`, ainsi qu’une méthode (`PASSWORD_TOTP`, `PASSWORD`, `TOTP_LOGIN`, etc.) si utile à l’audit.

Un endpoint de step-up doit :

- exiger la session connectée ;
- vérifier le mot de passe courant ;
- vérifier aussi le TOTP lorsque le facteur est actif ;
- mettre à jour `strong_auth_at` côté serveur après succès ;
- auditer le succès sans preuve secrète, et limiter/auditer les échecs ;
- ne pas accepter un appareil de confiance comme substitut ;
- ne pas dépendre de l’âge du précédent step-up pour autoriser le nouveau.

Les opérations sensibles appellent ensuite `assertRecentStrongAuthentication()` avec la durée dynamique bornée. Une réponse structurée (`STRONG_AUTH_REQUIRED`) permet au frontend d’ouvrir la modal, d’effectuer le step-up, puis de rejouer explicitement l’action après confirmation utilisateur. Cette approche supprime la boucle actuelle où la preuve est fournie mais rejetée avant validation.

Les dates doivent être comparées côté MySQL (`authenticated_at >= DATE_SUB(UTC_TIMESTAMP(), ...)`) ou être lues dans un format UTC explicite. Des `DATETIME` sans zone ne doivent plus être interprétés implicitement par JavaScript.

## 10. Matrice des permissions recommandée

### 10.1 Permissions à réutiliser

Conserver les six permissions existantes et leurs sens actuels : `auth.2fa.view`, `auth.2fa.manage`, les trois `auth.2fa.users.*` et `auth.2fa.policy.manage`.

### 10.2 Permissions nouvelles minimales

| Permission proposée | Objet | Justification |
|---|---|---|
| `auth.2fa.settings.view` | lire les paramètres globaux non secrets | séparer lecture et écriture |
| `auth.2fa.settings.manage` | modifier les paramètres globaux bornés | action globale sensible |
| `auth.2fa.devices.view` | consulter appareils propres ou de cibles autorisées | ne pas réutiliser artificiellement `users.view` |
| `auth.2fa.devices.revoke` | révoquer un appareil propre ou dans le scope | séparer consultation et mutation |

Une permission `auth.2fa.sensitive.manage` n’est **pas** recommandée : le step-up est une condition de sécurité qui s’ajoute à la permission métier de chaque action, pas une autorisation métier universelle. Une permission générique risquerait de devenir un bypass.

### 10.3 Attribution

La migration attribue les nouvelles permissions au véritable rôle système actif pour l’amorçage, conformément au mécanisme existant. Ensuite, `roles.permissions.manage` et la délégation bornée permettent de les attribuer à des rôles dynamiques (responsable sécurité, informatique, direction). Aucune route ne doit tester le nom de ces rôles.

## 11. Matrice des scopes compatibles

| Permission | OWN | AGENCY | CONCESSION | GLOBAL |
|---|:---:|:---:|:---:|:---:|
| `auth.2fa.view` | oui | non | non | non |
| `auth.2fa.manage` | oui | non | non | non |
| `auth.2fa.users.view` | non | oui | oui | oui |
| `auth.2fa.users.enforce` | non | oui | oui | oui |
| `auth.2fa.users.reset` | non | oui | oui | oui |
| `auth.2fa.policy.manage` | non | non | non | oui |
| `auth.2fa.settings.view` | non | non | non | oui |
| `auth.2fa.settings.manage` | non | non | non | oui |
| `auth.2fa.devices.view` | oui | oui | oui | oui |
| `auth.2fa.devices.revoke` | oui | oui | oui | oui |

Évolution de la source centrale `permission-scope-policy.ts` : ajouter les deux permissions settings à `globalOnlyCodes`; laisser les permissions devices accepter explicitement les quatre scopes, de préférence dans un ensemble nommé plutôt que par fallback générique.

Le catalogue `/permissions` expose déjà `allowedScopes`, `delegable` et `maxDelegableScope`; `RoleManagementPanel` n’affiche déjà que les scopes autorisés et marque les affectations historiques incompatibles. Le backend valide à la création et à la modification des rôles. Cette chaîne doit être réutilisée, avec des tests de refus des scopes incompatibles.

## 12. Routes API recommandées

| Méthode et route | Permission/scope | Usage |
|---|---|---|
| `GET /auth/2fa/security-settings` | `settings.view=GLOBAL` | paramètres non secrets |
| `PUT /auth/2fa/security-settings` | `settings.manage=GLOBAL` + step-up | mise à jour bornée et auditée |
| `POST /auth/2fa/step-up` | session + permission de l’action finale | renouveler `strong_auth_at` |
| `GET /auth/2fa/devices` | `devices.view`, scope appliqué | liste paginée/recherche |
| `DELETE /auth/2fa/devices/:id` | `devices.revoke`, scope appliqué + step-up si tiers | révocation |
| `GET /auth/2fa/devices/me` | `devices.view=OWN` | appareils personnels |
| `DELETE /auth/2fa/devices/me/:id` | `devices.revoke=OWN` | révocation personnelle |
| `DELETE /auth/2fa/devices/me/current` | session | retirer la confiance courante |

Les routes publiques existantes `/auth/login` et `/auth/2fa/verify` évoluent seulement pour vérifier/créer le cookie avec consentement explicite. Le cookie doit être effacé sur jeton invalide/révoqué et sur demande locale.

## 13. Évolutions MySQL et migration additive

Une migration additive future devra :

1. créer `two_factor_trusted_devices` avec contraintes/index ;
2. ajouter `strong_auth_at` et éventuellement `strong_auth_method` à `refresh_tokens` ;
3. insérer les quatre permissions sans modifier les permissions existantes ;
4. mettre à jour les attributions du rôle système authentique seulement ;
5. créer les paramètres globaux avec valeurs sûres, ou utiliser des fallbacks applicatifs puis persister à la première mise à jour ;
6. ne jamais remplir artificiellement des appareils historiques ;
7. laisser la confiance désactivée par défaut pendant le déploiement initial.

La table générique `settings` convient aux valeurs globales validées. La preuve d’appareil exige une table dédiée relationnelle. Aucune donnée 2FA existante ne doit être reconstruite.

## 14. Impacts techniques

### Backend

Nouveau service appareils, résolveur de paramètres typés/cachés, cookie, step-up et gardes fortes. Réutiliser `writeAudit`, `assertCanViewTargetActor`, la résolution de concession/agence, les transactions et le rate limiting.

### Frontend

Nouvelle route/page de sécurité, hooks Query, sections conditionnées par permission, tableau paginé, modal de step-up et option « Faire confiance à cet appareil » sur le challenge TOTP. Réutiliser `Card`, `Badge`, `Button`, `Modal`, les toasts et le design responsive actuel.

### JWT et sessions

Aucun nouveau claim n’est strictement nécessaire : `sid` permet une décision serveur fraîche. Stocker l’état sensible côté serveur évite des JWT périmés. Le stockage actuel des JWT dans `localStorage` reste un risque XSS distinct ; le cookie de confiance HttpOnly ne doit pas reprendre ce modèle.

### Notifications/audit

Auditer création/utilisation significative/révocation/expiration, modification de paramètres, step-up bloqué et révocation globale. Notifier l’utilisateur lors de l’ajout ou révocation d’un appareil, sans token ni empreinte brute.

### Docker/Nginx

Aucun nouveau service. Garantir HTTPS, `Secure`, conservation de `Set-Cookie`, même origine `/api`, et horloge/fuseau cohérents. La clé de chiffrement reste injectée hors Git. Ajouter les seules variables de borne absolue qui ne doivent pas être dynamiques, si retenues.

### Socket.IO

Pas de diffusion en temps réel requise pour les listes. Lors d’une révocation de session ou d’un changement critique, le mécanisme existant `disconnectUser()` suffit. Vérifier séparément la conformité 2FA lors du handshake Socket.IO.

## 15. Analyse des écarts et anomalies

### Confirmées

1. Aucun appareil de confiance.
2. Aucun centre d’administration unifié.
3. Paramètres 2FA opérationnels uniquement par environnement/code, sans gestion dynamique.
4. Aucun parcours de step-up : une session expirée doit se reconnecter.
5. Les preuves TOTP/mot de passe envoyées par les formulaires ne peuvent pas renouveler la fenêtre, car l’ancienneté est testée avant elles.
6. La durée récente est codée en dur et non visible comme état.

### Potentielles ou à valider dynamiquement

1. Parsing ambigu des `DATETIME` MySQL en JavaScript et différence de fuseau.
2. Socket.IO vérifie session/RBAC mais pas explicitement `assertSessionCurrent()`.
3. L’écran des politiques reste logé dans un onglet dépendant aussi de `roles.view`; déjà identifié et hors correction UX précédente.
4. Les JWT/refresh tokens sont dans `localStorage`; cela augmente l’impact d’une XSS, sans être spécifique aux appareils de confiance.
5. Le fichier d’environnement d’exemple racine doit être contrôlé pour garantir qu’aucune clé opérationnelle n’y est réutilisée.

## 16. Risques de sécurité et mesures

| Risque | Mesure requise |
|---|---|
| Vol du cookie de confiance | secret 256 bits, HttpOnly/Secure/SameSite, hash DB, rotation, révocation, durée absolue |
| Contournement du mot de passe | vérifier le cookie uniquement après mot de passe valide |
| Contournement des opérations sensibles | step-up TOTP/mot de passe indépendant de la confiance appareil |
| Navigateur partagé | opt-in explicite, nom visible, révocation personnelle simple, avertissement UX |
| Énumération d’appareils hors scope | prédicat territorial appliqué dans chaque SELECT/DELETE |
| Escalade RBAC | politique centrale des scopes + validation de délégation backend |
| Valeurs de configuration dangereuses | schéma typé, bornes code + DB, audit, step-up |
| Rejeu/concurrence du jeton | rotation atomique, hash unique, verrou/compare-and-swap |
| Sessions après reset/mot de passe | révocation appareils et sessions dans la même politique transactionnelle |
| Fuite dans logs/audit | sanitizer existant + interdiction explicite du token brut |
| Décalage d’horloge/fuseau | UTC explicite, comparaison SQL ou parsing ISO avec zone, tests multi-TZ |

## 17. Plan d’implémentation par lots

### Lot 1 — Fiabiliser l’authentification récente

- reproduire le refus avec horloges MySQL/Node et session lue en lecture seule ;
- normaliser les comparaisons en UTC ;
- ajouter `strong_auth_at` ;
- créer le endpoint/modal de step-up ;
- remplacer les gardes actuelles sans affaiblissement ;
- tests de 0, 9:59, 10:00+, refresh, fuseaux et sessions révoquées.

### Lot 2 — Gouvernance et paramètres

- migration additive des permissions et paramètres ;
- source centrale des scopes ;
- services GET/PUT de paramètres bornés ;
- audit et section « Paramètres généraux » ;
- confiance appareil maintenue désactivée.

### Lot 3 — Preuve d’appareil

- table dédiée ;
- émission/validation/rotation du cookie ;
- intégration après mot de passe ;
- révocation automatique lors des événements critiques ;
- tests cryptographiques, concurrence, expiration et cookies.

### Lot 4 — Gestion personnelle et administrative

- liste OWN ;
- liste paginée AGENCY/CONCESSION/GLOBAL ;
- recherche et révocation avec prédicats de scope ;
- notifications et audit ;
- responsive/accessibilité.

### Lot 5 — Centre unifié et intégration

- page centrale conditionnée par permissions ;
- réemploi des composants rôle/individuel ;
- indicateurs et états d’erreur ;
- tests E2E des rôles dynamiques ;
- vérification Socket.IO/Nginx/HTTPS.

### Lot 6 — Déploiement contrôlé

- sauvegarde et migration vérifiées ;
- backend puis frontend ;
- confiance désactivée au départ ;
- recette sécurité ;
- activation progressive, surveillance des audits et procédure de révocation globale.

## 18. Stratégie de tests recommandée

### Unitaires

- validation/bornes des paramètres ;
- hash/rotation des jetons ;
- politique d’expiration absolue ;
- calcul des scopes et délégation ;
- parser/UTC et fenêtre de step-up.

### Intégration MySQL 8.4 isolée

- migration sur base 087 et base vierge ;
- contraintes, index et cascade ;
- émission/utilisation concurrente/rotation/révocation ;
- conservation des données 2FA existantes ;
- AGENCY/CONCESSION/GLOBAL et refus hors scope ;
- reset, mot de passe, désactivation et révocation globale.

### API

- mot de passe toujours obligatoire ;
- appareil valide évite uniquement le challenge de connexion ;
- appareil expiré/révoqué/UA incompatible exige TOTP ;
- cookie brut absent des réponses/logs ;
- step-up exigé sur mutations sensibles ;
- Super Admin système toujours obligatoire ;
- rôles dynamiques autorisés uniquement par permissions.

### Frontend/E2E

- opt-in et refus de confiance ;
- liste personnelle et administrative paginée ;
- filtres territoriaux ;
- modal de step-up puis rejeu explicite de l’action ;
- affichage des seuls onglets/scopes autorisés ;
- navigateur partagé et révocation courante ;
- responsive et états chargement/erreur/vide.

### Sécurité

- CSRF/SameSite, XSS et absence d’accès JS au cookie ;
- vol/rejeu du cookie, rotation concurrente ;
- brute force/rate limit ;
- changement d’IP sans confiance fondée sur l’IP ;
- multi-fuseaux et proximité de changement de jour ;
- absence de secrets dans audit, notifications et traces.

## 19. Décisions métier à confirmer

1. Qui peut activer globalement la confiance appareil et quel plafond maximal immuable retenir ?
2. Durée par défaut : 7 jours confirmés ; plafond proposé : 30 jours à valider.
3. La confiance doit-elle être interdite sur certains postes/réseaux ou pour le Super Administrateur ?
4. Le Super Administrateur peut-il utiliser un appareil de confiance pour la connexion, tout en conservant le step-up obligatoire pour l’administration ?
5. Quelles opérations exactes exigent le step-up (politiques, reset, paramètres, révocation tierce, rôles, finances sensibles) ?
6. Le step-up exige-t-il toujours mot de passe + TOTP lorsque le facteur est actif, ou TOTP seul après session connectée ? La recommandation de sécurité est les deux pour les paramètres globaux/reset privilégié.
7. Durée de conservation des appareils expirés/révoqués et de leurs métadonnées d’audit.
8. Affichage autorisé des IP et User-Agent selon les règles de confidentialité internes.
9. Faut-il révoquer tous les appareils lors d’un changement de politique de rôle, ou seulement lors du reset/changement de mot de passe/désactivation ?
10. L’accès au centre doit-il être une route autonome afin d’éviter la dépendance actuelle à `roles.view` ? Recommandation : oui.

## 20. Verdict et prérequis avant implémentation

L’évolution est compatible avec l’architecture existante et ne nécessite ni service externe ni nouvelle dépendance majeure. Le RBAC central, les prédicats territoriaux, la table `settings`, l’audit et les notifications sont réutilisables.

Avant toute implémentation, il faut valider :

1. la matrice de permissions/scopes ;
2. les décisions métier de la section 19 ;
3. le modèle de step-up ;
4. la politique de durée/révocation des appareils ;
5. la reproduction instrumentée du refus d’authentification récente et la stratégie UTC.

Aucune implémentation, migration, modification de données, politique, session, Docker ou permission n’a été effectuée pendant cet audit.
