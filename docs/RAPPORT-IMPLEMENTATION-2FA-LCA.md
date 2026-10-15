# Rapport d’implémentation 2FA — ERP LCA

Date de qualification : 15 octobre 2026  
Statut : code préparé et compilable ; migration non appliquée ; recette MySQL/Docker restant à exécuter dans un environnement isolé.

## 1. Architecture existante auditée

Le parcours initial validait le mot de passe puis créait immédiatement une paire JWT dans `auth.service.ts`. Le refresh token est rotatif et lié à une ligne `refresh_tokens`; le middleware `authenticate` relit la session, l’utilisateur actif et le contexte RBAC à chaque requête. Les permissions sont stockées dans le référentiel `permissions`/`role_permissions`, les scopes effectifs sont `OWN`, `AGENCY`, `CONCESSION` et `GLOBAL`, et les contrôles territoriaux existants sont centralisés dans `user-access.ts`. L’audit et les notifications existants ont été réutilisés.

Le dernier numéro de migration disponible était 086. La migration additive préparée est donc 087.

## 2. Architecture 2FA retenue

Le mot de passe reste le premier facteur. Si le 2FA est actif ou obligatoire, aucun access token ni refresh token n’est émis. Le serveur crée un challenge opaque UUID, court, à usage unique, lié à l’utilisateur et au hash du couple IP/User-Agent. Ce challenge ne possède aucun droit API.

Deux finalités sont séparées :

- `LOGIN_VERIFY` pour la validation TOTP ou récupération ;
- `LOGIN_SETUP` pour l’enrôlement obligatoire.

Les challenges expirent par défaut après 300 secondes. Leur consommation et la validation du facteur sont transactionnelles. Après validation complète seulement, le service émet les JWT habituels dans une nouvelle session marquée `two_factor_verified_at`.

## 3. Permissions et intégration RBAC

La migration ajoute au référentiel existant :

- `auth.2fa.view` : état personnel, scope `OWN` ;
- `auth.2fa.manage` : gestion personnelle, scope `OWN` ;
- `auth.2fa.users.view` : consultation administrative ;
- `auth.2fa.users.enforce` : obligation individuelle ;
- `auth.2fa.users.reset` : réinitialisation administrative ;
- `auth.2fa.policy.manage` : politiques globales de rôles.

Aucun rôle métier n’est créé. Seul le rôle système authentique `SUPER_ADMIN` reçoit initialement ces permissions ; elles restent ensuite administrables par le RBAC dynamique. La politique de scopes interdit un scope collectif sur les permissions personnelles et réserve les politiques de rôles au scope `GLOBAL`.

Les opérations utilisateur réutilisent `assertCanViewTargetActor` et `assertCanManage`, donc les frontières `AGENCY`, `CONCESSION` et `GLOBAL` existantes. Un scope territorial ne peut pas modifier une politique globale de rôle.

## 4. Parcours utilisateur

### Connexion

1. Validation email/mot de passe et rôle actif.
2. Calcul serveur de l’obligation : Super Admin système OU obligation individuelle OU politique d’au moins un rôle réellement attribué.
3. Sans obligation/facteur : connexion historique.
4. Facteur actif : challenge TOTP/récupération.
5. Obligation sans facteur : challenge d’enrôlement, QR, clé manuelle, premier TOTP et codes de récupération.
6. Émission des JWT après succès seulement.

### Configuration personnelle

La page de compte ouverte depuis l’en-tête expose le statut, l’obligation, la date d’activation, le QR et la clé manuelle. La préparation expire après 600 secondes et n’active rien avant confirmation TOTP. La création personnelle, la désactivation et la régénération exigent une session authentifiée depuis moins de dix minutes ; la désactivation/régénération exigent aussi le TOTP actif.

Les codes en clair sont affichés uniquement après génération, avec copie, téléchargement et confirmation avant accès à l’ERP dans l’enrôlement obligatoire.

## 5. Administration et politiques

L’administration des utilisateurs affiche l’état 2FA et propose, selon permission et périmètre : obligation/retrait individuel et reset motivé. Le reset exige une authentification renforcée de l’administrateur, efface facteur et codes, révoque toutes les sessions de la cible, produit audit et notification, et remet `reset_required` si une obligation demeure.

La gestion des politiques de rôles exige explicitement `auth.2fa.policy.manage=GLOBAL`. Toute politique applicable imposant le 2FA l’emporte. La politique du rôle système Super Admin ne peut pas être désactivée. Un non-Super Admin ne peut pas réinitialiser un compte Super Admin.

