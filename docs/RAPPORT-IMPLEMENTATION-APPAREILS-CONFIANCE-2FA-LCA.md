# Rapport d’implémentation — Appareils de confiance 2FA

Date : 16 octobre 2026  
Périmètre : lot 3, création et consommation des preuves d’appareil lors de la connexion.  
Statut : code implémenté et validé sans migration ni déploiement.

## 1. Fichiers modifiés

- `backend-node/database/migrations/090_two_factor_trusted_devices.sql` ;
- `backend-node/src/modules/auth/trusted-device.service.ts` ;
- `backend-node/src/modules/auth/auth.service.ts` ;
- `backend-node/src/modules/auth/auth.routes.ts` ;
- `backend-node/src/modules/auth/two-factor.service.ts` ;
- `backend-node/src/modules/auth/two-factor-admin.service.ts` ;
- `backend-node/src/modules/users/user.service.ts` ;
- `backend-node/test/trusted-devices.test.ts` ;
- `backend-node/test/two-factor-authentication.test.ts` ;
- `frontend/src/services/apiClient.ts` ;
- `frontend/src/stores/authStore.ts` ;
- `frontend/src/modules/auth/LoginPage.tsx` ;
- `frontend/test/trusted-devices.test.ts`.

Les modifications non commitées des lots 1 et 2 sont préservées.

## 2. Migration additive 090

La table `two_factor_trusted_devices` contient : identifiant numérique, utilisateur, hash unique du jeton, nom facultatif, résumé et hash du User-Agent, IP de création/dernière utilisation, création, dernière utilisation, expiration absolue, révocation, auteur/motif de révocation et compteur de rotations.

Elle possède un index unique sur le hash, des index utilisateur/état et expiration, ainsi que des clés étrangères vers l’utilisateur et l’auteur de révocation. Aucun appareil historique n’est créé. Les migrations 088, 089 et 090 n’ont pas été appliquées.

## 3. Cookie et jeton

- jeton opaque généré par `randomBytes(32)`, soit 256 bits ;
- encodage Base64URL ;
- seul le SHA-256 est conservé en base ;
- cookie `lca_trusted_device` avec `HttpOnly`, `SameSite=Strict`, `Secure` en production et `Path=/api/auth` ;
- cookie inclus par le client HTTP avec `credentials: include` ;
- aucune lecture JavaScript, aucun stockage local/session, aucun retour JSON du jeton ;
- l’origine doit correspondre au frontend configuré et le contexte Fetch doit être same-site/same-origin.

Une preuve invalide est traitée comme absente, sans révéler son état. Après un mot de passe correct, le cookie invalide est expiré par le serveur.

## 4. Cycle de vie

La confiance est créée uniquement après un TOTP valide, lorsque l’utilisateur a explicitement coché l’option et que la fonctionnalité globale est active. Elle n’est jamais créée après mot de passe seul ou code de récupération.

La durée est calculée côté serveur avec le minimum entre durée demandée, plafond configuré et plafond absolu de 30 jours. L’expiration est inscrite avec `UTC_TIMESTAMP()` et n’est jamais repoussée.

À chaque utilisation valide, la ligne est verrouillée `FOR UPDATE`, un nouveau jeton aléatoire est généré, le hash est remplacé atomiquement, la dernière utilisation est enregistrée et le compteur est incrémenté. Deux utilisations concurrentes du même ancien jeton ne peuvent donc pas toutes deux réussir : la première tourne la preuve, la suivante poursuit avec le challenge TOTP normal.

## 5. Parcours de connexion

1. Validation stricte des identifiants.
2. Lecture de l’utilisateur et vérification du mot de passe.
3. Contrôle du compte actif et des rôles.
4. Résolution de la politique 2FA effective, y compris l’invariant Super Admin système.
5. Si le facteur est actif, vérification éventuelle du cookie.
6. Cookie valide : rotation et émission de la session.
7. Cookie absent, inconnu, expiré, révoqué ou consommé : challenge TOTP inchangé.

