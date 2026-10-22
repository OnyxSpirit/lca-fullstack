# Audit de l’option « Faire confiance à cet appareil » — ERP LCA

Date : 21 octobre 2026  
Périmètre : code et configuration présents dans le dépôt local ; aucune connexion ni modification du VPS.

## Verdict

L’absence de la case sur l’écran TOTP n’est **pas** une restriction propre au rôle `SUPER_ADMIN`. Le code local applique exactement la même règle à tous les utilisateurs soumis au TOTP.

Dans la version actuelle, la case apparaît uniquement lorsque la réponse de `POST /api/auth/login` contient `trustedDeviceAvailable: true` et que l’utilisateur n’a pas choisi le parcours par code de récupération. Le backend calcule ce booléen ainsi :

```text
politique globale des appareils de confiance activée
ET origine de la requête autorisée
```

Le comportement observé sur le VPS prouve donc que le frontend déployé reçoit une valeur fausse/absente, ou que son bundle est antérieur à l’implémentation. Sans accès en lecture au VPS, à sa réponse HTTP de connexion et à sa table `settings`, il n’est pas possible de départager honnêtement ces trois causes d’exploitation. Le défaut local historique de contrôle d’origine a déjà été corrigé dans le commit `cf1ee7a` ; aucun nouveau défaut de code n’est démontré par cet audit.

## 1. Frontend

Le composant concerné est `frontend/src/modules/auth/LoginPage.tsx`.

- l’état React `trustDevice` est initialisé à `false` ;
- la case de la vérification TOTP est rendue avec `pendingTwoFactor.trustedDeviceAvailable && !useRecovery` ;
- l’enrôlement TOTP utilise également `pendingTwoFactor.trustedDeviceAvailable` ;
- aucune permission, aucun scope RBAC et aucun code de rôle ne participent à ce rendu ;
- le mode récupération masque volontairement la case et remet le consentement à `false` ;
- la soumission transmet `trustDevice` à l’API officielle, sans mécanisme parallèle.

`frontend/src/stores/authStore.ts` alimente `pendingTwoFactor.trustedDeviceAvailable` exclusivement depuis la réponse de connexion. Une propriété absente dans un ancien backend est convertie en `false` par `Boolean(...)`.

La différence entre les deux parcours est intentionnelle :

- **activation TOTP** : la case peut être proposée après préparation du QR code, avant confirmation du premier TOTP ;
- **vérification à la connexion** : la case peut être proposée avec le code TOTP ;
- **récupération** : aucune confiance ne peut être créée.

## 2. Backend

Les routes concernées sont :

- `POST /api/auth/login` ;
- `POST /api/auth/2fa/verify` ;
- `POST /api/auth/2fa/challenge/confirm` ;
- `POST /api/auth/2fa/recovery`.

Dans `backend-node/src/modules/auth/auth.service.ts`, la réponse de challenge contient :

```text
trustedDeviceAvailable = trustedDevicesEnabled && trustedDeviceRequestAllowed(request)
```

Il n’existe aucun test `SUPER_ADMIN` dans cette décision. La confiance n’est créée qu’après un TOTP explicite et valide. Le parcours de récupération ne crée jamais d’appareil.

Dans `backend-node/src/modules/auth/trusted-device.service.ts` :

- le jeton opaque utilise 32 octets aléatoires ;
- seul son hash SHA-256 est stocké ;
- le cookie est `HttpOnly`, `SameSite=Strict`, limité à `/api/auth` et `Secure` en production ;
- le mot de passe reste vérifié avant consommation du cookie ;
- le jeton est tourné lors de son utilisation ;
- expiration et révocation sont contrôlées en base ;
- changement/réinitialisation du mot de passe, désactivation du compte et opérations 2FA sensibles révoquent la confiance selon les chemins prévus ;
- une confiance d’appareil ne vaut pas authentification forte récente pour le step-up.

## 3. Paramètres et proxy

La politique est stockée dans `settings` sous les clés :

- `security.2fa.trusted_devices.enabled` ;
- `security.2fa.trusted_devices.duration_days` ;
- `security.2fa.trusted_devices.max_duration_days`.

