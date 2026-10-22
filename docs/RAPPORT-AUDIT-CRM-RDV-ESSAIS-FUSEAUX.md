# Rapport d'audit CRM — rendez-vous, essais routiers et fuseaux horaires

Date de l'audit : 21 octobre 2026  
Périmètre : code local ERP LCA, schéma MySQL 8.4 de recette consulté en lecture seule, tests ciblés.  
Nature : audit uniquement. Aucun code métier, aucune donnée, aucun conteneur et aucune migration n'ont été modifiés.

## 1. Verdict exécutif

Le module CRM n'est pas qualifiable en l'état pour les rendez-vous et les essais planifiés. Trois anomalies confirmées doivent être corrigées avant une recette finale :

| ID | Anomalie | Cause démontrée | Criticité | Statut |
|---|---|---|---|---|
| CRM-TZ-001 | Un même rendez-vous/essai saisi à la même heure produit des instants différents selon le fuseau du navigateur | Construction des dates avec `new Date(...)`, `getTimezoneOffset()` et `toISOString()` sans interprétation explicite en `Africa/Brazzaville` | Majeure | Confirmée |
| CRM-PROG-001 | Le démarrage d'un essai préalablement planifié ne fait pas passer l'opportunité CRM de `appointment` à `test_drive` | La route `PATCH /showroom/test-drives/:id/start` met uniquement l'essai à `in_progress`; elle n'appelle pas `markCrmTestDriveStarted` et ne publie pas `crm:lead-updated` | Majeure | Confirmée |
| CRM-PROG-002 | Aucun bouton ne permet de démarrer un essai planifié dans l'interface Showroom | Le hook `startPlannedDrive` existe, mais `ShowroomPage.tsx` ne l'utilise pas et n'affiche pas l'action correspondante | Majeure | Confirmée |

Les rendez-vous disposent par ailleurs de contrôles transactionnels, de détection de conflit, de permissions et de scopes territoriaux cohérents. La création immédiate et la clôture d'un essai mettent correctement à jour le CRM. La rupture est propre au parcours « essai planifié puis démarré ».

## 2. Cartographie technique

### 2.1 Frontend

- `frontend/src/modules/crm/CrmPage.tsx` : liste CRM, étapes commerciales, création/modification/annulation des rendez-vous.
- `frontend/src/modules/crm/crmAppointmentPolicy.ts` : validation et conversion des dates de rendez-vous.
- `frontend/src/modules/crm/CrmTestDriveModal.tsx` : création immédiate ou planification d'un essai.
- `frontend/src/modules/showroom/ShowroomPage.tsx` : suivi des visites et essais Showroom.
- `frontend/src/api/erpHooks.ts` : mutations rendez-vous/essais, dont `startPlannedDrive`.
- `frontend/src/modules/crm/crmRealtime.ts` : rafraîchissement différé sur événement CRM.
- `frontend/src/lib/utils.ts` : formatage générique récent avec le fuseau explicite `Africa/Brazzaville`; ce mécanisme n'est pas utilisé uniformément par les écrans CRM/Showroom concernés.

### 2.2 Backend

- `backend-node/src/modules/crm/crm.routes.ts` : routes des prospects et rendez-vous.
- `backend-node/src/modules/crm/crm-commercial-progress.ts` : progression dérivée du stage de l'opportunité.
- `backend-node/src/modules/crm/crm.realtime.ts` : diffusion ciblée de `crm:lead-updated`.
- `backend-node/src/modules/showroom/showroom.routes.ts` : planification, démarrage, retour et annulation des essais.
- `backend-node/src/modules/showroom/showroom-test-drive.ts` : prérequis et transition CRM vers `test_drive`.
- `backend-node/src/services/realtime.ts` : Socket.IO authentifié par JWT.

### 2.3 Données

- Rendez-vous : table `follow_ups`, date `scheduled_at` de type `DATETIME`, statuts `pending`, `completed`, `cancelled`, `overdue`.
- Essais : table `showroom_test_drives`, dates `scheduled_at`, `started_at`, `returned_at`, `created_at` de type `DATETIME`; statuts `planned`, `in_progress`, `completed`, `cancelled`.
- Progression commerciale : table `opportunities`, champ `stage`; pourcentage dérivé du stage et non du temps écoulé de l'essai.
- Migrations de fiabilisation constatées dans `schema_migrations` en recette : 077, 078 et 079 appliquées.

## 3. Cycle de vie audité

### 3.1 Rendez-vous

Le parcours nominal est :

1. opportunité aux étapes `qualified` ou `appointment` ;
2. `POST /crm/leads/:id/appointments` ;
3. verrouillage transactionnel de l'opportunité ;
4. validation de la date future, de la durée, de l'affectation et des conflits ;
5. insertion d'une activité et d'un `follow_up` ;
6. passage de l'opportunité à `appointment` ;
7. publication d'un événement CRM ciblé.

La modification et l'annulation ne sont possibles que pour un rendez-vous `pending`. Les étapes structurées `appointment`, `test_drive`, `offer` et `won` ne sont pas librement assignables depuis une modification générique.

### 3.2 Essai immédiat

