# Rapport de levée des réserves 2FA — LOT 6C

Date : 16 octobre 2026  
Environnement : Docker local `lca-recette`, base isolée `lca_recette_2fa_lot6b_20261016`  
Verdict : **VALIDÉ AVEC RÉSERVES**

## 1. État initial

L'isolation constatée au LOT 6B a été revalidée avant toute écriture :

- backend, frontend et MySQL portent le projet Docker `lca-recette` ;
- MySQL utilise `lca_recette_mysql_data`, distinct de `lca_mysql_data` ;
- le backend cible explicitement `DB_NAME=lca_recette_2fa_lot6b_20261016` ;
- migrations au niveau 090 ;
- clé 2FA configurée dans le conteneur sans lecture ni affichage de sa valeur ;
- services initiaux et finaux `running/healthy`.

Aucune reconstruction n'a été nécessaire. Seul le backend de recette a été redémarré entre certains scénarios pour vider le limiteur HTTP en mémoire. Aucun conteneur métier, volume, VPS ou secret réel n'a été modifié.

Les données préexistantes de recette n'ont pas été supprimées. Chaque reprise a utilisé de nouveaux comptes fictifs préfixés `LOT6C`.

## 2. Correction du test backoff

La politique backend a été confirmée dans `two-factor.service.ts` : après chaque échec, `attempts` est incrémenté et le délai vaut `min(60, 2 ** attempts)` secondes.

| Tentative invalide | Backoff attendu | Réponse avant déblocage |
|---:|---:|---|
| 1 | 2 s | HTTP 429 |
| 2 | 4 s | HTTP 429 |

Le test attendait 2,1 s après le premier échec, puis ne garantissait aucune attente minimale après le second. La seule correction fonctionnelle du scénario a été l'ajout de `4 100 ms` avant d'attendre la fenêtre TOTP suivante. Le backoff de sécurité n'a pas été réduit.

Le scénario complet corrigé est **PASS** : 36 échanges couvrant enrôlement, TOTP invalide/expiré/valide, anti-rejeu, refresh, rotation concurrente, logout et session.

Le script navigateur a également été isolé avec un port CDP dérivé du PID. Le port fixe réutilisait parfois un ancien Chromium déjà authentifié ; aucun code applicatif n'a été modifié pour ce point.

## 3. Matrice RBAC HTTP réelle

Des concessions, agences, rôles et comptes exclusivement fictifs ont été ajoutés. Les JWT sont issus de connexions HTTP réelles.

| Scénario | Résultat |
|---|---|
| OWN : vue d'ensemble et liste personnelle | PASS, HTTP 200, uniquement la ressource propre |
| AGENCY : liste et compteurs | PASS, uniquement l'agence de l'acteur |
| AGENCY : modification même agence | PASS, HTTP 200 |
| AGENCY : modification/révocation hors agence | PASS, refus HTTP 403/404 |
| CONCESSION : agence sœur | PASS, HTTP 200 |
| CONCESSION : concession différente | PASS, refus HTTP 403 |
| GLOBAL : consultation et modification multi-concessions | PASS, HTTP 200 |
| VIEW uniquement : consultation | PASS, HTTP 200 |
| VIEW uniquement : modification/révocation | PASS, refus HTTP 403 |
| Sans permission : centre et liste | PASS, refus HTTP 403 |
| Politique sans `roles.view` | PASS, politiques HTTP 200 |
| Politique sans `users.view` | PASS, politique/paramètres accessibles, utilisateurs HTTP 403 |
| Protection SUPER_ADMIN | PASS, retrait/reset par non-super refusés HTTP 403 |
| Rôles dynamiques LOT6C visibles | PASS, 8 rôles actifs retournés |

Résultat automatisé : **PASS**, 35 requêtes. Compteurs observés : 13 utilisateurs AGENCY, 14 CONCESSION, 15 GLOBAL au moment de l'exécution. Les différences correspondent aux territoires effectifs.

Les révocations de fixtures ont réellement modifié MySQL et produit les audits AGENCY, CONCESSION et GLOBAL attendus.

## 4. Cycle des appareils

Scénario HTTP réel : **PASS**, 21 échanges.

