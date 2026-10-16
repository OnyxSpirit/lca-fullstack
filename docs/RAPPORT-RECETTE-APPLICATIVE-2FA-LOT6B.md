# Rapport de recette applicative 2FA — LOT 6B

Date de la recette : 16 octobre 2026  
Périmètre : environnement Docker local de recette uniquement  
Verdict : **NON VALIDÉ**

## 1. Diagnostic initial Docker

Le Compose de recette est `docker-compose.recette.yml`, projet Docker `lca-recette`.

| Service | Image | Port hôte | État final |
|---|---|---:|---|
| backend | `lca-recette-backend` | `127.0.0.1:3004` vers `3001` | running / healthy |
| frontend | `lca-recette-frontend` | `127.0.0.1:4176` vers `80` | running / healthy |
| mysql | `mysql:8.4` | `127.0.0.1:33321` vers `3306` | running / healthy |

L'isolation avec l'environnement métier a été vérifiée par inspection des labels, montages et réseaux, pas seulement par les noms :

- recette : label `com.docker.compose.project=lca-recette` ;
- métier : label `com.docker.compose.project=lca` ;
- volume MySQL recette : `lca_recette_mysql_data` ;
- volume MySQL métier : `lca_mysql_data` ;
- volumes applicatifs recette : `lca_recette_uploads_data`, `lca_recette_ged_data` ;
- volumes applicatifs métier : `lca_uploads_data`, `lca_ged_data`.

Le MySQL de recette possède trois réseaux issus d'une ancienne configuration Compose fusionnée (`lca-recette_private`, `lca-recette_recette_private`, `lca-recette_recette_host`). Le backend et le frontend de recette partagent les deux réseaux `recette_*`. Cette dérive ne crée aucun partage de volume ou de données avec le projet métier.

La boucle de redémarrage initiale provenait de l'ancienne base persistante de recette : la migration 080 y était `PENDING` et le contrôle de reprise signalait `MIGRATION_SCHEMA_DIVERGED` à l'étape 3. Aucun contournement du runner n'a été appliqué.

## 2. Actions effectuées

- création d'un schéma exclusivement dédié : `lca_recette_2fa_lot6b_20261016` dans le MySQL de recette ;
- attribution à l'utilisateur applicatif de recette limitée à ce schéma ;
- injection hors dépôt d'une clé 2FA éphémère, sans affichage de sa valeur ;
- reconstruction des seules images `backend` et `frontend` de recette ;
- recréation des seuls services `backend` et `frontend`, avec `--no-deps` ;
- exécution du gestionnaire officiel de migrations sur la base isolée ;
- création du seul Super Administrateur fictif via le script officiel ;
- remises à zéro ponctuelles des seules données 2FA de ce compte fictif pour rendre les scénarios reproductibles ;
- redémarrages du seul backend de recette afin de réinitialiser le limiteur HTTP en mémoire entre scénarios automatisés.

Aucun conteneur, volume ou enregistrement métier n'a été modifié. Aucun volume n'a été supprimé. Aucun déploiement, commit ou push n'a été effectué.

## 3. Environnement final

- `GET http://127.0.0.1:3004/api/health` : HTTP 200, service `lca-backend-node` ;
- `GET http://127.0.0.1:4176/healthz` : HTTP 200, réponse `ok` ;
- backend, frontend et MySQL de recette : healthy ;
- `NODE_ENV=production` ;
- `FRONTEND_URL=http://127.0.0.1:4176` ;
- `DB_NAME=lca_recette_2fa_lot6b_20261016` ;
- clé de chiffrement 2FA présente dans le conteneur, valeur jamais affichée ;
- issuer TOTP : `ERP LCA Recette LOT6B` ;
- migrations 087, 088, 089 et 090 appliquées par le runner officiel à `2026-10-16 06:17:27/28` UTC.

