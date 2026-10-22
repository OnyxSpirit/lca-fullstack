# CRM-02 — Correction CRM, rendez-vous et Showroom

Date : 22 octobre 2026  
Périmètre : CRM, rendez-vous, essais routiers, disponibilité des véhicules et synchronisation Showroom  
Référence : `docs/RAPPORT-AUDIT-TEMPORALITE-CRM-SHOWROOM-CRM01.md`

## 1. Résumé exécutif

Les restrictions temporelles injustifiées identifiées par CRM-01 ont été retirées sans modifier les protections RBAC, territoriales, transactionnelles ou de kilométrage.

- Un essai `planned` peut maintenant démarrer avant, pendant ou après son horaire prévu.
- Un véhicule possédant un essai `planned` ou `in_progress` est indisponible pour tout autre essai, sans considération d'horaire.
- Deux essais utilisant des véhicules différents ne sont plus bloqués uniquement parce que le conseiller ou le créneau est identique.
- Les chevauchements de rendez-vous et d'essais deviennent des avertissements non bloquants. Le doublon exact d'un rendez-vous du même dossier reste refusé.
- Une planification émet maintenant `showroom:test-drive-planned`; `showroom:test-drive-started` est réservé au démarrage réel.
- Les sélecteurs d'essai CRM et Showroom excluent explicitement les véhicules réservés, sans modifier le sélecteur du module Devis.

Verdict : **CORRIGÉ ET TESTÉ sur les suites automatisées ciblées ; VALIDATION MYSQL RÉELLE RÉSERVÉE faute de schéma temporaire isolé préparé.**

## 2. Décisions métier appliquées

| Sujet | Décision appliquée |
|---|---|
| Horaire planifié | information d'organisation, jamais une barrière au démarrage |
| Retour | autorisé dès `in_progress`, sans durée minimale ou maximale |
| Véhicule | exclusivité absolue pendant `planned` et `in_progress` |
| Conseiller | aucun refus fondé uniquement sur un chevauchement horaire |
| Visite | un seul essai actif (`planned` ou `in_progress`) par visite |
| Rendez-vous | chevauchement signalé comme avertissement ; doublon exact toujours refusé |
| Statuts terminaux | `completed` et `cancelled` libèrent le véhicule |

## 3. Fichiers modifiés

### Code backend

- `backend-node/src/modules/showroom/showroom-test-drive.ts`
- `backend-node/src/modules/showroom/showroom.routes.ts`
- `backend-node/src/modules/vehicles/vehicle.routes.ts`
- `backend-node/src/modules/crm/crm.routes.ts`

### Code frontend

- `frontend/src/modules/showroom/showroomPolicy.ts`
- `frontend/src/modules/showroom/ShowroomPage.tsx`
- `frontend/src/modules/crm/CrmTestDriveModal.tsx`
- `frontend/src/modules/crm/CrmPage.tsx`
- `frontend/src/api/erpHooks.ts`
- `frontend/src/components/AppBootstrap.tsx`

### Tests

- tests de progression, verrouillage, contrats CRM, planification et harmonisation existants adaptés ;
- `backend-node/test/crm02-showroom-reservation-policy.test.ts` ajouté ;
- `frontend/test/crm02-test-drive-availability.test.ts` ajouté ;
- fixture MySQL de concurrence adaptée au contrat CRM-02, mais non activée sur une base existante.

## 4. Corrections backend

### Démarrage libre d'un essai planifié

`startPlannedTestDrive` ne compare plus `scheduled_at` à l'horloge courante. Il conserve :

- verrou et statut `planned` ;
- contrôle du véhicule, de l'agence, du stock commercial et de l'archivage ;
- existence du conseiller ;
- transition CRM atomique vers `test_drive` ;
- mise à jour conditionnelle vers `in_progress` et `started_at=NOW()`.

### Exclusivité du véhicule

