# CORR-ERP-02E — Transmission technique pour ChatGPT

## 1. Contexte

L'objectif était de lever les réserves CORR-ERP-02D en donnant aux essais un vrai créneau futur, une durée configurable et modifiable, des collisions bidirectionnelles avec les rendez-vous et un workflow de reprogrammation/annulation. Avant intervention, 02D protégeait uniquement l'intervalle actif ouvert `[started_at,returned_at)`. Le schéma avait déjà les statuts `planned`, `in_progress`, `completed`, `cancelled`, mais aucun horaire planifié ni durée.

Les règles validées par 02E sont : durée initiale 30 minutes indépendante des rendez-vous ; durée individuelle strictement positive ; intervalles semi-ouverts ; aucune double occupation du véhicule ou du commercial ; reprogrammation uniquement avant démarrage ; conservation de l'historique.

## 2. Diagnostic initial

| ID | Symptôme | Reproduction | Fichiers | Cause | Gravité |
|---|---|---|---|---|---|
| E-D01 | impossible de réserver dans le futur | API démarrait toujours avec `NOW()` | routes Showroom, table essais | absence de colonnes de planning | P1 fonctionnel |
| E-D02 | aucune notion d'adjacence | deux essais ne portaient pas de fin prévue | helper 02D | modèle temporel incomplet | P1 fonctionnel |
| E-D03 | rendez-vous futurs non confrontés aux essais | créer les deux sur une même période | routes CRM/Showroom | contrôle limité à NOW | P1 |
| E-D04 | aucune reprogrammation | aucune route | Showroom | workflow absent | P1 fonctionnel |
| E-D05 | durée essai non configurable | Settings ne contenait que rendez-vous | module Settings | clé absente | P2 |

## 3. Travail réalisé

| ID | Fichiers/fonctions | Avant | Après | Justification |
|---|---|---|---|---|
| E-C01 | migration 079 | aucun créneau | deux colonnes nullables, deux index | additive et historique intact |
| E-C02 | `assertTestDriveStartAvailable` | conflits actifs | conflits planned/in_progress par intervalle | source unique des collisions |
| E-C03 | `drivePeriod`, routes POST | démarrage immédiat seulement | futur planned ou immédiat in_progress | réutilise les statuts existants |
| E-C04 | route `schedule` | absente | revalidation complète et rollback | anciennes valeurs conservées en cas d'échec |
| E-C05 | route `start` | absente | transition planned→in_progress au créneau | pas de job implicite |
| E-C06 | annulation | in_progress seulement | planned ou in_progress, logique | libère le créneau sans DELETE |
| E-C07 | Settings | durée rendez-vous uniquement | clé essai indépendante | pas de second système de configuration |
| E-C08 | formulaires React | véhicule/permis/km | date/heure/durée, affichage et modification | design existant conservé |

## 4. Architecture

Un nouvel essai porte `scheduled_at` et `duration_minutes`; sa fin est calculée par MySQL avec `DATE_ADD`. Le chevauchement est exactement `existing.start < requested.end AND existing.end > requested.start`. Les bornes adjacentes ne se chevauchent donc pas.

Dans chaque transaction, les lignes visite, véhicule et utilisateur sont verrouillées avant les recherches d'essais et rendez-vous. La validation et l'INSERT/UPDATE appartiennent à la même transaction. Le wrapper retente au maximum trois fois seulement `ER_LOCK_DEADLOCK`. Les erreurs métier et toutes les autres erreurs sont propagées sans retry.

Un essai historique `in_progress` avec `scheduled_at IS NULL` est considéré bloquant. Les statuts terminaux ne participent jamais aux conflits. Les rendez-vous interrogent les essais planned/in_progress sur le même intervalle, et les essais interrogent les follow-ups pending.

Le RBAC reste basé sur les permissions persistées et les scopes, jamais sur le nom `SUPER_ADMIN`.

## 5. Base de données

Migration créée : `079_test_drive_scheduling.sql`. Colonnes `DATETIME NULL` et `SMALLINT UNSIGNED NULL`, sans default SQL ni backfill. La valeur 30 est une valeur effective de Settings appliquée uniquement aux nouvelles réservations. Deux index couvrent ressource, statut et début. Baseline 071 et migrations 077/078 inchangées.

La stratégie a été prouvée sur MySQL 8.4.11 jetable : migration depuis baseline, niveau 079, seconde exécution idempotente et lecture des colonnes/index.

## 6. Frontend

`CrmTestDriveModal` et `ShowroomPage` collectent un `datetime-local` et une durée. Ils convertissent la date locale en ISO avant l'appel API. Le formulaire CRM prend la durée par défaut via `/showroom/test-drive-config`. Le détail Showroom affiche les réservations et autorise modification/annulation des seuls essais planned. `SettingsPage` expose les deux durées séparément.

