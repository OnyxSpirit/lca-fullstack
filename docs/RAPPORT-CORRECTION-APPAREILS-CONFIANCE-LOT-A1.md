# Rapport de correction du parcours « Faire confiance à cet appareil » — Lot A.1

Date : 17 octobre 2026

Verdict : **VALIDÉ AVEC RÉSERVES**

## 1. Résumé du problème

L'utilisateur pouvait cocher « Faire confiance à cet appareil » et réussir le TOTP, mais aucun appareil n'était inséré, aucun cookie n'était émis, « Mes appareils » restait vide et la connexion suivante redemandait le TOTP.

L'anomalie ne provenait ni du consentement React, ni de la sérialisation, ni du logout. Elle provenait du contrôle d'origine backend : une origine valide servie par le proxy local était comparée uniquement à une valeur `FRONTEND_URL` incorrecte dans le conteneur actif. Le service retournait silencieusement `null` et la connexion continuait sans confiance.

## 2. Reproduction et preuves

Les vérifications en lecture seule sur l'environnement local ont établi :

- `security.2fa.trusted_devices.enabled = true` ;
- durée = 7 jours ;
- plafond = 30 jours ;
- nombre total d'appareils enregistrés = 0 ;
- `FRONTEND_URL` du conteneur backend actif = `http://IP_DU_VPS` ;
- le frontend est servi par Nginx et relaie `/api/` au backend avec le `Host` public et `X-Forwarded-Proto`.

La case était donc correctement proposée, mais `createTrustedDevice` refusait l'origine réelle via `safeOrigin` et retournait `null`. Une erreur SQL aurait fait échouer la requête TOTP; ce n'était pas le comportement observé.

## 3. Cause racine

Avant correction, l'autorisation de créer ou consommer une confiance exigeait :

```text
request Origin === env.frontendUrl
```

La valeur du conteneur était un placeholder et ne correspondait pas à l'origine réellement utilisée. Comme ce refus était volontairement traité comme une absence de confiance plutôt que comme une erreur d'authentification, la session JWT était délivrée sans appareil ni `Set-Cookie`.

## 4. Configuration effective

| Paramètre | Valeur observée |
|---|---|
| Activation appareils de confiance | `true` |
| Durée par défaut | 7 jours |
| Durée maximale | 30 jours |
| Appareils en base avant correction | 0 |
| Origine configurée dans le backend actif | placeholder ne correspondant pas à l'origine réelle |

Aucun paramètre n'a été modifié, aucune politique n'a été activée et aucune donnée n'a été écrite pendant le diagnostic.

## 5. Analyse du frontend

`LoginPage.tsx` initialise `trustDevice` à `false`. La case n'est affichée que lorsque `pendingTwoFactor.trustedDeviceAvailable` vaut vrai et jamais en mode récupération. Son `onChange` alimente l'état React.

La soumission appelle :

- `verifyTwoFactor(code, trustDevice, 'Ce navigateur')` ;
- ou `confirmRequiredTwoFactorSetup(code, trustDevice, 'Ce navigateur')`.

`authStore.ts` sérialise bien `trustDevice` dans le JSON. La valeur n'est pas remise à faux avant l'appel. `apiClient.ts` utilise `credentials: 'include'`, condition nécessaire à l'acceptation et au renvoi du cookie. Aucun accès JavaScript au cookie HttpOnly n'existe.

Conclusion : le frontend transmettait correctement le consentement.

## 6. Analyse du backend

Les routes `/api/auth/2fa/verify` et `/api/auth/2fa/challenge/confirm` transmettent le consentement au service. Après TOTP valide, `createTrustedDevice` :

1. lit la politique globale ;
2. génère 32 octets aléatoires encodés base64url ;
3. stocke uniquement le hash SHA-256 ;
4. insère l'appareil et son expiration dans une transaction ;
5. renvoie le jeton brut uniquement pour l'émission du cookie.