`assertTestDriveStartAvailable` verrouille d'abord la ligne du véhicule, puis recherche tout autre essai du même véhicule avec un statut `planned` ou `in_progress`. Le filtre `excludeDriveId` permet de démarrer ou reprogrammer la réservation courante sans qu'elle se bloque elle-même.

Ce verrou sur la ligne `vehicles` constitue le point de sérialisation commun à deux réservations concurrentes du même véhicule.

### Rendez-vous

Les requêtes de détection de chevauchement sont conservées. Elles alimentent maintenant le tableau `warnings` de la réponse HTTP au lieu de renvoyer un 409. Le frontend affiche ces avertissements après l'enregistrement.

La permission `crm.appointment.override_conflict` reste supportée pour les clients qui envoient explicitement `overrideConflict`; son scope et sa justification restent vérifiés. Aucun nouveau workflow d'approbation n'a été créé.

Le doublon exact `lead + opportunity + scheduled_at + pending` demeure un conflit dur `CRM_APPOINTMENT_DUPLICATE`.

## 5. Corrections frontend

- `plannedDriveStartState` dépend uniquement du statut `planned` et de la permission de gestion.
- Le bouton « Démarrer l'essai » n'est plus désactivé selon l'heure prévue.
- Les horaires, fins prévues, durées prévues et durées réelles restent affichés.
- Les deux formulaires d'essai interrogent `/vehicles` avec `excludeTestDriveReserved=true`.
- Le formulaire de reprogrammation réinjecte explicitement le véhicule de la réservation courante, seul véhicule réservé qu'il doit continuer à proposer.
- Les avertissements retournés par les mutations de rendez-vous sont affichés dans un toast de type `warning`.

## 6. Règles d'exclusivité et concurrence

| Situation | Résultat |
|---|---|
| même véhicule, horaires différents | refus |
| même véhicule, essai en dépassement | refus |
| deux véhicules différents, même horaire/conseiller | autorisé |
| même visite, autre essai actif | refus |
| essai annulé ou terminé | n'immobilise plus le véhicule |
| double démarrage | refus par statut et mise à jour conditionnelle |
| double clôture | refus par statut `in_progress` |

## 7. Préservation du workflow CRM

- Le rendez-vous CRM préalable reste obligatoire.
- La création CRM exige toujours `showroom.visitor.update` et `crm.test_drive.create` avec leurs scopes respectifs.
- La transition vers `test_drive` n'a lieu qu'au démarrage réel.
- Au retour, l'essai, le kilométrage, l'activité CRM et la clôture de la visite d'origine CRM restent dans la transaction existante.

## 8. Préservation du workflow Showroom

- L'accueil, l'affectation, la prise en charge et la planification restent inchangés.
- Une visite d'origine Showroom n'est pas auto-clôturée par le retour d'essai.
- La clôture manuelle existante reste disponible selon l'état et `showroom.status.update`.

## 9. Synchronisation et notifications

- Planification : `showroom:test-drive-planned`, sujet « Essai routier planifié ».
- Démarrage : `showroom:test-drive-started`, sujet « Essai routier démarré ».
- Retour et annulation : événements historiques conservés.
- `AppBootstrap` invalide maintenant le cache Showroom sur l'événement de planification.
- Les hooks continuent d'invalider CRM, véhicules, Showroom et notifications après mutation.

## 10. Analyse UTC

Le frontend continue d'utiliser `Africa/Brazzaville` et les helpers existants de conversion des champs `datetime-local`. Aucun timestamp MySQL, aucune donnée historique et aucune configuration globale mysql2 n'ont été modifiés.

Le risque CRM-01 demeure documenté : le pool mysql2 ne fixe pas explicitement `timezone:'Z'`. Une correction globale aurait un impact transversal et n'est pas justifiée dans CRM-02 sans campagne dédiée.

## 11. Tests exécutés

### Corrigé et testé

