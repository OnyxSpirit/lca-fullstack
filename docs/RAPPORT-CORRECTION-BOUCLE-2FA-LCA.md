# Rapport de correction de la boucle d’authentification 2FA — ERP LCA

Date : 15 octobre 2026

## 1. Cause exacte et étape défaillante

Le parcours backend d’enrôlement n’est pas en échec. Les contrôles MySQL strictement en lecture montrent, pour le Super Administrateur :

- une ligne 2FA présente ;
- `enabled_at` renseigné ;
- l’enveloppe du secret actif complète, sans lecture de son contenu ;
- aucun secret en attente ;
- `reset_required=0` ;
- six challenges `LOGIN_SETUP`, tous consommés et aucun encore actif ;
- une session non révoquée et non expirée avec `two_factor_verified_at` renseigné.

La transition `LOGIN_SETUP → activation → challenge consommé → session vérifiée` a donc abouti. Cela explique également pourquoi aucune correction SQL, aucun reset et aucune nouvelle migration ne sont nécessaires.

La défaillance était située après l’émission des JWT, lors du bootstrap frontend. `isDefinitiveAuthenticationFailure()` classait indifféremment les HTTP 401 et 403 comme une expiration de session. `AppBootstrap` appelait alors `logout()`, supprimait les JWT et le profil local, puis `ProtectedLayout` redirigeait vers `/login`.

Cette interprétation est incorrecte :

- 401 : session absente, invalide ou expirée ;
- 403 : session authentifiée, mais autorisation métier insuffisante.

Un 403 sur la synchronisation initiale des permissions pouvait donc détruire une session 2FA parfaitement valide. Le frontend revenait à la connexion alors que le backend avait correctement persisté le facteur.

## 2. Parcours audité

Le parcours réel est désormais :

1. `/auth/login` valide email et mot de passe.
2. Le Super Administrateur non enrôlé reçoit un challenge `LOGIN_SETUP`, sans JWT.
3. `/auth/2fa/challenge/setup` crée un secret temporaire chiffré et un QR.
4. `/auth/2fa/challenge/confirm` verrouille challenge et facteur dans une transaction.
5. Le TOTP est validé avec anti-rejeu.
6. Le secret temporaire devient actif, les champs temporaires sont effacés, les codes de récupération sont hachés et le challenge est consommé.
7. Les JWT sont émis et une session avec `two_factor_verified_at` est créée.
8. Le frontend stocke jetons et profil, puis n’ouvre l’ERP qu’après confirmation de conservation des codes.
9. Le bootstrap recharge `/auth/me` et conserve désormais la session sur un 403 métier.
10. Une connexion suivante calcule `enabled=true` et utilise `LOGIN_VERIFY`, jamais un nouveau QR sauf reset explicite.

## 3. Correction appliquée

Dans `frontend/src/services/apiClient.ts` :

- seul un HTTP 401 est une défaillance d’authentification définitive ;
- un HTTP 403 ne déclenche plus `terminateSession()` ;
- la logique de refresh, le single-flight, la protection contre les anciennes réponses et les contrôles de changement de session restent inchangés.

Aucun contrôle backend, TOTP, JWT, RBAC, AES-GCM ou anti-rejeu n’a été affaibli.

## 4. Tests ajoutés ou adaptés

- vérification directe : 401 définitif, 403 non définitif ;
- refresh refusé en 403 : erreur conservée, aucun événement `session-expired`, jetons conservés ;
- bootstrap `/auth/me` en 403 : aucun logout, session 2FA et jetons conservés ;
- contrat statique 2FA : aucun couple `401 || 403` dans la classification d’expiration ;
- fixture historique login adaptée au nouveau discriminant `status:'authenticated'`.

Résultats :

- lint frontend : réussi ;
- build frontend : réussi, 2 499 modules transformés ;
- tests frontend ciblés `api-client-single-flight`, `app-bootstrap-refresh-race` et `two-factor-authentication` : réussis ;
- lint et build backend : réussis ;
- tests backend 2FA, sessions et RBAC ciblés : réussis ;
- `git diff --check` : réussi.

## 5. État migration et données

La migration 087 est présente dans `schema_migrations`. Les quatre tables, trois colonnes de session et six permissions 2FA existent. Aucune migration et aucune écriture SQL n’ont été exécutées. Le facteur existant n’a pas été lu, supprimé ou réinitialisé.

## 6. Fichiers concernés

- `frontend/src/services/apiClient.ts` ;
- `frontend/test/api-client-single-flight.test.ts` ;
- `frontend/test/app-bootstrap-refresh-race.behavior.test.ts` ;
- `frontend/test/two-factor-authentication.test.ts` ;
- `docs/RAPPORT-CORRECTION-BOUCLE-2FA-LCA.md`.

Les modifications antérieures non commitées ont été préservées.

## 7. Limites

La correction n’a pas été reconstruite dans Docker conformément à la mission. Le navigateur actuellement disponible sur le poste pointait vers un environnement de développement distinct sur le port 4176 et un autre compte ; il n’a pas été utilisé pour manipuler ou transférer les jetons du Super Administrateur. La recette du conteneur cible nécessite donc une autorisation ultérieure de mise à jour du frontend.

## 8. Recette navigateur à effectuer après mise à jour autorisée

1. Ouvrir une fenêtre privée sur l’URL cible.
2. Se connecter avec le Super Administrateur.
3. Si le facteur est déjà actif, vérifier que seul le code TOTP est demandé et qu’aucun QR n’apparaît.
4. Saisir un TOTP valide puis ouvrir le tableau de bord.
5. Actualiser la page et confirmer le maintien de la session.
6. Ouvrir une route interdite ou provoquer un 403 de recette : la page d’accès refusé doit apparaître sans retour au login.
7. Vérifier `/auth/me` et une route protégée autorisée.
8. Se déconnecter volontairement puis se reconnecter : parcours `LOGIN_VERIFY` uniquement.
9. Vérifier qu’un TOTP faux, expiré ou rejoué est refusé sans nouvelle émission de JWT.
10. Contrôler que le challenge consommé ne peut pas être réutilisé.

## 9. Actions restantes

Après autorisation explicite seulement : reconstruire ou mettre à jour le frontend cible, puis exécuter la recette ci-dessus. Aucun redémarrage, build Docker ou déploiement n’a été effectué pendant cette mission.