Le modèle actuel de l’ERP n’autorise qu’un rôle actif primaire par utilisateur dans son invariant RBAC. La requête 2FA est néanmoins compatible avec plusieurs attributions et applique un OU sur toutes les politiques ; une véritable recette « plusieurs rôles actifs » reste subordonnée à une évolution distincte de cet invariant.

## 6. Protection Super Administrateur

L’identification repose simultanément sur `roles.code='SUPER_ADMIN'`, `is_system=TRUE` et `is_active=TRUE`. L’obligation est calculée dans le backend, indépendamment des permissions attribuées. Elle ne peut être retirée par l’API utilisateur ou par la politique de rôle. Un Super Admin existant sans facteur est dirigé vers l’enrôlement à sa prochaine connexion interactive.

La récupération administrative est un reset motivé réalisé par un autre Super Admin authentifié fortement. Le reset révoque les sessions et impose un nouvel enrôlement.

## 7. Chiffrement et TOTP

Les secrets actifs et en attente sont chiffrés en AES-256-GCM avec IV aléatoire, tag d’authentification, AAD de version et clé fournie par `TWO_FACTOR_ENCRYPTION_KEY`. Une clé fournie mais invalide empêche le démarrage ; une clé absente laisse le serveur démarrer pour permettre la migration contrôlée, mais toute opération nécessitant un secret échoue fermement en 503. Aucun secret réel n’est présent dans le dépôt.

Le TOTP utilise `otplib`, SHA-1, six chiffres, période 30 secondes et une tolérance passée limitée à 30 secondes (aucune anticipation future). `last_accepted_time_step`, lu sous verrou, bloque le rejeu et les doubles validations concurrentes. Les erreurs de déchiffrement ne désactivent jamais silencieusement le facteur.

Rotation de clé : conserver l’ancienne clé le temps d’un outil contrôlé de rechiffrement, écrire les nouvelles enveloppes avec une nouvelle `TWO_FACTOR_KEY_VERSION`, vérifier leur déchiffrement, puis retirer l’ancienne clé. Ce lot stocke la version mais n’implémente pas encore un trousseau multi-clés automatisé.

## 8. Récupération, abus et sessions

Dix codes aléatoires de 80 bits sont générés, affichés une fois et stockés seulement en SHA-256 normalisé. La consommation utilise `SELECT ... FOR UPDATE` puis `used_at=NOW()` dans la même transaction. La régénération supprime tous les anciens codes.

Chaque challenge possède compteur, expiration, contexte, délai exponentiel et plafond configurable. Les routes publiques 2FA partagent en plus les limites IP/identité du login. Les échecs répétés au plafond, les récupérations, activations, désactivations, régénérations, resets et politiques sont audités. Les notifications ne contiennent ni secret, QR, TOTP ni code de récupération.

Le refresh et chaque requête authentifiée recalculent l’obligation et vérifient la session 2FA. Les sessions créées après 087 ne sont jamais grandfathered. Les sessions présentes au moment de la migration reçoivent une grâce bornée (7 jours par défaut, maximum configurable 30 jours) si aucun facteur n’est encore actif ; `authenticated_at` n’est pas repoussé lors du refresh. Une activation personnelle révoque les autres sessions ; un reset administratif les révoque toutes.

## 9. Migration préparée

`087_two_factor_authentication.sql` :

- complète `refresh_tokens` avec authentification récente, validation 2FA et transition ;
- crée `user_two_factor_auth`, `two_factor_recovery_codes`, `two_factor_challenges` et `role_two_factor_policies` ;
- ajoute contraintes, index et clés étrangères vers les utilisateurs/rôles existants ;
- insère les six permissions et les attributions initiales du Super Admin système.

La migration n’a pas été exécutée sur la base métier. Aucun Docker, volume ou conteneur n’a été modifié.

## 10. Tests et résultats

Exécutés avec succès :

- lint backend (`tsc --noEmit`) ;
- build backend (`tsc -p tsconfig.json`) ;
- lint frontend (`tsc --noEmit`) ;
- build frontend Vite, 2 499 modules transformés ;
- test de régression de révocation/rotation de session ;
- suite historique de rate-limit d’authentification : 12/12 réussis ;
- tests ciblés backend : enveloppe AES-GCM et détection d’altération, hash récupération, migration additive, absence de jeton avant facteur, anti-rejeu/backoff/atomicité et protections administratives ;
- tests ciblés frontend : challenge de connexion, QR/clé/codes, confirmation et permissions dynamiques ;
- `git diff --check` ;
- archive officielle inchangée : `7a05ce52ace2033a5beb0b1f8ff967e346f4e63c8c0fe20bf29b91b0500ea3cc`.