- Backend ciblé initial : 4 fichiers, 4 PASS.
- Frontend ciblé initial : 4 fichiers, 4 PASS.
- HTTP/RBAC Showroom : 127 tests PASS, 0 FAIL.
- Assertions historiques CRM-02 mises à jour : 4 fichiers PASS.
- Lint backend : PASS.
- Lint frontend : PASS.
- Build backend : PASS.
- Build frontend : PASS.
- `git diff --check` : PASS.

Les tests couvrent explicitement : démarrage anticipé et tardif, essai ancien encore `planned`, double démarrage, retour immédiat, kilométrage, RBAC, scopes, distinction CRM/Showroom, filtre des véhicules réservés et distinction des notifications.

### Campagnes globales

- Frontend complet : 202 PASS / 1 FAIL lors du premier rejeu. L'unique échec était une assertion statique historique exigeant encore l'ancien appel temporel de `plannedDriveStartState`; elle a été adaptée puis son fichier a repassé 6/6.
- Backend complet : la campagne a confirmé les parcours CRM-02 ciblés et a exposé des assertions historiques de l'ancien contrat, ensuite adaptées et repassées. Des échecs globaux hors périmètre restent présents dans les suites Devis/RBAC et ne sont pas corrigés par CRM-02.

## 12. Tests MySQL réels

**Non exécutés.** Les seuls conteneurs MySQL 8.4 observés sont les environnements locaux `lca` et `lca-recette`, tous deux préexistants. Conformément à l'interdiction de modifier une base existante, aucune fixture n'y a été écrite.

Le test opt-in `corr-erp-02d-test-drive-mysql.integration.test.ts` a été aligné sur CRM-02. Il doit être rejoué ultérieurement sur un schéma temporaire MySQL 8.4 initialisé avec la baseline et toutes les migrations requises.

## 13. Échecs préexistants et réserves

- Les suites globales possèdent des échecs hors CRM-02, notamment sur des contrats Devis/RBAC ; ils ne sont pas causés ni corrigés par ce lot.
- La concurrence réelle MySQL 8.4 reste à exécuter sur une base temporaire isolée.
- La convention UTC serveur reste implicite et doit faire l'objet d'une intervention transversale séparée.
- Aucune recette navigateur réelle ni reconstruction Docker n'a été effectuée.

## 14. Matrice des scénarios CRM-02

| Scénarios | Statut | Preuve |
|---|---|---|
| CRM02-01 à 05 | Corrigé et testé | tests progression et retour |
| CRM02-06, 09, 10, 11 | Corrigé et testé statiquement/unitairement | exclusivité par statut et filtre API |
| CRM02-07 | Corrigé, test MySQL réel réservé | verrou ligne véhicule + fixture opt-in |
| CRM02-08 | Corrigé et testé unitairement | absence de conflit conseiller/RDV |
| CRM02-12, 13 | Testé | suites origine CRM/Showroom |
| CRM02-14 à 16 | Corrigé et testé par contrats HTTP/unitaires | avertissements, report et annulation |
| CRM02-17, 18 | Corrigé et testé | événements distincts |
| CRM02-19, 20 | Testé | matrice HTTP 127 tests |
| CRM02-21 à 23 | Testé | statuts conditionnels et kilométrage |
| CRM02-24 | Testé côté frontend | tests fuseau métier ; risque serveur réservé |

## 15. Verdict final et préparation CRM-03

**CRM-02 est techniquement corrigé et qualifié sur les tests automatisés disponibles.** Les deux réserves qui interdisent un verdict de validation intégrale sont la concurrence MySQL réelle non rejouée dans un schéma isolé et l'absence de recette navigateur réelle.

Avant CRM-03 :

1. préparer un MySQL 8.4 éphémère avec baseline/migrations complètes ;
2. activer la fixture de concurrence CRM-02 ;
3. exécuter les 24 scénarios dans le navigateur avec deux sessions/utilisateurs lorsque le scénario le requiert ;
4. traiter séparément la convention UTC serveur si sa correction transversale est autorisée.

Aucun commit, push, déploiement, accès VPS, migration ou écriture dans une base métier n'a été effectué.
