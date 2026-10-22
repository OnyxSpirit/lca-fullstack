# CRM-01 — Audit des restrictions temporelles CRM et Showroom

Date : 22 octobre 2026  
Nature : audit fonctionnel et technique sans correction  
Périmètre : CRM, rendez-vous, essais véhicules et Showroom

## 1. Résumé exécutif

L'audit confirme une restriction temporelle majeure : un essai enregistré au statut `planned` ne peut pas être démarré avant son horaire prévu, à une tolérance de 60 secondes près. Le blocage est volontairement dupliqué dans le frontend et le backend. Il contredit le principe métier fourni pour CRM-01.

La clôture d'un essai est en revanche conforme : dès que son statut est `in_progress`, aucune durée minimale ou heure de fin planifiée n'est contrôlée. Une clôture après quelques secondes, 5 minutes ou après dépassement de la durée prévue est autorisée sous réserve du kilométrage, du RBAC et du scope.

Les conflits de planning constituent le second domaine à corriger. Les créneaux planifiés d'essais, de rendez-vous, de véhicules et de commerciaux sont souvent des interdictions fermes. La création d'un rendez-vous possède un mécanisme partiel d'override pour un autre rendez-vous, mais pas pour un essai ; la replanification d'un rendez-vous n'offre aucun override. Plus grave, un essai réellement `in_progress` n'est pas systématiquement considéré occupé au-delà de sa fenêtre planifiée : la disponibilité physique est évaluée avec les heures prévues. Le système peut donc simultanément surbloquer un simple conflit futur et sous-protéger un essai réel en dépassement.

Verdict : **NON CONFORME — corrections CRM-02 nécessaires**, sans corruption ou anomalie de données démontrée pendant cet audit.

## 2. Cartographie du parcours CRM

Chemin réel : **CRM** (`/crm`) → sélection d'un prospect → panneau de détail.

| Fonction | Emplacement interface | API | Garde principale |
|---|---|---|---|
| Planifier un rendez-vous | `/crm` → Prospect → « Planifier un rendez-vous » | `POST /api/leads/:id/appointments` | étape `qualified/appointment`, commercial affecté, date future, permission et conflits |
| Reporter le rendez-vous | `/crm` → Prospect → rendez-vous actif → « Reporter » | `PATCH /api/leads/:id/appointments/:appointmentId` | étape `appointment`, statut `pending`, date future et absence de conflit |
| Annuler le rendez-vous | `/crm` → Prospect → rendez-vous actif → « Annuler » | `POST /api/leads/:id/appointments/:appointmentId/cancel` | étape `appointment`, statut `pending`, motif |
| Planifier/démarrer un essai | `/crm` → Prospect à l'étape RDV → « Planifier un essai » | `POST /api/showroom/crm/leads/:leadId/test-drives` | rendez-vous valide, véhicule et conseiller, créneau, RBAC/scope |
| Suivi de l'essai | le dossier CRM reçoit le statut et les activités ; l'exploitation opérationnelle se poursuit dans Showroom | routes Showroom | événements CRM et Showroom |

Il n'existe pas de bouton autonome « prendre en charge le rendez-vous » dans le CRM. La prise en charge commerciale se matérialise essentiellement par l'essai et les transitions de pipeline.

## 3. Cartographie du parcours Showroom

Chemin réel : **Showroom & Réception** (`/showroom`). Les visites sont affichées en tableau ou liste ; le détail est une modale, pas une page dédiée.

| Fonction | Emplacement interface | API |
|---|---|---|
| Enregistrer un visiteur | `/showroom` → « Enregistrer un visiteur » | `POST /api/showroom` |
| Affecter un conseiller | carte visite → sélecteur d'affectation | `PATCH /api/showroom/:id/assign` |
| Prendre en charge | carte visite → « Prendre en charge » | `PATCH /api/showroom/:id/take-over` |
| Planifier un essai | visite en entretien → « Planifier essai » | `POST /api/showroom/:id/test-drives` |
| Voir un essai planifié | visite → menu `•••` → « Voir le détail » | `GET /api/showroom/:id` |
| Démarrer l'essai planifié | modale détail → « Démarrer l'essai » | `PATCH /api/showroom/test-drives/:id/start` |
| Reprogrammer/annuler | même modale détail | `PATCH .../:id/schedule` / `PATCH .../:id/cancel` |
| Clôturer l'essai | visite en essai → « Retour d'essai » | `PATCH /api/showroom/test-drives/:id/complete` |
| Clôturer une visite Showroom | menu `•••` → « Clôturer » | `PATCH /api/showroom/:id/complete` |

