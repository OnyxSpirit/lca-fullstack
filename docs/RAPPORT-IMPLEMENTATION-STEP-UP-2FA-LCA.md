# Rapport d’implémentation — Authentification renforcée (step-up) 2FA

Date : 16 octobre 2026  
Périmètre : lot 1, authentification renforcée liée à la session courante.  
Statut : implémenté et validé statiquement, sans déploiement ni modification de la base métier.

## 1. Cause technique initiale

Le contrôle historique reposait sur `refresh_tokens.authenticated_at`, puis convertissait le `DATETIME` MySQL sans fuseau avec `new Date()`. Avec `dateStrings: true`, cette conversion dépendait du fuseau Node et pouvait diverger du fuseau MySQL. Le refresh JWT conservait par ailleurs le même `sid` sans renouveler `authenticated_at`.

Pour les opérations administratives 2FA, `assertRecentAndStrong()` contrôlait cette ancienneté avant de vérifier le mot de passe ou le TOTP fourni dans le formulaire. Une session de plus de dix minutes ne pouvait donc pas renouveler sa preuve : l’utilisateur devait se reconnecter. Les champs de confirmation affichés par le frontend ne constituaient pas un parcours de step-up autonome.

## 2. Correction apportée

Une preuve distincte est désormais persistée sur la session :

- `strong_auth_at`, horodatage UTC du dernier mot de passe confirmé avec succès ;
- `strong_auth_method`, `PASSWORD` ou `PASSWORD_TOTP` selon l’état du facteur de l’acteur.

Le contrôle de validité est effectué entièrement par MySQL avec `UTC_TIMESTAMP()` et `DATE_SUB(... INTERVAL 600 SECOND)`. Aucune chaîne `DATETIME` n’est interprétée par JavaScript dans ce contrôle. La politique reste fixée à dix minutes pour ce lot.

La connexion initiale crée immédiatement une preuve forte : mot de passe seul si le facteur est inactif, mot de passe et TOTP si la connexion a terminé le challenge 2FA. Un refresh JWT ne renouvelle pas cette preuve.

## 3. Migration additive

Fichier : `backend-node/database/migrations/088_two_factor_strong_authentication.sql`.

La migration ajoute uniquement deux colonnes nullable à `refresh_tokens`. Elle ne reconstruit pas la table, ne supprime aucune session et ne modifie aucun secret TOTP. Les sessions antérieures restent valides pour les opérations ordinaires, mais doivent effectuer un step-up avant une opération sensible.

La migration n’a pas été exécutée sur la base métier dans le cadre de cette mission.

## 4. Endpoint de step-up

`POST /api/auth/2fa/step-up` :

1. exige un JWT et une session courante valides via le middleware existant ;
2. applique un quota propre, indexé par IP et utilisateur authentifié ;
3. vérifie obligatoirement le mot de passe actuel ;
4. vérifie aussi le TOTP si le facteur est actif ;
5. réutilise le verrou et `last_accepted_time_step` du mécanisme anti-rejeu ;
6. met à jour uniquement la ligne identifiée par le `sid` et l’utilisateur courants, si elle n’est ni révoquée ni expirée ;
7. journalise le succès ou l’échec sans mot de passe, TOTP, secret ou jeton.

L’endpoint ne dépend pas de l’âge de la preuve précédente. Il reste donc utilisable après expiration du délai de dix minutes.

## 5. Opérations sensibles

Les opérations administratives 2FA déjà protégées exigent maintenant une preuve `strong_auth_at` valide en plus de leurs contrôles existants :

- imposer ou retirer l’obligation individuelle ;
- réinitialiser le facteur d’un utilisateur ;
- modifier une politique 2FA de rôle.

Les permissions RBAC, scopes territoriaux, contrôles de cible et protections du Super Administrateur système sont exécutés et conservés. Un step-up réussi n’accorde aucune permission supplémentaire.

Le frontend intercepte exclusivement l’erreur structurée `STRONG_AUTH_REQUIRED`, ouvre une fenêtre de confirmation dédiée, demande le mot de passe et un TOTP facultatif selon le compte, gère l’attente, l’erreur et l’annulation. Après succès, la mutation initiale n’est jamais rejouée : un message demande à l’utilisateur de relancer explicitement l’action.