`POST /showroom/crm/leads/:leadId/test-drives` crée la visite et l'essai. Lorsque le créneau démarre immédiatement, le backend appelle `markCrmTestDriveStarted`, fait passer l'opportunité à `test_drive` et publie la mise à jour CRM. Ce parcours est cohérent.

### 3.3 Essai planifié

La création place l'essai à `planned`. Au démarrage ultérieur, `PATCH /showroom/test-drives/:id/start` :

- contrôle le scope ;
- contrôle le statut et l'heure de début ;
- revérifie la disponibilité sous transaction ;
- passe l'essai à `in_progress` et renseigne `started_at`.

Il manque ensuite les deux opérations indispensables : transition de l'opportunité CRM vers `test_drive` et publication temps réel. En conséquence, la progression commerciale peut rester à 40 % (`appointment`) alors que l'essai est réellement `in_progress`; le niveau attendu est 55 % (`test_drive`).

De plus, l'interface n'expose pas ce démarrage. La mutation existe dans `erpHooks.ts`, mais aucune action « Démarrer » ne l'appelle dans `ShowroomPage.tsx`.

### 3.4 Retour et clôture

La route de clôture exige un essai `in_progress`, enregistre le retour, met à jour le kilométrage, crée l'activité, clôt la visite CRM et publie la mise à jour. Le verrouillage et les contrôles de statut évitent la double clôture.

## 4. Audit du fuseau horaire

Le fuseau métier observé et déjà utilisé dans le formatage générique est `Africa/Brazzaville` (UTC+01:00, sans changement saisonnier).

### 4.1 Cause exacte

`crmAppointmentPolicy.ts` interprète un champ `datetime-local` avec le fuseau de l'environnement d'exécution :

- `parseLocalAppointment()` construit `new Date(year, month, day, hour, minute)` ;
- `appointmentIso()` appelle ensuite `toISOString()` ;
- `appointmentInputValue()` dépend de `getTimezoneOffset()`.

`CrmTestDriveModal.tsx` et plusieurs traitements de `ShowroomPage.tsx` reproduisent le même schéma avec `new Date(scheduledAt).toISOString()`, `getTimezoneOffset()` ou un `toLocaleString()` sans `timeZone` explicite.

### 4.2 Preuve reproductible

Pour la saisie métier `2099-09-11T10:00` :

| Fuseau du processus/navigateur | ISO produit |
|---|---|
| `Africa/Brazzaville` | `2099-09-11T09:00:00.000Z` |
| `UTC` | `2099-09-11T10:00:00.000Z` |
| `America/New_York` | `2099-09-11T14:00:00.000Z` |

La même intention métier varie donc jusqu'à cinq heures dans cet échantillon. Le backend accepte l'ISO reçu avec `new Date(scheduledAt)` : il ne peut pas reconstituer l'intention initiale si le frontend l'a mal convertie.

### 4.3 État MySQL observé

La connexion `mysql2` utilise `dateStrings: true` mais ne fixe pas explicitement le paramètre de connexion `timezone`. Sur le MySQL 8.4 de recette consulté :

- `@@global.time_zone = SYSTEM` ;
- `@@session.time_zone = SYSTEM` ;
- `NOW()` et `UTC_TIMESTAMP()` donnaient la même valeur au moment du contrôle, donc le conteneur fonctionne actuellement en UTC ;
- les champs concernés sont des `DATETIME`, sans information de fuseau intrinsèque.

Ce fonctionnement peut être cohérent si la convention UTC est imposée de bout en bout, mais cette convention n'est pas garantie par les conversions frontend actuelles.

### 4.4 Risque historique

Aucune correction en masse des dates existantes ne doit être faite sans connaître leur provenance : navigateur, version applicative et convention de stockage. Une réinterprétation globale pourrait déplacer des dates déjà justes.

## 5. RBAC et isolation territoriale

| Action | Permission principale | Observations |
|---|---|---|
| Créer un rendez-vous | `crm.appointment.create` | Commercial affecté, date future, conflits et scope contrôlés |
| Modifier/annuler un rendez-vous | `crm.prospect.update` | Seulement `pending`, opportunité verrouillée |
| Forcer un conflit | `crm.appointment.override_conflict` | Justification attendue |
| Créer/lancer un essai CRM | `showroom.visitor.update` + `crm.test_drive.create` | Double contrôle de scope |
| Démarrer un essai planifié | `showroom.visitor.update` | Contrôle territorial présent, transition CRM absente |
| Confirmer le retour | `showroom.status.update` | Contrôle séparé conforme au principe de séparation |

Les scopes `OWN`, `AGENCY`, `CONCESSION` et `GLOBAL` sont traduits en prédicats SQL : propriétaire/affecté, agence, agences de la concession ou accès global. Aucun contournement RBAC n'a été identifié dans le périmètre audité.

## 6. Temps réel

`crm.realtime.ts` ne diffuse `crm:lead-updated` qu'aux utilisateurs autorisés par `crm.prospect.view` et par le scope de la ressource. Le frontend déclenche alors un rafraîchissement temporisé.