Une visite d'origine CRM est clôturée automatiquement lors du retour d'essai. La clôture manuelle d'une telle visite est explicitement refusée.

## 4. Matrice des états et transitions

### Rendez-vous CRM

| État initial | Action | État final | Permission | Temps | Effets |
|---|---|---|---|---|---|
| opportunité `qualified` ou `appointment` | créer RDV | `appointment`, suivi `pending` | `crm.appointment.create` | date strictement future ; contrôle chevauchement | activité, suivi, notification, realtime |
| opportunité `appointment`, suivi `pending` | reporter | `appointment`, suivi `pending` | `crm.prospect.update` | nouvelle date strictement future ; conflit ferme | mise à jour activité/suivi, notification |
| opportunité `appointment`, suivi `pending` | annuler | suivi `cancelled` | `crm.prospect.update` | aucune comparaison avec l'heure prévue | activité/suivi clôturés |

### Essai véhicule

| État initial | Action | État final | Permission | Temps | Effets |
|---|---|---|---|---|---|
| visite `in_progress` / CRM `appointment` | créer pour maintenant | `in_progress` | `showroom.visitor.update` + éventuellement `crm.test_drive.create` | horaire ≥ maintenant - 60 s | `started_at`, CRM `test_drive` |
| même contexte | créer dans le futur | `planned` | mêmes permissions | futur > 60 s | réservation planifiée |
| essai `planned` | reprogrammer | `planned` | `showroom.visitor.update` | doit rester futur | véhicule/conseiller/créneau mis à jour |
| essai `planned` | démarrer | `in_progress` | `showroom.visitor.update` | **refus avant horaire - 60 s** | `started_at=NOW()`, CRM `test_drive` |
| essai `planned` ou `in_progress` | annuler | `cancelled` | `showroom.visitor.update` | aucune garde horaire | `returned_at` si actif, motif |
| essai `in_progress` | retour/clôture | `completed` | `showroom.status.update` | **aucune durée minimale/maximale** | kilométrage, `returned_at`, activité, synchronisation |

## 5. Inventaire des conditions temporelles

### Temporalité informative ou de traçabilité — à conserver

- `started_at=NOW()`, `returned_at=NOW()`, `assigned_at`, `completed_at`.
- `TIMESTAMPDIFF` pour le temps d'attente Showroom.
- `testDriveTiming` pour heure prévue, fin prévue, durée écoulée et durée réelle.
- filtres de période Showroom et détection des doublons du jour.
- dates d'activités, notifications et statistiques.

### Temporalité de planification — à conserver avec adaptation

- date future lors de la création/replanification d'un rendez-vous ;
- date future lors d'une replanification explicite d'essai ;
- durée prévue entre 1 et 1 440 minutes ;
- détection de chevauchement destinée à informer et organiser.

### Temporalité bloquante injustifiée

1. `startPlannedTestDrive` refuse si `scheduledAt > now + 60 s`.
2. `plannedDriveStartState` désactive le bouton selon la même comparaison.
3. `assertTestDriveStartAvailable` transforme tous les chevauchements planifiés en refus fermes.
4. La création/replanification de rendez-vous bloque certains conflits sans possibilité d'override cohérente.

### Temporalité de sécurité mal modélisée

La présence d'un essai `in_progress` devrait être une occupation réelle indépendante de sa fenêtre prévue. La requête actuelle ne le garantit que si les fenêtres planifiées se chevauchent, ou si `scheduled_at IS NULL`, cas absent des créations courantes.

## 6. Analyse des blocages de démarrage

Le blocage anticipé est double :

- backend : `backend-node/src/modules/showroom/showroom-test-drive.ts`, fonction `startPlannedTestDrive` ;
- frontend : `frontend/src/modules/showroom/showroomPolicy.ts`, fonction `plannedDriveStartState`, puis bouton désactivé dans `ShowroomPage.tsx`.