- mot de passe puis enrôlement TOTP : PASS ;
- consentement explicite `trustDevice=true` : PASS ;
- création du jeton et stockage du hash : PASS ;
- cookie émis : PASS ;
- reconnexion par mot de passe avec appareil reconnu : PASS, aucun challenge TOTP ;
- rotation : PASS, nouveau cookie différent ;
- ancien jeton : PASS, retour au challenge TOTP ;
- appareil inconnu : PASS, challenge TOTP ;
- révocation personnelle : PASS ;
- cookie supprimé avec expiration au 1er janvier 1970 : PASS ;
- connexion après révocation : PASS, challenge TOTP ;
- mauvais mot de passe malgré appareil : PASS, HTTP 401 ;
- code de récupération : PASS ;
- rejeu du même code de récupération : PASS, HTTP 401 ;
- confiance désactivée au départ : constatée au LOT 6B, aucune création ;
- confiance activée par paramètre global avec authentification forte : PASS.

La lecture SQL des sessions du propriétaire montre une session issue de l'appareil reconnu avec `two_factor_verified_at` renseigné, `strong_auth_at IS NULL` et aucune méthode forte. L'appareil reconnu ne crée donc pas de step-up.

La révocation administrative a été exécutée dans la matrice RBAC sur trois appareils fictifs avec des acteurs AGENCY, CONCESSION et GLOBAL. Les refus hors scope ont été constatés.

## 5. Recette navigateur

Le scénario Chromium réel couvre :

- enrôlement et accusé des codes de récupération avant publication des jetons : PASS ;
- dashboard, rechargement et navigation module : PASS ;
- six onglets présents : PASS ;
- vue d'ensemble : PASS ;
- paramètres généraux : PASS ;
- politiques par rôle : PASS ;
- politiques individuelles : PASS ;
- appareils de confiance : PASS ;
- recherche d'un rôle dynamique `LOT6C_POLICY` : PASS ;
- responsive à 375 × 812 : PASS, aucun débordement du document ;
- focus clavier d'un onglet : PASS ;
- redirections `/security/devices` et `/security/devices/me` : PASS ;
- logout puis reconnexion TOTP sans QR : PASS.

### FAIL — espace « Mes appareils »

L'onglet sélectionné est bien `Mes appareils` et l'URL devient `/security/2fa?section=mine`, mais la page affiche `Administration des appareils de confiance` et la liste globale.

Cause démontrée : `TrustedDevicesPage.tsx` déduit le mode personnel avec `useLocation().pathname.endsWith('/me')`. Dans le centre unifié, le pathname reste `/security/2fa`; seule la query `section=mine` change. Le composant reçoit donc `personal=false`.

Pour un utilisateur OWN, le backend limite toujours les résultats à son propre scope. Pour un GLOBAL, l'onglet présenté comme personnel affiche cependant l'administration globale. Il s'agit d'une anomalie fonctionnelle et UX de gravité moyenne, à corriger dans une mission distincte.

Le script navigateur termine volontairement avec `result=FAIL` et `sectionFailures=[Mes appareils]`. L'échec n'est pas assimilé à un PASS.

## 6. HTTPS et cookies

Une terminaison HTTPS locale temporaire et exclusivement réservée à la recette a été lancée sur `https://127.0.0.1:4443` avec un certificat auto-signé d'un jour stocké sous `/tmp`.

Le proxy traduit l'origine HTTPS externe vers l'origine interne autorisée, puis restitue l'origine HTTPS dans les en-têtes CORS. Aucun domaine ni certificat de production n'a été utilisé.

Résultat : **PASS**, 8 échanges réels.

- préflight CORS : HTTP 204 ;
- origine autorisée restituée : HTTPS de recette ;
- `HttpOnly` : présent ;
- `Secure` : présent ;
- `SameSite=Strict` : présent ;
- `Path=/api/auth` : présent ;
- transmission du cookie sur HTTPS : confirmée ;
- rotation sur reconnexion : confirmée.

La validation du certificat a été désactivée uniquement dans le client QA parce que le certificat est auto-signé. Ce montage ne constitue pas une configuration de production.

## 7. Audits et notifications

Les écritures runtime suivantes sont présentes avec acteur, cible et horodatage UTC :

- `auth.2fa.trusted_device_created` pour les propriétaires HTTP et HTTPS ;
- `auth.2fa.trusted_device_used` lors de la rotation ;
- `auth.2fa.trusted_device_owner_revoked` ;
- `auth.2fa.trusted_device_admin_revoked` avec acteurs AGENCY, CONCESSION et GLOBAL ;
- `auth.2fa.security_settings_updated` ;
- `auth.2fa.role_policy_changed` ;
- `auth.2fa.step_up_succeeded` et `auth.2fa.step_up_failed` ;
- `auth.2fa.recovery_used`.

