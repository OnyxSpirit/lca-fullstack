# Rapport d’audit — Politique 2FA par rôle

Date de l’audit : 16 octobre 2026  
Périmètre : frontend React, API Express, services métier, migration MySQL 087, RBAC, authentification et tests.  
Mode : lecture seule. Aucune donnée, politique, configuration Docker ou fonctionnalité n’a été modifiée.

## 1. Résumé exécutif

Le système prend techniquement en charge les deux états d’une politique de rôle : `required=true` (obligatoire) et `required=false` (non obligatoire). L’interface permet également les deux transitions : elle affiche **Imposer le 2FA** lorsque l’état courant est faux et **Retirer l’obligation** lorsqu’il est vrai.

L’observation utilisateur est néanmoins **partiellement confirmée sur le plan de la présentation** : l’écran ne montre pas un choix explicite et permanent « Obligatoire / Non obligatoire », ni un badge d’état. Il montre seulement l’action inverse de l’état courant. Sur une installation où les rôles sont initialement non obligatoires, tous les boutons portent donc « Imposer le 2FA », ce qui donne raisonnablement l’impression que l’autre choix n’existe pas.

Le backend, le schéma et le calcul de l’obligation effective sont cohérents. La règle appliquée est celle de l’obligation la plus forte : Super Administrateur système, obligation individuelle ou au moins un rôle obligatoire. Une politique de rôle non obligatoire n’interdit jamais une 2FA volontaire et n’annule aucune autre source d’obligation.

## 2. Verdict sur l’observation utilisateur

**Verdict : PARTIELLEMENT CONFIRMÉE.**

- L’impossibilité fonctionnelle de rendre un rôle non obligatoire n’est pas confirmée.
- L’ambiguïté ergonomique est confirmée : le libellé décrit l’action à effectuer, pas l’état enregistré.
- Le bouton de retrait n’apparaît qu’après qu’une politique est obligatoire.
- Le cas `SUPER_ADMIN` est volontairement non réversible dans l’interface et dans le backend.

## 3. Comportement actuel de l’interface

L’écran est inclus dans l’onglet **Matrice RBAC** de la page **Utilisateurs & habilitations**. Le composant `TwoFactorRolePolicies` charge la liste des rôles actifs, puis rend un bouton unique par ligne.

| État API | Libellé visible | Clic envoyé à l’API |
|---|---|---|
| `required=false` | Imposer le 2FA | `required=true` |
| `required=true` | Retirer l’obligation | `required=false` |

Le passage dans les deux sens est donc implémenté. La politique est modifiable plusieurs fois. Après succès, les requêtes React Query `auth/2fa` et `users-admin` sont invalidées : la nouvelle valeur est relue depuis l’API et persiste après actualisation, reconnexion ou redémarrage puisqu’elle vient de MySQL.

États et conditions observés :

- le composant n’est rendu que si `auth.2fa.policy.manage` est détenue ;
- la requête n’est activée que sous cette même condition ;
- l’accès à l’onglet parent dépend cependant de `roles.view` ;
- une authentification renforcée est demandée : TOTP administrateur si actif, sinon mot de passe, avec session récente ;
- pour le rôle système `SUPER_ADMIN` obligatoire, le bouton de retrait est désactivé ;
- aucun badge distinct n’indique explicitement « Obligatoire » ou « Non obligatoire » ;
- aucun état vide, chargement ou erreur propre à la liste des politiques n’est présenté dans ce composant.

## 4. Comportement actuel du backend

### Endpoints

- `GET /auth/2fa/role-policies` : consulte les rôles actifs et leur politique.
- `PUT /auth/2fa/role-policies/:id` : reçoit `{ required: boolean, totpCode?, currentPassword? }`.

Les deux routes exigent `auth.2fa.policy.manage`. Le service exige en plus exactement le scope `GLOBAL`.

### Lecture

La lecture effectue un `LEFT JOIN` entre `roles` et `role_two_factor_policies`, puis calcule `COALESCE(p.required, FALSE)`. Tous les rôles actifs sont donc visibles et une absence de ligne est exposée comme « non obligatoire ».

### Modification

Le service :

1. refuse une valeur `required` non booléenne (`400`) ;
2. exige une session récente et une vérification forte (`401` en cas d’échec) ;
3. verrouille et vérifie le rôle actif (`404` s’il n’existe pas) ;
4. refuse `required=false` pour le Super Administrateur système (`409`) ;
5. insère ou met à jour la ligne, y compris avec `false` ;
6. journalise la modification dans la même transaction ;
7. notifie les utilisateurs concernés ;
8. lors du passage à `true`, révoque les sessions non vérifiées et non héritées concernées.