L'API renvoie 409 « Le créneau de cet essai n'a pas encore commencé ». L'interface affiche le même motif et empêche même l'appel. Un rechargement ne change le résultat qu'au fur et à mesure que l'horloge rejoint le créneau.

Un démarrage tardif est autorisé : aucune borne maximale n'est comparée. Le statut `planned`, les permissions, le scope, l'état CRM et la disponibilité restent exigés.

## 7. Analyse des blocages de clôture

`assertTestDriveReturnAllowed` vérifie uniquement :

- statut exactement `in_progress` ;
- kilométrage retour entier et supérieur ou égal au départ.

Il ne lit ni `duration_minutes`, ni `scheduled_at`, ni une heure de fin. La route de clôture écrit immédiatement `returned_at=NOW()`. Les tests couvrent 5, 12, 30 et 45 minutes ; le même contrat autorise quelques secondes puisque la durée n'est jamais lue.

Résultat : ESSAI-03, 04, 05 et TZ-06 sont conformes par analyse et tests unitaires. Une seconde clôture et la clôture d'un essai seulement planifié restent justement refusées.

## 8. Rendez-vous et chevauchements

La création d'un rendez-vous :

- bloque un essai du conseiller qui chevauche le créneau, sans override ;
- bloque un autre rendez-vous, mais permet un override avec `crm.appointment.override_conflict` et justification.

La replanification :

- bloque tout essai chevauchant ;
- bloque tout autre rendez-vous chevauchant ;
- n'expose aucun override.

La planification d'un essai bloque les essais du véhicule, du conseiller ou de la visite et les rendez-vous du conseiller. Ces gardes confondent réservation informative et indisponibilité physique.

L'annulation d'un rendez-vous ou d'un essai ne dépend pas du dépassement de l'heure planifiée : comportement conforme.

## 9. Fuseaux horaires

### Frontend

`frontend/src/lib/businessDateTime.ts` fixe explicitement `Africa/Brazzaville`, UTC+01:00 sans heure d'été. Les champs `datetime-local` sont convertis vers un instant ISO avec cet offset, indépendamment du fuseau du navigateur. Les réponses MySQL sans suffixe sont interprétées comme UTC, puis rendues en heure métier.

Les tests frontend avec `TZ=America/New_York` confirment l'indépendance au fuseau du navigateur et le passage correct autour de minuit.

### Backend et MySQL

Le backend reçoit les ISO en UTC et transmet des objets `Date` à mysql2. Le pool utilise `dateStrings:true`, mais ne fixe pas `timezone:'Z'` et n'exécute aucun `SET time_zone`. `deploy/mysql.cnf` ne fixe pas non plus `default-time-zone`.

Le contrat réel dépend donc du fuseau du processus Node, du serveur MySQL et de la conversion mysql2. Les conteneurs sont généralement en UTC, mais cette hypothèse n'est pas imposée par le code ou la configuration. Une installation avec `TZ`/`SYSTEM` différent peut décaler les `DATETIME`, puis le frontend les interpréter comme UTC.

Le schéma emploie des `DATETIME` sans fuseau (`scheduled_at`, `started_at`, `returned_at`). Cela est acceptable seulement si la convention UTC est strictement configurée et documentée.

## 10. Synchronisation CRM / Showroom

- Démarrage : transaction atomique entre essai `in_progress` et opportunité CRM `test_drive`.
- Retour : essai `completed`, kilométrage véhicule, activité CRM et clôture de la visite CRM dans la même transaction.
- Après commit : `publishCrmLeadUpdated` et événements Showroom invalident les caches concernés.
- Le hook local de démarrage invalide leads, véhicules, Showroom et notifications.
- Le retour invalide également leads et véhicules sur les autres clients via Socket.IO.

Risque sémantique : les routes de création émettent un événement/une notification nommé `showroom:test-drive-started` même lorsque `period.status==='planned'`. L'état SQL reste correct, mais les consommateurs ou utilisateurs peuvent interpréter une simple planification comme un démarrage.

## 11. Protections RBAC à conserver

