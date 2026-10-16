# Rapport d'audit complet JWT + 2FA — ERP LCA

Date : 16 octobre 2026  
Verdict : **VALIDÉ AVEC RÉSERVES**

## 1. Résumé exécutif

Le défaut a été reproduit sur une pile Docker isolée utilisant MySQL 8.4, le backend Express compilé, le frontend Vite/Nginx compilé et un Super Administrateur éphémère. Avant correction, `POST /api/auth/2fa/challenge/confirm` répondait 200 et créait une session active, non expirée et marquée `two_factor_verified_at`, mais le premier `GET /api/auth/me` répondait 401 avec `TWO_FACTOR_AUTHENTICATION_REQUIRED`.

La cause réelle était la conversion de booléens SQL dans `requirement()`. Le pool MySQL active `supportBigNumbers` et `bigNumberStrings`. Les expressions `EXISTS(...)` et `COALESCE(..., FALSE)` pouvaient donc être renvoyées sous forme de chaînes `"0"` ou `"1"`. Or `Boolean("0") === true`. La valeur réelle `reset_required=0` était interprétée comme vraie, ce qui forçait `enabled=false` et faisait rejeter toute session 2FA valide.

La correction normalise ces valeurs avec `Number(value) === 1`. Le scénario auparavant défaillant passe ensuite par API réelle et par Chromium headless réel.

## 2. Architecture vérifiée

- mot de passe puis challenge opaque `LOGIN_SETUP` ou `LOGIN_VERIFY` ;
- aucun JWT avant validation du second facteur ;
- access JWT signé avec `JWT_ACCESS_SECRET`, refresh JWT signé séparément ;
- claim `sid` commun aux deux JWT et à `refresh_tokens.id` ;
- session relue par `authenticate`, puis contrôlée par `assertSessionCurrent` ;
- refresh rotatif lié au hash du token et à la même session ;
- RBAC dynamique recalculé depuis MySQL ;
- stockage frontend dans `localStorage`, refresh single-flight et frontière de session ;
- Nginx transmet `/api` au backend et conserve `Authorization` ;
- publication post-enrôlement différée jusqu'à l'acquittement des codes de récupération.

Les routes réelles sont `/api/auth/2fa/verify` et `/api/auth/2fa/challenge/confirm`; il n'existe pas de route `/api/auth/2fa/challenge/verify`.

## 3. Preuves du diagnostic

### Avant correction

Le test d'intégration réel a observé :

1. login : 200, `two_factor_setup_required`, aucun JWT ;
2. préparation : 200 ;
3. confirmation TOTP : 200, statut `authenticated`, access et refresh présents ;
4. access et refresh portaient le même `sid` ;
5. ligne MySQL correspondante active, non expirée et `two_factor_verified_at` non nul ;
6. facteur actif, `reset_required=0` ;
7. `/api/auth/me` : 401 `TWO_FACTOR_AUTHENTICATION_REQUIRED`.

L'appel direct au service dans le conteneur a démontré la conversion fautive :

- ligne réelle : `reset_required` numérique 0 ;
- résultat de l'expression SQL : chaîne `"0"` ;
- ancien calcul : `resetRequired=true`, `enabled=false` ;
- décision : `TWO_FACTOR_AUTHENTICATION_REQUIRED`.

Nginx a également été testé avec un Bearer factice : le backend a répondu `Jeton invalide ou expiré`, ce qui prouve que l'en-tête `Authorization` était transmis. Le bundle actif contenait les corrections frontend précédentes. Les pistes « ancien frontend », Bearer supprimé, JWT expiré, `sid` divergent ou session révoquée ont donc été écartées.

## 4. Correction

Dans `backend-node/src/modules/auth/two-factor.service.ts` :

- conversion explicite des indicateurs SQL avec `Number(value) === 1` ;
- calcul de `enabled` à partir de `enabled_at` et de la valeur normalisée de `reset_required` ;
- aucune modification des signatures JWT, durées, permissions, règles Super Admin, anti-rejeu, révocation ou migration.

## 5. Environnement isolé

Projet Docker temporaire : `lca-auth-e2e`.