La clé 2FA utilisée est éphémère et non versionnée. Toute recréation ultérieure du backend sur cette base isolée doit réinjecter exactement cette clé, ou utiliser une nouvelle base jetable ; sinon les secrets TOTP déjà chiffrés ne seront plus déchiffrables.

## 4. Résultats HTTP réels

Un premier parcours HTTP local a produit les résultats suivants :

| Contrôle | Résultat |
|---|---|
| connexion mot de passe | HTTP 200, `two_factor_setup_required` |
| préparation enrôlement | HTTP 200 |
| TOTP incorrect | HTTP 401 |
| backoff après premier échec | HTTP 429 avant 2 s, conforme |
| TOTP correct après backoff | HTTP 200 |
| anti-rejeu du challenge consommé | HTTP 401 |
| 10 codes de récupération générés | conforme, valeurs non consignées |
| vue d'ensemble | HTTP 200 |
| paramètres 2FA | HTTP 200 |
| liste de mes appareils | HTTP 200 |
| step-up avec mot de passe incorrect | HTTP 401 |
| step-up valide | HTTP 200 |
| rotation refresh | HTTP 200 |
| ancien refresh après rotation | HTTP 401, conforme |

Le test officiel `backend-node/test/auth-2fa-live-integration.mjs` a validé sa première moitié : enrôlement, absence de jetons avant le second facteur, accès authentifié, accès récurrents concurrents, rotation refresh, rejet de l'ancien refresh, logout avec le refresh roté, et rejet du refresh après logout. Il s'arrête ensuite sur le scénario négatif décrit par l'anomalie `LOT6B-HTTP-01`.

Non couverts réellement : code de récupération consommé, appareil reconnu/expiré/révoqué, révocation de session administrative, step-up expiré et refus d'une opération sensible après expiration.

## 5. Résultats navigateur

Le scénario Chromium réel `backend-node/test/auth-2fa-browser-e2e.mjs` est **PASS** :

- écran de connexion chargé depuis le frontend de recette ;
- enrôlement TOTP réel ;
- jetons non publiés dans le stockage navigateur avant accusé de lecture des codes de récupération ;
- accès à `/dashboard` ;
- `GET /auth/me` HTTP 200 ;
- annuaire utilisateur HTTP 200 ;
- maintien de session après rechargement ;
- navigation vers `/users` ;
- logout HTTP 200 ;
- reconnexion présentant un challenge TOTP sans nouveau QR code ;
- validation TOTP et nouvel accès `/auth/me` HTTP 200.

Une ancienne page ouverte avant reconstruction a d'abord affiché une erreur de chunk dynamique obsolète. Un rechargement complet a correctement ramené la page `/login`; aucune erreur persistante du build courant n'a été observée.