- `crm.appointment.create` pour la création d'un rendez-vous.
- `crm.prospect.update` pour report et annulation.
- `crm.appointment.override_conflict` pour une dérogation de chevauchement tracée.
- `crm.test_drive.create` en plus de `showroom.visitor.update` sur le parcours CRM.
- `showroom.visitor.update` pour planifier, reprogrammer, démarrer ou annuler un essai.
- `showroom.status.update` pour confirmer le retour et clôturer une visite.
- scopes OWN, AGENCY, CONCESSION et GLOBAL de `scope`/`driveScope`.
- validation du conseiller actif et habilité dans l'agence.

Supprimer le verrou temporel ne doit modifier aucune de ces protections.

## 12. Protections de disponibilité à conserver

- véhicule de la bonne agence, stock commercial, non archivé et statut `available` ;
- conseiller existant, actif et commercialement habilité ;
- visite existante et état métier cohérent ;
- rendez-vous CRM préalable lorsqu'un prospect CRM est concerné ;
- verrouillage transactionnel et transition conditionnelle de statut ;
- kilométrage retour ≥ kilométrage départ ;
- interdiction du double démarrage et de la double clôture ;
- **occupation réelle par un autre essai `in_progress`**, indépendamment des horaires prévus.

Les chevauchements de simples réservations devraient devenir avertissements/dérogations tracées conformément au principe métier, pas être supprimés sans contrôle.

## 13. Anomalies confirmées

### CRM-TEMP-P1-01 — Démarrage anticipé interdit

- Gravité : CRM-TEMP-P1.
- Fichiers : `backend-node/src/modules/showroom/showroom-test-drive.ts`, `frontend/src/modules/showroom/showroomPolicy.ts`, `frontend/src/modules/showroom/ShowroomPage.tsx`.
- Fonctions : `startPlannedTestDrive`, `plannedDriveStartState`.
- Condition : `scheduledAt > now + 60_000`.
- Impact : client et véhicule présents mais essai impossible avant le créneau.
- Reproduction : planifier à 14 h, ouvrir `/showroom` → visite → `•••` → détail à 10 h ; bouton désactivé. Un appel direct à `PATCH /api/showroom/test-drives/:id/start` renvoie 409.
- Attendu : autoriser selon état, RBAC, scope et disponibilité réelle.
- Actuel : attente obligatoire ou replanification.
- CRM-02 : supprimer la comparaison horaire de l'autorisation frontend/backend, conserver l'horaire prévu comme information et tracer `started_at` réel.

### CRM-TEMP-P1-02 — Conflits planifiés traités comme indisponibilités absolues

- Gravité : CRM-TEMP-P1 selon le principe métier fourni.
- Fichiers : `showroom-test-drive.ts`, `showroom.routes.ts`, `crm.routes.ts`.
- Fonctions : `assertTestDriveStartAvailable`, création/report de rendez-vous, création/reprogrammation d'essai.
- Condition : requêtes d'overlap sur `scheduled_at + duration_minutes`.
- Impact : impossible de planifier ou démarrer malgré la disponibilité réelle ; override incohérent selon le chemin.
- Reproduction : créer deux rendez-vous/essais qui se chevauchent pour le même conseiller ; selon le chemin, HTTP 409 sans dérogation possible.
- Attendu : avertissement et confirmation tracée pour les conflits purement planifiés ; refus ferme pour une occupation réelle.
- Actuel : blocage ferme, sauf création d'un rendez-vous contre un autre rendez-vous avec permission spéciale.
- CRM-02 : centraliser une politique `warning vs hard conflict`, avec justification et audit.

### CRM-TEMP-P1-03 — Essai actif en dépassement potentiellement considéré disponible

- Gravité : CRM-TEMP-P1, intégrité opérationnelle.
- Fichier : `backend-node/src/modules/showroom/showroom-test-drive.ts`.
- Fonction : `assertTestDriveStartAvailable`.
- Condition : un essai `in_progress` avec `scheduled_at` non nul est testé par chevauchement de sa fenêtre prévue, pas par occupation active absolue.
- Impact : après la fin planifiée, le même véhicule ou conseiller peut ne plus être détecté comme occupé alors que le retour n'est pas enregistré.
- Reproduction statique : essai 14 h–14 h 30 encore `in_progress` à 15 h ; nouvelle réservation 15 h–15 h 30. Les fenêtres ne se chevauchent pas et `scheduled_at IS NULL` est faux.
- Attendu : tout `in_progress` concurrent bloque jusqu'au retour/annulation.
- Actuel : blocage dépendant du créneau historique.
- CRM-02 : séparer `status='in_progress'` (conflit dur) de `status='planned'` (avertissement/dérogation).