La réponse est `{ roleId, required }`. Le backend autorise donc l’imposition, le retrait, la lecture et la modification persistante d’une politique.

## 5. Structure et persistance MySQL

La migration `087_two_factor_authentication.sql` crée `role_two_factor_policies` :

- `role_id` : clé primaire et clé étrangère vers `roles`, suppression en cascade ;
- `required BOOLEAN NOT NULL DEFAULT TRUE` ;
- `updated_by` : auteur nullable, clé étrangère vers `users`, `ON DELETE SET NULL` ;
- `updated_at` : horodatage automatique.

Sémantique réellement appliquée :

- ligne avec `required=TRUE` : obligation liée au rôle ;
- ligne avec `required=FALSE` : absence explicite d’obligation liée au rôle ;
- absence de ligne : absence implicite d’obligation, normalisée à `false` par l’API ;
- `NULL` : impossible pour `required` et sans signification métier.

Une obligation n’est pas supprimée physiquement par l’API : elle est conservée avec `required=FALSE`, ce qui préserve l’auteur et la date. Le schéma représente déjà les deux états ; aucune migration n’est nécessaire.

## 6. Gestion des politiques obligatoires

Une politique `true` contribue à l’obligation effective de tous les utilisateurs ayant ce rôle actif. À la connexion :

- facteur absent : challenge `LOGIN_SETUP`, statut `two_factor_setup_required` ;
- facteur actif : challenge `LOGIN_VERIFY`, statut `two_factor_required`.

Lors de l’activation de la politique, les refresh tokens non vérifiés et non grandfathered des utilisateurs du rôle sont révoqués. Le middleware recalcule également l’état 2FA sur chaque requête authentifiée.

## 7. Gestion des politiques non obligatoires

Une politique `false` signifie uniquement que ce rôle n’impose pas la 2FA. Elle :

- ne désactive pas un facteur déjà configuré ;
- ne contourne pas une obligation individuelle ;
- ne contourne pas un autre rôle obligatoire ;
- ne contourne pas la protection du Super Administrateur système.

Un utilisateur non obligé mais volontairement équipé conserve le challenge TOTP à la connexion. Il peut désactiver lui-même son facteur seulement si aucune source d’obligation effective ne subsiste.

## 8. Comportement du Super Administrateur

Le rôle actif, système et codé `SUPER_ADMIN` impose la 2FA directement dans le calcul métier, indépendamment de la table des politiques. La défense est appliquée à trois niveaux :

- calcul effectif : `superAdmin || individual || role` ;
- backend : refus `409` de la mise à `false` ;
- frontend : bouton de retrait désactivé lorsque sa politique est obligatoire.

Même en cas d’absence de ligne ou de ligne historiquement fausse, un Super Administrateur système reste obligé. Cette protection n’a pas été modifiée.

## 9. Gestion des utilisateurs multirôles

Le calcul SQL utilise `EXISTS` sur tous les rôles actifs de l’utilisateur. La règle réelle est donc un **OU logique** :

- rôle A obligatoire + rôle B non obligatoire = 2FA obligatoire ;
- un rôle non obligatoire ne neutralise jamais un rôle obligatoire.

Le backend est cohérent et non contournable par ajout d’un second rôle. L’interface courante d’administration des utilisateurs ne propose cependant qu’un « rôle principal » et envoie un tableau à un élément. Le modèle et le calcul restent compatibles avec plusieurs rôles historiques ou attribués autrement. Aucun essai SQL multirôle n’a été réalisé, la mission interdisant toute écriture.

## 10. Impacts sur l’authentification

| Cas | Comportement constaté dans le code |
|---|---|
| Obligatoire, non configurée | Aucun jeton normal à la connexion ; challenge de configuration obligatoire. |
| Obligatoire, configurée | Challenge TOTP (ou récupération) avant émission de la session vérifiée. |
| Non obligatoire, non configurée | Connexion normale sans challenge 2FA. |
| Non obligatoire, activée volontairement | Challenge TOTP maintenu, car `enabled` suffit à déclencher le challenge. |
| Obligatoire → non obligatoire | Seule la source du rôle disparaît ; les autres obligations restent. Le facteur actif reste actif et donc demandé. Les sessions ne sont pas révoquées lors du retrait. |
| Non obligatoire → obligatoire | Les sessions non vérifiées/non grandfathered sont révoquées ; les requêtes suivantes recalculent l’obligation. Les sessions legacy grandfathered peuvent bénéficier du délai configuré. |