Les six espaces du centre 2FA (vue d'ensemble, paramètres, politiques par rôle, politiques individuelles, appareils de confiance, mes appareils), leur responsive, la navigation clavier, les recherches, filtres et paginations n'ont pas tous été exercés en navigateur réel. Ils ne sont donc pas déclarés validés.

## 6. Matrice RBAC

La base isolée contient un seul utilisateur fictif, le Super Administrateur système. Les endpoints d'administration appelés avec son JWT ont répondu HTTP 200.

La matrice exigée n'a pas été exécutée avec des JWT distincts pour GLOBAL, CONCESSION, AGENCY, OWN, consultation seule et sans permission 2FA. En conséquence, l'absence de fuite inter-périmètre et les compteurs SQL hors périmètre ne sont pas qualifiés par une preuve applicative LOT 6B.

## 7. HTTPS et cookies

La recette disponible est exposée en HTTP local et `FRONTEND_URL` est également en HTTP. Aucune terminaison HTTPS locale n'était configurée. La confiance des appareils est désactivée par défaut dans les paramètres de sécurité ; la demande `trustDevice=true` n'a donc légitimement créé ni appareil ni cookie.

La lecture du code confirme les attributs prévus : `HttpOnly`, `SameSite=Strict`, `Path=/api/auth`, expiration explicite et `Secure` lorsque `NODE_ENV=production`. Cette inspection ne remplace pas une validation réelle derrière HTTPS. Rotation, suppression après révocation, CORS et CSRF derrière une terminaison HTTPS restent non validés.

## 8. Audit et notifications

Les compteurs en base isolée montrent :

- `auth.2fa.enabled` : 3 entrées issues des réinitialisations/scénarios successifs ;
- `auth.2fa.step_up_failed` : 1 ;
- `auth.2fa.step_up_succeeded` : 1 ;
- notifications `auth.2fa%` : 3 ;
- appareils de confiance : 0, cohérent avec le paramètre global désactivé.

L'acteur des événements est le compte fictif. Aucun secret TOTP, code de récupération, JWT ou clé de chiffrement n'a été inscrit dans ce rapport. Les scénarios de rotation et révocation d'appareil, révocation administrative et modification réelle des paramètres n'ayant pas été exécutés, leurs audits et notifications restent non qualifiés.

## 9. Anomalies détectées

### LOT6B-HTTP-01 — délai insuffisant dans le test officiel

- Gravité : moyenne, anomalie du test automatisé ;
- reproduction : exécuter `backend-node/test/auth-2fa-live-integration.mjs`, soumettre un premier TOTP faux, attendre 2,1 s, soumettre un second TOTP expiré, puis attendre seulement la prochaine fenêtre TOTP avant le code valide ;
- attendu : le scénario attend la fin du second backoff, soit au moins 4 s ;
- obtenu : HTTP 429 à la ligne 86 ;
- cause démontrée : le serveur utilise `delay = min(60, 2 ** attempts)` ; après deux échecs, `blocked_until` vaut maintenant +4 s, tandis que le test ne garantit pas cette attente ;
- recommandation : dans une mission corrective distincte, attendre explicitement la valeur du backoff après chaque échec ou isoler les scénarios négatifs dans des challenges différents.

Aucune correction applicative ou de test n'a été réalisée dans ce lot de recette.

## 10. Tests non exécutés

- création des cinq profils fictifs complémentaires et matrice RBAC complète ;
- code de récupération réellement consommé ;
- appareil reconnu, expiré et révoqué ;
- révocation personnelle et administrative ;
- session révoquée administrativement ;
- step-up expiré et opération sensible refusée ;
- six espaces du centre 2FA de bout en bout ;
- responsive multi-viewport et navigation clavier exhaustive ;
- terminaison HTTPS locale, cookies réels, CORS et CSRF ;
- audits/notifications de toutes les opérations d'appareil et de gouvernance.

## 11. Risques résiduels

- la matrice territoriale réelle n'est pas démontrée avec des JWT de profils distincts ;
- le comportement navigateur du centre unifié n'est que partiellement couvert ;
- les propriétés des cookies sont prouvées par le code mais pas par un échange HTTPS réel ;
- les scénarios de cycle de vie complet des appareils de confiance ne sont pas qualifiés ;
- la clé de recette éphémère doit être conservée hors dépôt tant que cette base isolée est utilisée ;
- le Compose de recette seul ne déclare pas l'injection complète utilisée pour cette session ; l'override temporaire `/tmp/lca-lot6b.override.yml` est nécessaire à cet état de recette.

## 12. Verdict final

**NON VALIDÉ**.

Le socle réel est opérationnel : migrations 087 à 090, services healthy, enrôlement TOTP, émission différée des jetons, refresh, logout, anti-rejeu, step-up et parcours navigateur principal ont fourni des preuves positives. Cependant, les objectifs obligatoires de matrice RBAC multi-profils, cycle complet des appareils, six espaces navigateur et HTTPS/cookies réels n'ont pas été exécutés. Ces absences empêchent de lever les réserves du LOT 6A et interdisent un verdict de validation globale.

Aucun déploiement en production n'est autorisé sur la base de cette recette.