### CRM-TEMP-P2-01 — Override de chevauchement incohérent

- Gravité : CRM-TEMP-P2.
- Fichier : `backend-node/src/modules/crm/crm.routes.ts`.
- Fonctions : création et mise à jour de rendez-vous.
- Impact : une création peut déroger à un conflit RDV/RDV, mais un report identique ne le peut pas ; aucun chemin ne déroge à RDV/essai.
- CRM-02 : appliquer une politique homogène et auditée aux créations et reports.

### CRM-TEMP-P2-02 — Notification « démarré » pour un essai seulement planifié

- Gravité : CRM-TEMP-P2.
- Fichier : `backend-node/src/modules/showroom/showroom.routes.ts`.
- Fonctions : création d'essai CRM et Showroom.
- Impact : notification et événement sémantiquement trompeurs, risque de rafraîchissement incohérent ou de mauvaise interprétation utilisateur.
- CRM-02 : émettre `planned` lors d'une réservation et `started` uniquement lors de la transition réelle.

## 14. Risques potentiels

### CRM-TEMP-RISK-TZ-01 — Convention UTC non imposée côté serveur

- Gravité potentielle : CRM-TEMP-P2.
- Fichiers : `backend-node/src/config/database.ts`, `deploy/mysql.cnf`.
- Risque : décalage entre `Date`, MySQL `DATETIME` et interprétation UTC du frontend si Node/MySQL ne tournent pas en UTC.
- Statut : risque statique, non reproduit sur une installation divergent de fuseau.

### CRM-TEMP-RISK-OWN-APPOINTMENT — Le rendez-vous requis peut devenir son propre conflit

Un essai CRM exige un rendez-vous `pending/completed`, puis la disponibilité recherche tout rendez-vous `pending` du conseiller sur le créneau sans exclure le rendez-vous du prospect courant. Un essai aligné exactement sur son rendez-vous peut donc être refusé. Le code suggère fortement ce cas, mais aucun test HTTP/MySQL ciblé ne l'a reproduit pendant CRM-01 : classement **risque potentiel P1** à confirmer en CRM-02 avant correction.

## 15. Scénarios de reproduction

| Scénario | Résultat audit |
|---|---|
| RDV-01/02 prise en charge avant/après horaire | pas d'action RDV autonome ; essai anticipé bloqué, essai tardif autorisé |
| RDV-03 chevauchement | blocage par défaut ; override partiel à la création seulement |
| RDV-04 replanification | future obligatoire, conflits fermes |
| RDV-05 annulation | conforme, aucune garde liée à l'heure prévue |
| ESSAI-01 démarrage anticipé | anomalie confirmée frontend/backend |
| ESSAI-02 démarrage tardif | conforme si autres préconditions satisfaites |
| ESSAI-03/04/05 clôture courte/tardive/immédiate | conforme par fonction testée |
| ESSAI-06 replanification | disponible seulement pour `planned`; non requise par l'API après dépassement |
| ESSAI-07 annulation | conforme, états `planned/in_progress`, sans limite horaire |
| ESSAI-08 disponibilité | garde légitime présente, mais distinction planned/in_progress incorrecte |
| TZ-01/02/03/04/07 | frontend normalisé et tests multi-TZ réussis ; configuration serveur implicite |
| TZ-05 | reste bloqué par la règle métier de démarrage, même avec conversion correcte |
| TZ-06 | conforme, pas d'heure de fin exigée |

## 16. Tests exécutés

### Backend ciblé

14 fichiers : **10 PASS, 4 FAIL**.

PASS notamment :

- `planned-test-drive-progression.test.ts` — confirme explicitement le refus « trop tôt » ;
- `test-drive-early-completion.test.ts` — confirme l'absence de durée minimale ;
- `crm-appointment-reliability.test.ts` ;
- `crm-appointment-concurrency-b341.test.ts` ;
- `crm-functional-reliability.test.ts` ;
- `crm-stage-transition-matrix.test.ts` ;
- `corr-erp-02d-test-drive-locking.test.ts` ;
- `valid-erp-02-crm-contracts.test.ts` ;
- `showroom-crm-essai-fix.test.ts` ;
- `showroom-reception-rbac.test.ts`.

