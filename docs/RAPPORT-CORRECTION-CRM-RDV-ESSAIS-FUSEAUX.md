# Rapport de correction CRM — rendez-vous, essais et fuseaux horaires

Date : 21 octobre 2026  
Périmètre : environnement de développement local uniquement.  
Référence : `docs/RAPPORT-AUDIT-CRM-RDV-ESSAIS-FUSEAUX.md`.

## 1. Résumé

Les trois anomalies confirmées par l'audit ont été corrigées dans le code local :

| ID | Cause initiale | Correction | Tests associés | Statut |
|---|---|---|---|---|
| CRM-TZ-001 | Les champs `datetime-local` étaient convertis selon le fuseau du navigateur | Conversion centralisée `Africa/Brazzaville` ↔ instant UTC, sans API locale du navigateur | 5 heures, 3 fuseaux, aller-retour, dates invalides et comparaison au présent | Corrigée |
| CRM-PROG-001 | Le démarrage planifié modifiait seulement l'essai | Transition essai + opportunité CRM dans la même transaction verrouillée, événement après commit | démarrage, transition, refus trop tôt, double démarrage et échec concurrent | Corrigée |
| CRM-PROG-002 | La mutation existait sans action visible | Bouton « Démarrer l'essai », contrôle permission/statut/heure, chargement, anti-double clic, messages et invalidations | états masqué/trop tôt/prêt et non-régression Showroom | Corrigée |

Verdict : **VALIDÉ AVEC RÉSERVES**. Les preuves automatisées, lint et builds sont conformes. La recette navigateur de bout en bout sur une pile reconstruite reste à exécuter avant déploiement.

## 2. Fichiers modifiés dans cette mission

### Code

- `frontend/src/lib/businessDateTime.ts` — nouvelle source unique de conversion métier.
- `frontend/src/lib/utils.ts` — formatage raccordé au même fuseau et au même parseur d'instants.
- `frontend/src/modules/crm/crmAppointmentPolicy.ts` — création, validation et préremplissage indépendants du navigateur.
- `frontend/src/modules/crm/CrmTestDriveModal.tsx` — planification des essais en heure métier.
- `frontend/src/modules/showroom/ShowroomPage.tsx` — planification/reprogrammation, affichage et démarrage planifié.
- `frontend/src/modules/showroom/showroomPolicy.ts` — politique testable de visibilité et disponibilité de l'action.
- `frontend/src/api/erpHooks.ts` — invalidations CRM, Showroom, véhicules et notifications.
- `backend-node/src/modules/showroom/showroom-test-drive.ts` — démarrage planifié transactionnel.
- `backend-node/src/modules/showroom/showroom.routes.ts` — orchestration RBAC, transaction, publication et notification.

### Tests

- `frontend/test/crm-business-timezone.test.ts`.
- `frontend/test/showroom-planned-drive-action.test.ts`.
- `frontend/test/harmonisation-fr-b347.test.ts` adapté au nouveau point de décision fonctionnel.
- `backend-node/test/planned-test-drive-progression.test.ts`.

Les modifications locales préexistantes sur les devis, le CRM et les autres rapports ont été préservées.

## 3. Convention de gestion des dates

La convention retenue ne change ni MySQL ni les données historiques :