Aucun JWT n’est émis avant le mot de passe et la preuve complémentaire requise. Une session issue d’un appareil est marquée `two_factor_verified_at`, mais reçoit `strong_auth_at=NULL` et `strong_auth_method=NULL`. L’appareil ne satisfait donc jamais le step-up.

Le refresh JWT ne consulte, ne crée et ne renouvelle aucun appareil.

## 6. Frontend

L’option « Faire confiance à cet appareil » :

- est décochée par défaut ;
- apparaît uniquement si le serveur annonce la fonctionnalité active ;
- disparaît pendant l’utilisation d’un code de récupération ;
- est disponible après le premier TOTP d’enrôlement ;
- rappelle la durée effective et que le mot de passe restera nécessaire.

Aucune liste ou administration d’appareils n’a été ajoutée, conformément au périmètre du lot 3.

## 7. Révocations automatiques

Les appareils actifs sont révoqués de manière persistante et transactionnelle lors de :

- changement du mot de passe personnel ;
- réinitialisation administrative du mot de passe ;
- désactivation du compte ;
- reset administratif 2FA ;
- désactivation personnelle du facteur 2FA.

La révocation d’un appareil reste distincte de celle d’une session. Aucune route de gestion manuelle n’est créée avant le lot 4.

## 8. Contrôles de sécurité

- preuve principale exclusivement cryptographique ;
- IP/User-Agent limités aux métadonnées ;
- SQL paramétré et rotation transactionnelle ;
- expiration absolue UTC et contrôle des états révoqué/expiré ;
- consentement explicite ;
- protection Origin, SameSite et CORS existant ;
- audit des créations/utilisations sans jeton ni hash ;
- messages publics non révélateurs ;
- mot de passe toujours obligatoire ;
- TOTP, anti-rejeu, codes de récupération, RBAC et Super Admin préservés ;
- appareil exclu du step-up.

## 9. Tests et résultats

| Validation | Résultat |
|---|---|
| Lint TypeScript backend | Réussi |
| Build backend | Réussi |
| Tests backend appareils + lots 1/2 | 4 fichiers réussis |
| Lint TypeScript frontend | Réussi |
| Build frontend | Réussi |
| Tests frontend appareils + lots 1/2 | 3 fichiers réussis |
| `git diff --check` | Réussi |

Les tests de contrat couvrent le modèle, le jeton 256 bits, le hash seul, la rotation sous verrou, l’expiration absolue, les cookies, l’origine, l’ordre mot de passe/appareil, l’indépendance du step-up, l’exclusion des récupérations, les révocations automatiques, les paramètres et le consentement frontend. Les suites existantes couvrent TOTP invalide/rejoué, challenge, refresh, step-up et gouvernance.

Aucun test MySQL réel n’a été exécuté : les migrations sont volontairement non appliquées et aucune base isolée autorisée n’a été utilisée. Les scénarios de concurrence SQL réelle restent donc à qualifier sur MySQL 8.4 isolé avant déploiement.

## 10. Limites et prérequis du lot 4

- appliquer 088, 089 puis 090 dans cet ordre sur une base de recette isolée ;
- tester deux requêtes concurrentes réelles sur le même cookie ;
- vérifier les attributs `Secure` derrière le proxy HTTPS cible ;
- développer la liste et la révocation personnelle/administrative avec `auth.2fa.devices.view` et `auth.2fa.devices.revoke` ;
- appliquer les scopes OWN/AGENCY/CONCESSION/GLOBAL aux utilisateurs cibles ;
- ajouter l’action explicite de révocation globale et la suppression du cookie courant ;
- ne jamais exposer le hash ou le jeton dans les réponses de gestion.

## 11. Verdict

Le lot 3 est prêt pour validation MySQL isolée. La confiance peut éviter le TOTP uniquement après mot de passe valide, reste explicitement consentie, bornée, révocable, rotative et indépendante des JWT et du step-up. Le lot 4 n’a pas été commencé.