Échecs au niveau fichier :

- `crm-appointment-integrity-b341.test.ts` ;
- `showroom-own-endpoint.test.ts` ;
- `showroom-scope-matrix.test.ts` ;
- `test-drive-return-gate.test.ts`.

Ces familles d'échecs d'endpoints/RBAC sont cohérentes avec les échecs historiques de la campagne backend globale. Elles ne sont pas masquées et n'ont pas été corrigées.

### Frontend ciblé

11 fichiers : **11 PASS, 0 FAIL**. Sont notamment couverts : comparaison « trop tôt », durées prévues/réelles, passage de minuit, navigateur `America/New_York`, rendez-vous, realtime, scopes et retour d'essai.

## 17. Tests non exécutés

- Aucun test navigateur interactif sur le bundle courant.
- Aucun test MySQL d'écriture : CRM-01 est un audit et l'environnement actif ne correspond pas au code local courant.
- Aucun scénario avec horloge Node/MySQL volontairement divergente.
- Aucun test Socket.IO réel multi-client.
- Le risque du rendez-vous qui entre en conflit avec l'essai qu'il autorise n'a pas été reproduit en HTTP/MySQL.

Les conclusions marquées « confirmées » reposent soit sur des tests dédiés réussis, soit sur des gardes explicites et déterministes du code. Les autres sont classées comme risques.

## 18. Propositions de correction

1. Autoriser `planned → in_progress` indépendamment de `scheduled_at`, tout en conservant la date prévue et en écrivant l'heure réelle.
2. Retirer la désactivation temporelle frontend ; laisser le statut/RBAC et l'état de mutation piloter le bouton.
3. Séparer dans le service de disponibilité :
   - conflit dur : ressource réellement engagée dans un essai `in_progress` ;
   - avertissement : chevauchement d'une réservation `planned` ou d'un rendez-vous ;
   - conflit structurel : véhicule vendu, archivé, hors agence ou indisponible.
4. Étendre la dérogation auditée aux créations et replanifications, avec permission dédiée et justification.
5. Exclure explicitement le rendez-vous métier courant des conflits lors de la création/démarrage de son essai.
6. Imposer UTC dans le pool mysql2 (`timezone:'Z'`) et dans MySQL/session, après tests de compatibilité des données historiques ; ne pas convertir les valeurs existantes sans audit.
7. Distinguer les événements `test-drive-planned` et `test-drive-started`.

## 19. Plan recommandé pour CRM-02

1. Ajouter d'abord des tests rouges pour ESSAI-01/02/03/04/05 et le cas d'essai actif hors fenêtre.
2. Tester en MySQL isolé le rendez-vous courant contre son propre essai.
3. Refactorer `assertTestDriveStartAvailable` en contrôles « hard availability » et « planning warning » sans affaiblir les verrous.
4. Modifier la transition backend `startPlannedTestDrive` pour ignorer l'heure prévue.
5. Aligner `plannedDriveStartState` sur statut + permission uniquement.
6. Harmoniser les overrides de création/report RDV et planification/replanification d'essai.
7. Séparer les événements realtime planifié/démarré et vérifier les invalidations multi-client.
8. Qualifier UTC avec navigateurs Brazzaville et hors fuseau, Node UTC/non UTC et MySQL UTC/non UTC sur base temporaire.
9. Exécuter lint, builds, suites CRM/Showroom, MySQL concurrence et recette navigateur.
10. Ne migrer ou réinterpréter aucune donnée historique sans un diagnostic séparé.

## 20. Verdict final

**CRM-01 : NON CONFORME — trois anomalies P1 confirmées, deux P2 confirmées et deux risques à qualifier.**

Le système respecte correctement les états, le RBAC, les scopes, le kilométrage et la clôture sans durée minimale. En revanche, l'heure planifiée bloque injustement le démarrage anticipé, les chevauchements sont trop souvent des interdictions fermes, et la disponibilité d'un essai réellement actif est insuffisamment séparée de sa fenêtre prévue.

Aucune correction, migration, modification de permissions, donnée métier ou configuration n'a été effectuée. CRM-02 n'a pas été commencé.