La correction remplace la comparaison unique par une fonction testable, `trustedDeviceRequestAllowed`, qui accepte :

- l'origine explicitement configurée ;
- ou l'origine réellement same-origin reconstruite depuis `request.protocol` et `Host`, notamment derrière le proxy Nginx.

Une origine tierce ou malformée reste refusée. Le signal `trustedDeviceAvailable` inclut désormais cette vérification : l'interface ne propose plus une promesse que la requête courante ne peut pas honorer.

## 7. Analyse des cookies

Les attributs restent inchangés :

- `HttpOnly: true` ;
- `Secure: true` en production ;
- `SameSite: Strict` ;
- `Path: /api/auth` ;
- `Expires` égal à l'expiration absolue de l'appareil ;
- aucun `Domain`, donc cookie lié à l'hôte émetteur ;
- aucun stockage dans `localStorage`.

Le frontend inclut les credentials. La route `respond` émet `Set-Cookie` lorsque `_trustedDevice` est présent. Aucun affaiblissement de `Secure`, `SameSite` ou `HttpOnly` n'a été introduit.

## 8. Analyse de la déconnexion

Le logout frontend révoque la session de refresh, nettoie JWT, utilisateur, caches et Socket.IO. Le backend met uniquement `refresh_tokens.revoked_at` à jour.

Le logout ne supprime pas le cookie de confiance et ne modifie pas `two_factor_trusted_devices`. La confiance est révoquée séparément par les actions dédiées, les changements/réinitialisations de mot de passe, la désactivation du compte, la désactivation 2FA ou le reset administratif.

Conclusion : la déconnexion normale n'était pas la cause et conserve bien la confiance.

## 9. Analyse de la connexion suivante

Le mot de passe est vérifié avant toute lecture de l'appareil. Si le cookie est présent, la politique active et l'origine autorisée, le backend recherche le hash par utilisateur, exige `revoked_at IS NULL` et `expires_at > UTC_TIMESTAMP()`, verrouille la ligne, remplace transactionnellement le hash et conserve l'expiration d'origine.

Une session JWT normale est ensuite créée avec `two_factor_verified_at`, mais sans marquer un step-up fort. Le nouveau cookie contient le jeton tourné. Un appareil expiré, révoqué, inconnu ou invalide retombe sur le challenge TOTP.

## 10. Analyse de « Mes appareils »

Le lot A avait déjà aligné le mode personnel sur `auth.2fa.view`. La page utilise exclusivement :

- `GET /auth/2fa/devices/me` ;
- `DELETE /auth/2fa/devices/me/:id` ;
- `DELETE /auth/2fa/devices/me/current`.

La requête est limitée à `request.user.sub`. Le mapping affiche création, dernière utilisation, expiration, état et appareil courant. Les mutations invalident les queries `['auth','2fa','devices']`. Avant cette correction, la liste était vide parce que l'appareil n'était jamais créé, non parce que le frontend le masquait.

## 11. Corrections effectuées

1. Acceptation sécurisée de l'origine configurée ou de l'origine same-origin réellement reçue via le proxy.
2. Refus maintenu des origines tierces, cross-site ou malformées.
3. Calcul de `trustedDeviceAvailable` à partir de la politique **et** de l'admissibilité de la requête.
4. Remplacement du libellé obsolète « paramètre préparatoire » par la description du comportement réellement implémenté.
5. Tests de non-régression du consentement, de l'origine et du logout.

## 12. Fichiers modifiés

- `backend-node/src/modules/auth/trusted-device.service.ts`
- `backend-node/src/modules/auth/auth.service.ts`
- `backend-node/test/trusted-devices.test.ts`
- `frontend/src/modules/auth/TwoFactorSecuritySettingsPage.tsx`
- `frontend/test/trusted-devices.test.ts`
- modifications du lot A conservées dans les routes/service/tests RBAC personnels
- `docs/RAPPORT-CORRECTION-APPAREILS-CONFIANCE-LOT-A1.md`