Les messages 409 du backend sont affichés par les toasts existants. Les labels et entrées natives conservent l'usage clavier et le responsive existants. Aucune palette n'a été modifiée.

## 7. Tests

Créés : `corr-erp-02e-contracts.test.ts` et `corr-erp-02e-test-drive-mysql.integration.test.ts`. Modifiés : les contrats VALID-ERP-02 et Settings devenus obsolètes après l'ajout explicite de la planification. Aucun test supprimé ou neutralisé.

Commandes :

```text
node --import tsx --test test/corr-erp-02e-contracts.test.ts test/corr-erp-02d-test-drive-locking.test.ts test/valid-erp-02-crm-contracts.test.ts test/database-baseline.test.ts
CORR_ERP_02E_MYSQL=1 DB_PORT=33318 ... node --import tsx --test test/corr-erp-02e-test-drive-mysql.integration.test.ts
npm run lint
npm run build
npm test
```

Résultats ciblés : backend 4/4 fichiers ; frontend 2/2 ; MySQL 1/1. Builds et lints passent. Global backend : 1 575 réussis, 85 échecs, 76 ignorés sur 1 736 sous-tests en 137,384 s. Global frontend : 130 réussis, 21 échecs sur 151 en 40,516 s. Les échecs persistants sont historiques/hors périmètre ; aucun nouveau test 02E n'échoue.

## 8. Anomalies rencontrées

- Les contrats historiques recherchaient littéralement `status='in_progress'` et une structure Settings à un seul champ. Ils ont été actualisés vers les règles 02E, sans retirer d'assertion fonctionnelle.
- Le premier bootstrap de la base jetable a achevé la baseline avant les migrations futures ; une relance idempotente a appliqué 072–079. Le niveau 079 et les objets ont ensuite été vérifiés.
- InnoDB peut produire un deadlock transitoire lors de réservations indépendantes sur des index vides. Le retry borné de 02D est conservé et les deux réservations aboutissent.

## 9. Tests historiques

Les tests 02D de verrouillage restent valides et passent. Deux tests de contrat statique ont été actualisés parce que la nouvelle règle validée remplace explicitement le seul statut actif et ajoute un champ Settings. Aucun problème d'environnement n'a été masqué. Les échecs globaux hors module restent classés comme historiques jusqu'à traitement par leurs lots.

## 10. Réserves

- E-R01/P2 : démarrage confirmé manuellement, pas de scheduler automatique.
- E-R02/P2 : actif historique incomplet bloquant jusqu'à clôture.
- E-R03/P2 : aucune recette E2E authentifiée complète sans fixtures/comptes isolés.
- E-R04/P2-P3 : échecs historiques des autres modules dans les suites globales.

## 11. État final

Validés : modèle temporel, durée, création future/immédiate, adjacence, collisions véhicule/commercial, collision croisée, reprogrammation backend/frontend, annulation logique, migration et concurrence MySQL. Avec réserve : démarrage opérationnel planifié et recette navigateur exhaustive. Non validé : aptitude globale de l'ERP à la production. Aucune P0/P1 connue ne reste dans ce périmètre.

## 12. Git et environnement

L'état initial contenait toutes les modifications non committées de CORR-ERP-02D ; elles ont été préservées. CORR-ERP-02E ajoute la migration 079, les tests 02E, les documents et les modifications ciblées backend/frontend. Aucun commit, push ou déploiement. Aucun volume ni base persistante touché. Le MySQL jetable est supprimé en fin de mission. Le service du port 3001 reste actif.

## 13. Synthèse pour ChatGPT

1. Demandé : finaliser le planning des essais et transmettre toutes les preuves.
2. Réalisé : migration 079, Settings, moteur d'intervalles, transactions, routes de création/modification/démarrage/annulation et formulaires React.
3. Fonctionne : futurs, immédiats, durées distinctes, adjacence, conflits et concurrence.
4. Ne fonctionne pas automatiquement : aucun job ne démarre seul un essai ; l'utilisateur confirme.
5. Décision technique : intervalles semi-ouverts, snapshots, colonnes historiques nullables, retry deadlock borné.
6. Règles : 30 minutes par défaut, 1–1440 minutes, modification de planned seulement.
7. Corrigé : absence de créneau, collision future/croisée, absence de reprogrammation et durée essai.
8. Non corrigé : échecs globaux historiques hors périmètre.
9. Tests exacts : ciblés backend 4/4, frontend 2/2, MySQL 1/1 ; builds/lints verts ; global backend 1 575/1 736 réussis, 85 échecs, 76 ignorés ; global frontend 130/151 réussis, 21 échecs.
10. Risques : actifs historiques incomplets et démarrage manuel.
11. Décision attendue : choisir ou non un ordonnanceur/notifications de rappel.
12. Prochaine action : recette utilisateur authentifiée sur une instance isolée, puis traitement séparé des échecs historiques hors CRM.