Les notifications `auth.2fa.enabled` et celles des changements de politique/obligation sont rattachées aux utilisateurs fictifs concernés. Une recherche ciblée dans `audit_logs.new_values` ne trouve aucune occurrence de `manualKey`, `recoveryCodes`, `accessToken`, `refreshToken`, `encrypted_secret` ou `token_hash`.

## 8. Scénarios PASS

- backoff corrigé et scénario HTTP complet : 36/36 échanges conformes ;
- matrice RBAC : 35/35 échanges conformes ;
- cycle appareil principal : 21/21 échanges conformes ;
- HTTPS/cookies : 8/8 échanges conformes ;
- cinq espaces navigateur sur six ;
- recherche rôle dynamique, responsive, focus, redirections ;
- lint backend et frontend ;
- 6 fichiers de tests backend ciblés : 6 PASS ;
- 21 tests frontend ciblés : 21 PASS ;
- `git diff --check` : PASS ;
- services finaux backend/frontend/MySQL : healthy.

## 9. Scénarios FAIL

| Identifiant | Scénario | Résultat |
|---|---|---|
| LOT6C-UI-01 | Onglet « Mes appareils » | FAIL : affiche l'administration globale, cause identifiée dans `TrustedDevicesPage.tsx` |

## 10. Scénarios BLOCKED ou non exécutés

- expiration absolue forcée d'un appareil actif par vieillissement réel ;
- changement de mot de passe réel et vérification transversale de révocation ;
- désactivation réelle du compte propriétaire ;
- reset 2FA administratif réel sur un compte enrôlé avec appareil ;
- concurrence HTTP réelle de plusieurs connexions utilisant exactement le même cookie ;
- ouverture effective de la modal step-up après expiration temporelle de dix minutes ;
- rejeu manuel d'une mutation sensible après fermeture de la modal ;
- états d'erreur réseau injectés pour chaque onglet ;
- navigation clavier exhaustive avec ordre de tabulation complet ;
- responsive à plusieurs largeurs au-delà du viewport mobile 375 × 812.

Ces scénarios ne sont pas déclarés réussis. Les opérations qui auraient nécessité de supprimer/réinitialiser des données de recette existantes n'ont pas été exécutées sans autorisation spécifique.

## 11. Anomalies détectées

### LOT6C-UI-01 — mode personnel perdu dans le centre unifié

- gravité : moyenne ;
- reproduction : se connecter avec un compte GLOBAL, ouvrir `/security/2fa`, choisir `Mes appareils` ;
- attendu : titre `Mes appareils de confiance`, endpoint personnel et résultats propres à l'acteur ;
- obtenu : titre `Administration des appareils de confiance` et résultats du scope administratif ;
- fichier concerné : `frontend/src/modules/auth/TrustedDevicesPage.tsx` ;
- recommandation : transmettre explicitement `personal` depuis `TwoFactorSecurityCenterPage` ou déterminer ce mode à partir du paramètre `section=mine`, puis ajouter un test navigateur de non-régression.

Aucune correction fonctionnelle n'a été appliquée, conformément à la mission.

## 12. Risques résiduels

- confusion entre l'espace personnel et administratif tant que LOT6C-UI-01 n'est pas corrigé ;
- scénarios transversaux destructifs ou temporels listés BLOCKED encore non prouvés en HTTP réel ;
- terminaison HTTPS de recette fondée sur un certificat auto-signé et un proxy temporaire, non destinée au déploiement ;
- fixtures LOT6C conservées dans la base isolée puisque leur suppression n'était pas autorisée ;
- la clé 2FA éphémère de recette doit rester disponible hors dépôt tant que cette base est réutilisée.

## 13. Verdict final

**VALIDÉ AVEC RÉSERVES**.

Les réserves majeures de sécurité du LOT 6B sont levées par des preuves HTTP, SQL, navigateur et HTTPS réelles : backoff, JWT/scopes, appareils, cookies, rotation, révocations, récupération, audits et notifications. Le socle d'authentification et d'autorisation est conforme sur les scénarios exécutés.

La validation n'est pas totale en raison de l'anomalie `LOT6C-UI-01` et des scénarios explicitement BLOCKED. Aucun déploiement ne doit être engagé avant correction et recette ciblée de l'espace « Mes appareils ».

Aucun commit, push, changement de branche ou déploiement n'a été effectué.