Les créations immédiates et les clôtures d'essais publient l'événement. Le démarrage planifié ne le publie pas. Même si le stage était corrigé en base, l'écran CRM pourrait donc rester obsolète jusqu'à un autre rafraîchissement si cette publication n'était pas ajoutée dans la même correction.

## 7. Tests et contrôles exécutés

### 7.1 Contrôles réussis

- Build frontend : PASS, 2 516 modules compilés.
- Lint frontend : PASS.
- Build backend TypeScript : PASS.
- Lint backend : PASS.
- `git diff --check` : PASS.
- `frontend/test/commercial-final-workflow.test.ts` : PASS.
- `frontend/test/crm-appointment-context-b3461.test.ts` : PASS.
- `backend-node/test/commercial-final-workflow.test.ts` : PASS.
- `backend-node/test/crm-appointment-reliability.test.ts` : PASS.
- `backend-node/test/crm-functional-reliability.test.ts` : PASS.
- `backend-node/test/showroom-crm-essai-fix.test.ts` : PASS.
- Reproduction contrôlée de la conversion dans trois fuseaux : divergence confirmée.
- Inspection MySQL 8.4 : lecture seule; aucune écriture exécutée.

### 7.2 Échecs ou limites de l'environnement

- `frontend/test/commercial-role-alignment.test.ts` : 4 PASS, 1 FAIL sur une expression statique devenue obsolète concernant les permissions de devis; sans rapport avec les dates ou les essais.
- `backend-node/test/commercial-residuals.test.ts` : 5 PASS, 11 FAIL, les 11 échecs provenant de `listen EPERM: operation not permitted 0.0.0.0` lors de l'usage de Supertest dans le bac à sable.
- `backend-node/test/test-drive-return-gate.test.ts` : 5 PASS, 1 FAIL pour la même interdiction d'écoute réseau.
- La base de recette contenait un `follow_up` et aucun `showroom_test_drive`; aucune donnée n'a été créée, conformément au caractère d'audit et à l'interdiction de modifier les données existantes.
- Aucune recette navigateur créant/modifiant un rendez-vous ou un essai n'a donc été présentée comme réalisée.

### 7.3 Lacunes de couverture

Le test frontend de fuseau force `process.env.TZ = 'Africa/Brazzaville'`; il vérifie le cas favorable mais pas l'indépendance vis-à-vis du fuseau navigateur. Le test backend du workflow commercial vérifie seulement la présence textuelle de `markCrmTestDriveStarted` dans le fichier et ne garantit pas son appel dans la branche de démarrage planifié. Aucun test ne vérifie que le bouton de démarrage planifié est réellement rendu.

## 8. Corrections recommandées, non appliquées

1. Centraliser une conversion explicite `datetime-local` métier `Africa/Brazzaville` vers un instant UTC, et l'utiliser dans CRM et Showroom.
2. Centraliser également la conversion inverse pour préremplir les formulaires, sans utiliser le fuseau du navigateur.
3. Conserver une seule convention de stockage, documentée et testée; fixer explicitement la convention de connexion MySQL pour éviter de dépendre du système du conteneur.
4. Dans `PATCH /showroom/test-drives/:id/start`, retrouver l'opportunité liée, appeler `markCrmTestDriveStarted` dans la transaction, puis publier `crm:lead-updated` après validation.
5. Exposer l'action « Démarrer » pour un essai `planned` lorsque l'heure et la permission le permettent; le backend reste l'autorité.
6. Invalider explicitement les requêtes CRM, véhicules et notifications après le démarrage planifié, comme lors de la clôture.
7. Ajouter des tests comportementaux couvrant UTC, Brazzaville et New York, les heures proches de minuit, le démarrage planifié, le stage CRM, le pourcentage, Socket.IO, RBAC et l'absence de double démarrage.

## 9. Scénarios obligatoires après correction

- Rendez-vous saisi à 00:05 et 23:55 depuis trois fuseaux navigateur : même instant métier attendu.
- Création, report et annulation d'un rendez-vous avec contrôle des conflits et des scopes.
- Essai immédiat : passage unique de `appointment` à `test_drive` et progression 55 %.
- Essai planifié : affichage du bouton, démarrage à l'heure, même transition et même événement temps réel.
- Double clic/double requête de démarrage : une seule transition, seconde requête refusée sans effet.
- Session révoquée, permission absente et accès inter-agence : refus sans fuite d'information.
- Retour d'essai, kilométrage, activité, véhicule et progression cohérents.
- Reconnexion et rafraîchissement multiutilisateur : état identique en base et dans toutes les interfaces.

## 10. Conclusion

Le socle transactionnel et RBAC du CRM est globalement structuré, mais les deux parcours critiques demandés ne sont pas fiables de bout en bout. Le rendez-vous dépend du fuseau du navigateur, et l'essai planifié n'est ni démarrable depuis l'interface ni propagé au stage CRM par sa route backend. Le verdict de cet audit est donc **NON VALIDÉ — corrections ciblées requises avant recette fonctionnelle finale**.

Le présent audit n'a effectué aucun commit, push, déploiement, redémarrage, migration ou écriture dans la base.