- MySQL 8.4 et volume propres ;
- backend et frontend construits depuis le code courant ;
- port HTTP isolé 18081 ;
- secrets JWT, clé 2FA et mot de passe de test éphémères ;
- compte Super Administrateur créé uniquement dans la base temporaire ;
- migration 087 appliquée uniquement dans cette base ;
- aucun accès ou changement dans la base métier.

## 6. Tests d'intégration API réels

`backend-node/test/auth-2fa-live-integration.mjs` a exécuté 36 échanges HTTP réels :

- login et challenge d'enrôlement ;
- absence de JWT avant le TOTP ;
- activation et émission des deux JWT ;
- cohérence du `sid` ;
- `/auth/me` et `/users/directory` en 200 ;
- huit requêtes protégées concurrentes en 200 ;
- rotation du refresh en 200 ;
- ancien refresh refusé en 401 ;
- JWT invalide refusé en 401 ;
- logout en 200 et refresh révoqué refusé ;
- reconnexion en `LOGIN_VERIFY`, sans QR ;
- TOTP incorrect et expiré refusés ;
- TOTP valide accepté ;
- rejeu du même pas de temps refusé ;
- huit refresh concurrents : un seul succès, sept refus ;
- session gagnante reconnue puis révoquée volontairement.

Résultat : **PASS, 36 échanges**.

## 7. Recette Chromium réelle

`backend-node/test/auth-2fa-browser-e2e.mjs` pilote Chromium headless via le protocole DevTools, contre le build Nginx réel :

- saisie réelle du formulaire login ;
- affichage de l'enrôlement et génération TOTP ;
- vérification qu'aucun JWT n'est publié avant acquittement des codes ;
- ouverture du dashboard ;
- `/auth/me` 200 et annuaire 200 depuis le navigateur ;
- rechargement avec maintien de session ;
- navigation vers `/users` sans boucle login/dashboard ;
- logout réel ;
- reconnexion `LOGIN_VERIFY` sans nouveau QR ;
- `/auth/me` 200 après reconnexion.

Résultat : **PASS**.

## 8. Tests automatisés et builds

- lint backend : réussi ;
- build backend : réussi ;
- tests backend 2FA, sessions, RBAC dynamique et runtime RBAC : 4 fichiers réussis ;
- lint frontend : réussi ;
- build frontend : réussi, 2 499 modules ;
- tests frontend apiClient, bootstrap, 2FA et scopes RBAC : 4 fichiers réussis ;
- `git diff --check` : réussi ;
- archive officielle intacte : `7a05ce52ace2033a5beb0b1f8ff967e346f4e63c8c0fe20bf29b91b0500ea3cc`.

## 9. Sécurité et non-régression

- aucun secret, JWT, TOTP ou code de récupération journalisé ;
- aucun bypass Super Admin ;
- `authenticate`, RBAC, chiffrement AES-GCM, anti-rejeu et révocation conservés ;
- 403 toujours distinct d'un 401 ;
- single-flight et protection contre les anciennes réponses conservés ;
- aucune migration ou écriture dans MySQL métier ;
- aucun changement dans les conteneurs métier ;
- aucun commit, push ou changement de branche.

## 10. Fichiers modifiés

- `backend-node/src/modules/auth/two-factor.service.ts` ;
- `backend-node/test/two-factor-authentication.test.ts` ;
- `backend-node/test/auth-2fa-live-integration.mjs` ;
- `backend-node/test/auth-2fa-browser-e2e.mjs` ;
- `docs/RAPPORT-AUDIT-COMPLET-AUTH-2FA-LCA.md`.

## 11. Limites et actions restantes

La correction a été pleinement validée dans la pile isolée, mais elle n'a pas été reconstruite dans le backend métier actif, conformément à l'interdiction de reconstruire ou redémarrer les conteneurs existants. L'environnement utilisateur continuera donc à présenter le défaut jusqu'à une mise à jour explicitement autorisée.

Action restante : reconstruire uniquement le backend local métier avec la configuration Compose existante, sans modifier MySQL ni les volumes, puis rejouer login, `LOGIN_VERIFY`, dashboard, refresh et logout sur `http://127.0.0.1`.

**VALIDATION AUTOMATISÉE ET RECETTE NAVIGATEUR ISOLÉE EFFECTUÉES, RECETTE NAVIGATEUR UTILISATEUR EN ATTENTE APRÈS MISE À JOUR DU BACKEND.**