Il n’existe pas d’incohérence identifiée entre la valeur persistée et le calcul appliqué. Le délai grandfathered constitue une règle transitoire explicite, pas une désactivation de politique.

## 11. Contrôles RBAC et sécurité

- Frontend : composant conditionné par `auth.2fa.policy.manage`.
- Routes : lecture et écriture protégées par `requirePermission('auth.2fa.policy.manage')`.
- Service : lecture et écriture refusées si le scope n’est pas strictement `GLOBAL`.
- Mutation sensible : session de moins de dix minutes et TOTP si l’administrateur est protégé, sinon mot de passe.
- Modification : audit transactionnel `auth.2fa.role_policy_changed` avec rôle, état et acteur.
- Migration : permission accordée au Super Administrateur système actif ; aucune attribution automatique aux rôles métier.
- Super Administrateur : retrait interdit de façon autoritaire côté serveur.

Un utilisateur non autorisé ne peut donc pas retirer la politique via un appel direct à l’API.

## 12. Anomalies confirmées

### A-01 — État métier insuffisamment explicite dans l’interface

Sévérité : faible, ergonomie / compréhension.

Le bouton exprime seulement la prochaine action. Lorsque tous les rôles sont non obligatoires, l’écran ne montre que « Imposer le 2FA ». Il manque un indicateur stable de l’état courant et une formulation explicite du choix binaire. C’est la cause exacte de l’observation signalée.

## 13. Anomalies potentielles

### P-01 — Accès à l’écran soumis à une permission parent différente

Le composant exige `auth.2fa.policy.manage`, mais l’onglet qui le contient n’est visible qu’avec `roles.view`. Un rôle délégué possédant la première permission avec scope GLOBAL mais pas la seconde aurait une autorisation API sans chemin d’accès normal dans l’interface. Le Super Administrateur initial dispose normalement des deux. Cas non testé dynamiquement.

### P-02 — États techniques de chargement absents

La liste ne présente pas explicitement son chargement, une erreur de lecture ou un état vide. Une erreur réseau pourrait produire une carte vide et accroître l’ambiguïté.

### P-03 — Couverture automatisée fonctionnelle incomplète

Les tests existants couvrent la sécurité cryptographique, la structure de migration, les routes et plusieurs gardes, mais pas un scénario persistant complet `false → true → false`, le multirôle, ni le rendu des deux libellés. Ces scénarios nécessitent une base isolée ou des mocks supplémentaires.

## 14. Fichiers concernés et références

- `frontend/src/modules/users/TwoFactorAdministration.tsx:21-24` — composant, permission, bascule booléenne et libellés.
- `frontend/src/api/twoFactorHooks.ts:6-18` — modèle, GET, PUT et invalidation du cache.
- `frontend/src/modules/users/UsersManagementPage.tsx:22-35` — accès à l’onglet Matrice RBAC et insertion du composant.
- `backend-node/src/modules/auth/two-factor-admin.routes.ts:13-14` — routes de consultation et modification.
- `backend-node/src/modules/auth/two-factor-admin.service.ts:13-14` — scope GLOBAL, SQL de lecture, upsert, révocation, audit, notifications et protection Super Admin.
- `backend-node/src/modules/auth/two-factor.service.ts:29-40` — calcul effectif de l’obligation et règle multirôle.
- `backend-node/src/modules/auth/two-factor.service.ts:125-147` — état, sessions, désactivation volontaire et authentification renforcée.
- `backend-node/src/modules/auth/auth.service.ts:47-59` — sélection des challenges de connexion.
- `backend-node/src/middleware/authenticate.ts:21-27` — réévaluation 2FA des sessions actives.
- `backend-node/database/migrations/087_two_factor_authentication.sql:1-145` — tables, permission et attribution au Super Administrateur système.
- `backend-node/test/two-factor-authentication.test.ts` — contrôles statiques/cryptographiques 2FA.
- `backend-node/test/auth-session-revocation.test.ts` — comportement des sessions.
- `frontend/test/two-factor-authentication.test.ts` — flux frontend 2FA.

## 15. Tests exécutés et résultats

Tests non destructifs exécutés le 16 octobre 2026 :