## 6. Fichiers modifiés

- `backend-node/database/migrations/088_two_factor_strong_authentication.sql` ;
- `backend-node/src/modules/auth/auth-rate-limit.ts` ;
- `backend-node/src/modules/auth/auth.routes.ts` ;
- `backend-node/src/modules/auth/auth.service.ts` ;
- `backend-node/src/modules/auth/two-factor.service.ts` ;
- `backend-node/src/modules/auth/two-factor-admin.routes.ts` ;
- `backend-node/src/modules/auth/two-factor-admin.service.ts` ;
- `backend-node/test/auth-rate-limit.test.ts` ;
- `backend-node/test/strong-authentication.test.ts` ;
- `backend-node/test/two-factor-authentication.test.ts` ;
- `frontend/src/api/twoFactorHooks.ts` ;
- `frontend/src/modules/auth/StrongAuthenticationModal.tsx` ;
- `frontend/src/modules/users/TwoFactorAdministration.tsx` ;
- `frontend/test/two-factor-authentication.test.ts`.

## 7. Tests et résultats

| Validation | Résultat |
|---|---|
| TypeScript/lint backend (`npm run lint`) | Réussi |
| Build backend (`npm run build`) | Réussi |
| Tests ciblés backend step-up et 2FA | Réussis |
| Rate limiting, 13 scénarios dont quota step-up | 13/13 réussis |
| TypeScript/lint frontend (`npm run lint`) | Réussi |
| Build frontend (`npm run build`) | Réussi |
| Test frontend 2FA/step-up | Réussi |
| `git diff --check` | Réussi |

La couverture ajoutée vérifie les bornes immédiate, 9 min 59 s et au-delà de dix minutes, le renouvellement après expiration, le mauvais mot de passe, la session révoquée, l’isolation de deux sessions, le contrôle UTC côté MySQL, la présence du chemin TOTP anti-rejeu, le quota, la conservation du RBAC/Super Admin et l’absence de rejeu automatique frontend. Les tests 2FA existants continuent de couvrir le rejet TOTP et l’anti-rejeu.

Le test HTTP du limiteur requiert l’ouverture d’un port local éphémère par Supertest. Il a été exécuté dans le contexte local autorisé après constat que le bac à sable standard refusait cette ouverture (`EPERM`) ; aucune connexion distante, base ou ressource Docker n’a été utilisée.

## 8. Risques résiduels et limites

- La migration 088 doit être validée sur une base MySQL 8.4 isolée avant tout environnement réel ; elle n’a volontairement pas été appliquée ici.
- Une recette navigateur réelle reste nécessaire après application autorisée de la migration et reconstruction contrôlée des services.
- La durée de dix minutes est volontairement une constante pour le lot 1 ; sa configuration dynamique appartient au lot 2.
- Les opérations personnelles existantes de désactivation/régénération conservent leur contrôle actuel afin de ne pas modifier hors périmètre leur séquence TOTP et anti-rejeu.
- Aucun appareil de confiance ni centre de sécurité n’a été ajouté.

## 9. Étapes sûres avant déploiement

1. Sauvegarder et vérifier la restauration de l’environnement cible.
2. Valider la migration 088 sur une copie MySQL 8.4 isolée, notamment avec des sessions existantes.
3. Appliquer la migration via le gestionnaire normal, sans marquage manuel.
4. Reconstruire ensuite backend et frontend dans une fenêtre contrôlée.
5. Vérifier une connexion sans 2FA et une connexion avec 2FA.
6. Vérifier expiration à dix minutes, step-up, TOTP erroné/rejoué, refresh JWT et isolation de deux sessions.
7. Vérifier les trois opérations administratives avec un acteur autorisé puis avec un acteur RBAC insuffisant.
8. Confirmer l’absence de secrets dans les logs et audits.

## 10. Verdict

Le blocage architectural est corrigé dans le code : une session peut maintenant renouveler explicitement sa preuve forte sans se déconnecter, cette preuve est liée au `sid`, comparée en UTC côté MySQL et n’affaiblit ni le RBAC ni les protections 2FA existantes. Le lot est prêt pour une validation MySQL isolée puis une recette contrôlée ; il n’est pas déployé.