Deux tests historiques hors périmètre restent défaillants et l’étaient indépendamment de la logique 2FA : `rbac-core-alignment.test.ts` attend qu’une permission sans scope accepte `NULL`, contrairement à la politique courante qui refuse tout scope nul ; `dynamic-permissions.test.ts` attend une ancienne forme textuelle de `budgetManagementScope` absente du module RH déjà modifié. Les autres tests RBAC ciblés exécutés sont verts.

Non exécutés et donc non déclarés réussis : migration réelle MySQL 8.4, concurrence SQL réelle, navigateur/mobile réel, Docker et recette complète des 48 scénarios. Ces validations exigent une base isolée après autorisation.

## 11. Fichiers 2FA créés ou modifiés

Backend :

- `database/migrations/087_two_factor_authentication.sql` ;
- `src/config/env.ts` ;
- `src/app.ts` ;
- `src/middleware/authenticate.ts` ;
- `src/modules/auth/auth.routes.ts` et `auth.service.ts` ;
- `src/modules/auth/two-factor-crypto.ts` ;
- `src/modules/auth/two-factor.service.ts` ;
- `src/modules/auth/two-factor-admin.routes.ts` et `two-factor-admin.service.ts` ;
- `src/modules/rbac/permission-scope-policy.ts` ;
- `src/modules/users/user.service.ts` ;
- `package.json`, `package-lock.json` ;
- tests `auth-session-revocation.test.ts` et `two-factor-authentication.test.ts`.

Frontend :

- `src/stores/authStore.ts` ;
- `src/modules/auth/LoginPage.tsx` et `TwoFactorSettings.tsx` ;
- `src/api/twoFactorHooks.ts`, `src/api/userHooks.ts` ;
- `src/components/layout/Header.tsx` ;
- `src/modules/users/UsersManagementPage.tsx` et `TwoFactorAdministration.tsx` ;
- test `test/two-factor-authentication.test.ts`.

Les autres modifications non commitées déjà présentes dans le dépôt ont été préservées.

## 12. Configuration nécessaire

Obligatoire avant activation :

```text
TWO_FACTOR_ENCRYPTION_KEY=<32 octets aléatoires encodés en Base64, fournis hors Git>
```

Options :

```text
TWO_FACTOR_KEY_VERSION=v1
TWO_FACTOR_ISSUER=ERP LCA
TWO_FACTOR_CHALLENGE_TTL_SECONDS=300
TWO_FACTOR_SETUP_TTL_SECONDS=600
TWO_FACTOR_MAX_ATTEMPTS=5
TWO_FACTOR_EXISTING_SESSION_GRACE_SECONDS=604800
```

## 13. Procédure de recette isolée

1. Sauvegarder et cloner une base représentative dans MySQL 8.4 isolé.
2. Fournir une clé de test éphémère hors dépôt.
3. Appliquer 087 avec le gestionnaire de migrations existant.
4. Vérifier schéma, contraintes, index et permissions sans modifier la base métier.
5. Exécuter les 36 scénarios backend, dont deux connexions concurrentes sur le même timestep et deux consommations concurrentes du même code.
6. Exécuter les 12 scénarios frontend dans deux navigateurs et un viewport mobile.
7. Inspecter audit, notifications et absence de secrets dans logs, Socket.IO et réponses ordinaires.
8. Tester les scopes avec comptes AGENCY, CONCESSION, GLOBAL et Super Admin distincts.
9. Détruire seulement l’environnement isolé après conservation des preuves.

## 14. Déploiement futur (non exécuté)

Après validation explicite : sauvegarde vérifiée, injection de la clé par gestionnaire de secrets, application contrôlée de 087, déploiement backend puis frontend, healthchecks, test sans 2FA, test Super Admin avec enrôlement, vérification des anciennes sessions pendant la grâce, surveillance des audits/401/429/503 et procédure de rollback applicatif sans supprimer les nouvelles tables ni les données chiffrées.

## 15. Verdict et risques résiduels

L’implémentation est complète au niveau code, RBAC, interfaces et migration préparée. Elle compile et les tests ciblés exécutables dans ce contexte sont verts. Elle n’est pas qualifiée pour déploiement tant que 087 et les scénarios transactionnels n’ont pas été validés sur MySQL 8.4 isolé. Les risques résiduels principaux sont la recette de concurrence réelle, la procédure opérationnelle de clé, la vérification navigateur/mobile et le futur outil automatisé de rotation multi-clés.