| Commande | Résultat |
|---|---|
| `cd frontend && node --import tsx --test test/two-factor-authentication.test.ts` | 1 test, 1 succès, 0 échec |
| `cd backend-node && node --experimental-test-module-mocks --import tsx --test test/two-factor-authentication.test.ts test/auth-session-revocation.test.ts` | 2 fichiers, 2 succès, 0 échec |

Non testés volontairement : écriture puis relecture d’une politique réelle, persistance après redémarrage, scénario réel multirôle, révocation réelle de sessions et protection dynamique du Super Administrateur. Ces essais nécessiteraient de modifier des données ; ils sont exclus par la mission. Leur comportement a été audité statiquement jusqu’aux requêtes SQL.

## 16. Corrections recommandées — non implémentées

Correction minimale recommandée, sans changement backend ni migration :

1. afficher pour chaque rôle un badge permanent **Obligatoire** ou **Non obligatoire** ;
2. conserver le bouton d’action contextuel, ou le remplacer par un interrupteur/sélecteur à deux états clairement étiquetés ;
3. pour `SUPER_ADMIN`, afficher **Obligatoire — règle de sécurité** au lieu d’un simple bouton désactivé ;
4. ajouter les états chargement, erreur et liste vide ;
5. ajouter un test de composant couvrant les deux valeurs et les deux requêtes PUT ;
6. ajouter sur base isolée un test d’intégration `false → true → false`, multirôle et Super Admin.

Une évolution optionnelle consisterait à rendre l’onglet accessible sur `roles.view OU auth.2fa.policy.manage`, ou à formaliser que `roles.view` est une dépendance obligatoire de la permission 2FA. Cette décision touche au modèle d’habilitation et doit être validée avant modification.

## 17. Décisions métier nécessitant validation

- Confirmer si un administrateur 2FA délégué doit obligatoirement posséder aussi `roles.view`.
- Confirmer si l’absence de ligne et une ligne explicite `required=false` doivent rester fonctionnellement équivalentes ; c’est actuellement le cas.
- Confirmer l’acceptation du délai de grâce des sessions grandfathered lors d’une nouvelle obligation.
- Confirmer si l’interface doit exposer un état binaire explicite ou un bouton d’action accompagné d’un badge.

## Conclusion obligatoire — réponses Q1 à Q8

### Q1. L’interface permet-elle réellement d’imposer la 2FA à un rôle ?

**OUI.** Pour une politique `required=false`, le bouton « Imposer le 2FA » envoie un PUT avec `required=true`.

### Q2. L’interface permet-elle réellement de ne pas imposer la 2FA à un rôle ?

**OUI.** Pour une politique `required=true`, le même contrôle devient « Retirer l’obligation » et envoie `required=false`. La présentation n’en fait toutefois pas un choix visible en permanence.

### Q3. Peut-on retirer une obligation 2FA déjà appliquée ?

**OUI.** La bascule frontend et l’upsert backend le permettent pour les rôles configurables. **Exception voulue :** le rôle système `SUPER_ADMIN` ne peut pas être rendu non obligatoire.

### Q4. Le backend prend-il en charge les deux états ?

**OUI.** Il valide un booléen, persiste `true` ou `false`, retourne l’état et recalcule l’obligation effective.

### Q5. Le schéma MySQL prend-il en charge les deux états ?

**OUI.** `role_two_factor_policies.required` est un booléen non nullable. `TRUE` et `FALSE` sont persistables ; l’absence de ligne est lue comme `FALSE`.

### Q6. Le comportement est-il cohérent avec la règle métier attendue ?

**OUI.** « Non obligatoire » retire uniquement l’obligation issue de ce rôle. La 2FA volontaire et toute obligation plus forte restent applicables.

### Q7. Le problème signalé est-il confirmé ?

**PARTIELLEMENT.** Il n’existe pas de blocage fonctionnel : les deux transitions sont disponibles. L’anomalie de compréhension est réelle, car l’état courant « Non obligatoire » n’est jamais affiché explicitement et l’utilisateur voit initialement seulement « Imposer le 2FA ».

### Q8. Quelle correction minimale serait nécessaire ?

**OUI — correction frontend uniquement recommandée.** Ajouter un indicateur d’état explicite « Obligatoire / Non obligatoire » à chaque rôle et conserver la bascule existante avec un libellé non ambigu. Aucun changement backend, aucune migration et aucune modification de données ne sont nécessaires.