La migration `089_two_factor_security_governance.sql` initialise volontairement l’activation à `false`. Le fallback du code est lui aussi `false`. Une installation où l’administrateur n’a pas activé explicitement la fonction masque donc la case pour tous les rôles, Super Admin compris.

Le contrôle d’origine autorise l’origine configurée par `FRONTEND_URL` ou l’origine same-origin reconstruite depuis le protocole et l’en-tête `Host`. `Sec-Fetch-Site` doit être `same-origin`, `same-site` ou absent. Le Compose transmet `FRONTEND_URL` et `TRUST_PROXY_HOPS` au backend. La configuration Nginx de référence transmet `Host` et `X-Forwarded-Proto`.

Le cookie `Secure` exige HTTPS en production pour être conservé par le navigateur. Cela peut empêcher la confiance de fonctionner après sélection, mais **ne masque pas à lui seul la case** : le rendu intervient avant l’émission du cookie.

## 4. Comparaison local / VPS

Les preuves locales historiques consignées dans `docs/RAPPORT-CORRECTION-APPAREILS-CONFIANCE-LOT-A1.md` montrent une politique activée à `true` avec une durée de 7 jours. Le fichier `.env` local conserve toutefois un `FRONTEND_URL` placeholder. Le code actuel tolère correctement le vrai same-origin derrière le proxy ; cette correction a été introduite par `cf1ee7a`.

Pour identifier la cause d’exploitation exacte sans secret ni écriture, les contrôles VPS minimaux sont :

1. observer dans les outils réseau du navigateur la réponse de `POST /api/auth/login` et relever uniquement `status` et `trustedDeviceAvailable` ;
2. vérifier en lecture seule la valeur typée de `security.2fa.trusted_devices.enabled` ;
3. vérifier que les migrations 089 et 090 figurent dans `schema_migrations` et que `two_factor_trusted_devices` existe ;
4. comparer la révision/image déployée à `cf1ee7a` ou rechercher le libellé dans le bundle livré ;
5. vérifier, sans révéler sa valeur, que `FRONTEND_URL` correspond à l’origine publique et que `TRUST_PROXY_HOPS` correspond au nombre de proxys de confiance ;
6. contrôler la présence de `Host`, `Origin`, `Sec-Fetch-Site` et `X-Forwarded-Proto` dans le chemin de requête, sans journaliser cookie, JWT, mot de passe ou TOTP.

Interprétation :

| Preuve | Diagnostic |
|---|---|
| `trustedDeviceAvailable=false`, paramètre `false` | fonctionnalité volontairement non activée |
| paramètre `true`, réponse `false`, version ≥ `cf1ee7a` | origine/proxy/configuration non admise |
| propriété absente de la réponse ou libellé absent du bundle | différence de version déployée |
| réponse `true`, case absente | régression ou cache frontend à investiguer |

## 5. Super Administrateur

Le Super Administrateur est soumis à l’obligation TOTP système, mais n’est pas exclu des appareils de confiance. L’activer globalement aurait un impact sur **tous les utilisateurs** dont le parcours reçoit une origine admissible ; ce n’est donc pas une correction ciblée Super Admin et cela requiert une décision de politique de sécurité explicite.

## 6. Tests exécutés

| Contrôle | Résultat |
|---|---|
| Tests frontend ciblés `trusted-devices.test.ts` | PASS — 4/4 |
| Tests backend ciblés `trusted-devices.test.ts` | PASS |
| Lint frontend | PASS |
| Lint backend | PASS |
| Build frontend | PASS — 2 516 modules |
| Build backend | PASS |

Les tests couvrent le consentement décoché par défaut, le rendu conditionnel, l’exclusion du recovery, la transmission du consentement, l’absence de stockage navigateur du secret, les attributs du cookie, la validation d’origine, la rotation, l’expiration et les révocations.

## 7. Correction et réserves

Aucune correction supplémentaire n’a été appliquée : modifier le frontend pour forcer l’affichage contournerait la décision de sécurité du backend ; modifier la politique globale sans preuve et sans validation explicite serait contraire au périmètre.

Réserve unique : la cause d’exploitation entre politique désactivée, contrôle d’origine et version déployée ne peut pas être tranchée sans les six lectures VPS ci-dessus. Aucun secret, paramètre VPS, donnée de production, règle TOTP ou permission RBAC n’a été consulté ou modifié pendant cet audit.