Aucune migration, permission, politique ou donnée métier n'a été modifiée.

## 13. Tests réalisés

| Test | Résultat |
|---|---|
| Backend lint | PASS |
| Backend build | PASS |
| Frontend lint | PASS |
| Frontend build | PASS — 2 505 modules transformés |
| Backend ciblé auth/TOTP/trusted devices/step-up | PASS — 5 fichiers sur 5 |
| Frontend ciblé auth/TOTP/trusted devices/RBAC/navigation | PASS — 7 fichiers sur 7 |
| Test comportemental origine configurée | PASS |
| Test comportemental origine same-origin proxy | PASS |
| Test comportemental origine tierce/malformée | PASS — refusée |
| Vérification logout sans révocation de confiance | PASS statique ciblé |

Les tests existants couvrent également : fonctionnalité désactivable, consentement explicite, absence de création par recovery, rotation transactionnelle, expiration, hash seul, cookie strict, révocations de sécurité, step-up et séparation RBAC personnel/administratif.

## 14. Résultats

La cause silencieuse de non-création est supprimée pour le déploiement same-origin actuel. La correction compile et les tests ciblés passent. Les règles 7/30 jours, la rotation, les révocations et l'isolation RBAC n'ont pas changé.

## 15. Tests non exécutés

Le parcours HTTP/navigateur réel complet est **NON EXÉCUTÉ** : les conteneurs actifs embarquent encore l'ancienne image et la mission interdit toute reconstruction Docker non autorisée. Aucune connexion utilisateur, écriture de test ou modification de politique n'a été réalisée sur la base courante.

Ne sont donc pas revendiqués comme preuves réelles : `Set-Cookie` après TOTP, insertion post-correction, apparition navigateur, conservation après logout et reconnexion sans TOTP.

## 16. Réserves

Une reconstruction ciblée et autorisée du backend/frontend local, suivie d'une recette sur un compte et des données explicitement isolés, reste nécessaire. La valeur `FRONTEND_URL` du conteneur devrait également être remplacée par l'URL publique réelle : la correction same-origin résout ce parcours, mais une valeur de configuration placeholder demeure indésirable pour CORS et Socket.IO.

## 17. Réponses explicites et verdict

| Question | Réponse |
|---|---|
| A. Pourquoi la case ne produisait-elle pas le résultat attendu ? | Le contrôle d'origine comparait uniquement l'origine réelle à un `FRONTEND_URL` placeholder; `createTrustedDevice` retournait silencieusement `null`. |
| B. L'appareil est-il réellement enregistré ? | Avant correction : **non**, zéro ligne observée. Après correction : le chemin de création est rétabli et testé, mais pas encore exécuté dans Docker. |
| C. Est-il visible dans « Mes appareils » ? | Avant correction : **non**, car absent de la base. Après mise à jour Docker, il devrait l'être; recette réelle encore requise. |
| D. Le cookie est-il conservé après logout ? | **Oui dans le code** : logout ne l'efface ni ne révoque l'appareil. Validation navigateur non exécutée. |
| E. La connexion suivante évite-t-elle le TOTP pendant 7 jours ? | **Oui selon le code et les tests ciblés** si cookie/politique/expiration sont valides; validation HTTP réelle non exécutée. |
| F. Le mot de passe reste-t-il obligatoire ? | **Oui**, il est vérifié avant la consommation du cookie. |
| G. Les révocations de sécurité restent-elles fonctionnelles ? | **Oui**, leurs chemins n'ont pas été modifiés et les tests ciblés passent. |
| H. Les protections RBAC sont-elles intactes ? | **Oui**, le contrat du lot A et les permissions administratives sont préservés. |

**Verdict final : VALIDÉ AVEC RÉSERVES.** La cause racine est prouvée et corrigée dans le code. La réserve porte sur l'absence de reconstruction et de recette HTTP/navigateur réelle, explicitement interdites sans autorisation supplémentaire.