1. l'utilisateur saisit une heure civile de Brazzaville dans `datetime-local` ;
2. cette valeur est interprétée explicitement dans `Africa/Brazzaville` (UTC+01:00, sans heure d'été) ;
3. l'API reçoit un ISO UTC ;
4. les `DATETIME` sans suffixe retournés par l'API sont interprétés selon la convention UTC existante ;
5. l'affichage et le préremplissage sont reconvertis explicitement vers `Africa/Brazzaville`.

Aucun `getTimezoneOffset()`, constructeur de date locale ou ajout implicite dépendant du navigateur ne subsiste dans les parcours corrigés. L'heure n'est pas arbitrairement décalée : le décalage UTC+01:00 est la règle explicite du fuseau métier demandé.

Exemples vérifiés pour le 23 octobre 2026 :

| Heure Brazzaville | Instant API |
|---|---|
| 00:05 | 22 octobre, 23:05 UTC |
| 08:00 | 07:00 UTC |
| 10:00 | 09:00 UTC |
| 15:30 | 14:30 UTC |
| 23:55 | 22:55 UTC |

Ces résultats sont identiques lorsque le processus de test est configuré en `Africa/Brazzaville`, `UTC` ou `America/New_York`.

## 4. Workflow corrigé des essais planifiés

La route `PATCH /showroom/test-drives/:id/start` conserve la permission `showroom.visitor.update` et le scope territorial existant. Après ce contrôle :

1. la ligne d'essai est relue avec verrou `FOR UPDATE` ;
2. le statut `planned` et l'heure autorisée sont revérifiés dans la transaction ;
3. la disponibilité du véhicule, du conseiller, de la visite et du créneau est revérifiée ;
4. `markCrmTestDriveStarted` passe l'opportunité de `appointment` à `test_drive` ;
5. l'essai passe de `planned` à `in_progress` et reçoit `started_at` ;
6. toute erreur annule la transaction entière ;
7. après commit seulement, `crm:lead-updated` est publié selon le filtrage RBAC existant ;
8. la notification Showroom est émise et l'API retourne le stage `test_drive`.

La progression reste dérivée du stage CRM existant : `test_drive` correspond donc à 55 %. Aucune permission, aucun scope et aucune règle de progression n'ont été élargis.

## 5. Comportement du bouton « Démarrer l'essai »

Le bouton est présent dans le détail d'une visite uniquement lorsque :

- l'essai est `planned` ;
- l'utilisateur possède `showroom.visitor.update` dans son périmètre.

Avant le créneau, il est désactivé et explique que l'essai ne peut pas encore commencer. La même tolérance d'une minute que le backend est utilisée pour la présentation, mais le backend reste autoritaire. Pendant la requête, les actions de démarrage, modification et annulation sont neutralisées pour empêcher les doubles clics.

Le succès confirme le passage à l'étape Essai. Les erreurs HTTP métier restent affichées : créneau trop tôt, essai déjà démarré/annulé, permission ou scope insuffisant, véhicule ou conseiller indisponible. Après succès, les caches Showroom, CRM, véhicules et notifications sont invalidés.

## 6. Tests exécutés

### Tests ciblés frontend

PASS :

- `crm-business-timezone.test.ts` ;
- `business-timezone-formatting.test.ts` ;
- `crm-appointment-context-b3461.test.ts` ;
- `showroom-planned-drive-action.test.ts` ;
- `harmonisation-fr-b347.test.ts`.

Les cas couvrent les cinq horaires exigés dans trois fuseaux, les valeurs invalides, la comparaison future, l'aller-retour formulaire/API, la permission, les statuts et la règle temporelle du bouton.

### Tests ciblés backend

PASS :

- `planned-test-drive-progression.test.ts` ;
- `commercial-final-workflow.test.ts` ;
- `corr-erp-02d-test-drive-locking.test.ts` ;
- `crm-appointment-reliability.test.ts` ;
- `crm-functional-reliability.test.ts` ;
- `crm-realtime-security.test.ts` ;
- `showroom-crm-essai-fix.test.ts`.

Le nouveau test comportemental emploie une connexion transactionnelle simulée et vérifie les requêtes réellement appelées, leur ordre et l'absence d'écriture lors d'un refus.

`test-drive-return-gate.test.ts` conserve un échec environnemental : Supertest tente une écoute sur `0.0.0.0` et reçoit `EPERM`. Les cinq autres cas de ce fichier passent lors de son exécution isolée précédente. Ce résultat n'est pas assimilé à une anomalie métier.

### Campagne frontend complète

- 197 fichiers exécutés ;
- 196 PASS après adaptation du contrôle d'harmonisation ;
- 1 FAIL préexistant : `commercial-role-alignment.test.ts`, assertion statique obsolète sur l'action d'émission d'un devis modifiée avant cette mission ;
- aucune régression attribuable aux corrections CRM présentes.

### Campagne backend complète

La campagne a été lancée. Plusieurs anciens tests HTTP ont rencontré `listen EPERM`; un test documentaire a déclenché une assertion native du runtime Node 24, puis la campagne est restée bloquée et a été interrompue proprement. Elle ne constitue pas une validation complète. Les groupes ciblés ci-dessus sont les preuves retenues.

### Contrôles techniques

- lint frontend : PASS ;
- build frontend : PASS, 2 517 modules ;
- lint backend : PASS ;
- build backend : PASS ;
- `git diff --check` : PASS.

## 7. Recette fonctionnelle

Le parcours fonctionnel a été validé au niveau comportemental automatisé jusqu'aux mutations et transitions transactionnelles. La recette navigateur réelle avec création d'un prospect fictif, rendez-vous, essai, retour et observation multiutilisateur n'a pas été exécutée : les conteneurs locaux n'ont pas été reconstruits avec ce code et aucune session/donnée fictive isolée n'était disponible dans cette mission.

Aucune donnée métier existante n'a été modifiée et aucune prétention de recette navigateur n'est formulée.

## 8. Anomalies restantes et risques

- Réserve de recette réelle : confirmer le rendu, les toasts, Socket.IO et la persistance après actualisation sur une pile locale reconstruite.
- Réserve de campagne : corriger séparément le test statique de devis et l'infrastructure des tests Supertest/Node 24.
- Risque historique maîtrisé : aucune date antérieure n'a été recalculée. Leur provenance doit être auditée avant toute éventuelle reprise de données.
- Le contrat UTC des `DATETIME` reste dépendant de la configuration actuelle du serveur MySQL/backend; aucune configuration globale n'a été changée afin de ne pas risquer les données existantes.

## 9. Conditions nécessaires avant déploiement

1. revue du diff local et validation de la convention UTC/Brazzaville ;
2. reconstruction des seuls services frontend/backend dans un environnement local autorisé ;
3. recette navigateur complète avec deux profils RBAC et données fictives ;
4. preuve du stage `test_drive`, de la progression 55 %, de l'événement temps réel et de la persistance après rafraîchissement ;
5. non-régression du démarrage immédiat, du retour et de l'annulation ;
6. sauvegarde et procédure de retour arrière habituelles avant tout déploiement ultérieurement autorisé.

## 10. Contraintes respectées

Aucune migration, suppression, réinitialisation MySQL, modification RBAC, intervention VPS, modification de production, suppression de volume, création de commit, push ou déploiement n'a été effectué.
