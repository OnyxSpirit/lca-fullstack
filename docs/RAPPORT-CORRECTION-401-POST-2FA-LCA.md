# Rapport de correction des HTTP 401 après validation 2FA — ERP LCA

Date : 15 octobre 2026

## Cause exacte

Le backend termine correctement l’enrôlement : le facteur du Super Administrateur est actif, son enveloppe chiffrée est complète, le secret temporaire est effacé, `reset_required=0`, les challenges `LOGIN_SETUP` sont consommés et une session non révoquée possède `two_factor_verified_at`.

La réponse de `POST /api/auth/2fa/challenge/confirm` contient bien :

- `status: "authenticated"` ;
- un access token ;
- un refresh token ;
- le profil et les permissions ;
- les codes de récupération affichables une seule fois.

La session backend utilise le même `sessionId` dans le claim `sid` de l’access token et dans `refresh_tokens.id`. Elle est insérée avant le retour HTTP avec `two_factor_verified_at=NOW()` et `two_factor_grandfathered=FALSE`. Le middleware relit cette session et l’obligation 2FA ; aucune correction backend n’est nécessaire.

Le défaut se trouvait dans la finalisation frontend. La réponse authentifiée était décomposée en plusieurs effets indépendants : écriture des deux JWT, écriture du profil, mise à jour partielle du store, affichage des codes, puis bascule ultérieure de `isAuthenticated`. Le lancement concurrent de `AppBootstrap`, des hooks du layout et du refresh pouvait ainsi observer une frontière de session incohérente ou une ancienne session. Les requêtes protégées partaient alors avec un jeton absent/ancien, recevaient 401, et le refresh utilisait le même snapshot invalide.

Les journaux Docker conservés confirment le démarrage sain du backend mais ne journalisent pas le corps des anciennes réponses 401. Le message historique exact de `/auth/me` n'est donc pas récupérable sans reproduire une connexion réelle. Le code permet de distinguer : `Jeton manquant`, `Jeton invalide ou expiré`, `Compte désactivé ou introuvable` ou `TWO_FACTOR_AUTHENTICATION_REQUIRED`. L'état lu en base exclut les deux derniers pour la session 2FA confirmée ; la correction cible les deux premiers cas liés au snapshot frontend. Cette limite probatoire est conservée explicitement, sans attribuer artificiellement un message non capturé.

La correction précédente sur les 403 reste valide : un refus métier ne détruit plus la session. La présente correction traite le défaut distinct des 401 en supprimant toute publication partielle de la nouvelle session.

## Correction appliquée

`authStore.ts` conserve désormais la réponse post-enrôlement dans un état mémoire privé `pendingAuthenticatedSession` pendant l’affichage des codes de récupération. Aucun composant métier ne reçoit encore l’état authentifié et aucun JWT partiel n’est publié dans `localStorage`.

Au clic « Accéder à l’ERP », une seule opération synchrone :

1. marque la frontière de session ;
2. vide les caches de l’ancien contexte ;
3. écrit l’access token ;
4. écrit le refresh token ;
5. écrit le profil ;
6. installe utilisateur et agence dans le store ;
7. bascule `isAuthenticated=true` ;
8. détruit l’état temporaire.

Le tableau de bord et ses hooks ne peuvent donc démarrer qu’après disponibilité simultanée des deux JWT et du profil. Annulation et logout détruisent également l’état temporaire.

Si le navigateur est rechargé avant l’acquittement des codes, aucun JWT n’est conservé. Le facteur reste correctement actif côté serveur et la connexion suivante utilise `LOGIN_VERIFY`, sans nouveau QR.

## Fichiers modifiés pour cette correction

- `frontend/src/stores/authStore.ts` ;
- `frontend/src/services/apiClient.ts` (correction 403 conservée) ;
- `frontend/test/api-client-single-flight.test.ts` ;
- `frontend/test/app-bootstrap-refresh-race.behavior.test.ts` ;
- `frontend/test/two-factor-authentication.test.ts` ;
- `backend-node/test/two-factor-authentication.test.ts` ;
- `docs/RAPPORT-CORRECTION-401-POST-2FA-LCA.md`.

## Tests exécutés

Frontend :

- confirmation 2FA : aucun JWT publié avant l’acquittement ;
- finalisation : access token, refresh token et profil présents avant `isAuthenticated=true` ;
- appels `/auth/me` et `/users/directory` après finalisation portant tous deux le nouveau Bearer ;
- bootstrap après 2FA ;
- `/auth/me` refusé en 403 sans logout ;
- 401 définitif avec logout ;
- refresh single-flight et rafales concurrentes ;
- rotation du refresh token ;
- protection contre réponses d’une ancienne session ;
- changement d’agence pendant refresh ;
- lint TypeScript ;
- build Vite : 2 499 modules ;
- tests RBAC d’interface ciblés.

Backend :

- émission après `confirmChallengeSetup` via `issueTokens(..., true)` ;
- présence des colonnes de validation de session ;
- absence d’émission avant second facteur ;
- anti-rejeu, challenge, récupération et chiffrement ;
- révocation/rotation des sessions ;
- RBAC dynamique ciblé ;
- lint et build TypeScript.

Tous ces tests sont réussis. `git diff --check` est réussi.

## État de la migration et sécurité

La migration 087 est présente. Les tables, colonnes et permissions 2FA attendues existent. Aucune migration, écriture MySQL, modification de facteur, lecture de secret, reconstruction ou redémarrage Docker n’a été effectué.

Les protections JWT, le claim de session, `two_factor_verified_at`, la révocation, l’anti-rejeu TOTP, le single-flight et le RBAC restent actifs.

## Limites

Le code corrigé n’est pas chargé dans le conteneur frontend actif, conformément à l’interdiction de reconstruction/redémarrage. La séquence navigateur réelle ne peut donc être requalifiée sur le conteneur tant que sa mise à jour n’est pas explicitement autorisée.

## Procédure de recette navigateur après mise à jour autorisée

1. Ouvrir une fenêtre privée sur `http://127.0.0.1`.
2. Se connecter avec le Super Administrateur.
3. Le facteur étant déjà actif, vérifier que l’écran demande un TOTP (`LOGIN_VERIFY`) et aucun QR.
4. Entrer un TOTP valide.
5. Vérifier `GET /api/auth/me` en 200, puis le chargement du dashboard.
6. Vérifier les routes autorisées et les refus 403 sans déconnexion.
7. Actualiser la page : session maintenue.
8. Attendre ou simuler l’expiration de l’access token : un seul refresh, rotation réussie et session maintenue.
9. Se déconnecter volontairement : session révoquée et retour login.
10. Se reconnecter : `LOGIN_VERIFY` uniquement.
11. Vérifier qu’un TOTP incorrect, expiré ou rejoué ne délivre aucun JWT.

## Actions restantes

Après autorisation explicite : mettre à jour uniquement le frontend local avec la configuration Compose existante, sans toucher à MySQL, puis exécuter la recette ci-dessus et collecter les statuts HTTP. Aucun déploiement distant n’est nécessaire pour cette qualification locale.
