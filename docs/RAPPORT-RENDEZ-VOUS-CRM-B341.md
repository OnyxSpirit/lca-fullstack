# Rapport — Fiabilisation des rendez-vous CRM (lot B.3.4.1)

## 1. Résumé exécutif

Le parcours CRM empêche désormais un rendez-vous actif en doublon pour le même prospect, la même opportunité et le même créneau exact. Le contrôle est effectué côté backend, dans la transaction, après verrouillage de l’opportunité parente. Une dérogation de chevauchement d’agenda ne peut pas contourner cet invariant métier.

Le rendez-vous actif est exposé au frontend. Un utilisateur disposant de `crm.prospect.update` peut reporter ou annuler ce rendez-vous. Le report conserve les identifiants existants ; l’annulation conserve les lignes historiques et leur motif. Après annulation, une nouvelle planification redevient possible.

Verdict : **VALIDÉ AVEC RÉSERVES**. Les tests applicatifs, lint et builds passent. Une concurrence réelle entre deux transactions MySQL 8.4 et la recette navigateur restent à exécuter dans un environnement isolé autorisé.

## 2. Cause racine

La création verrouillait déjà l’agenda du commercial et refusait les chevauchements, sauf dérogation autorisée. Elle ne formulait toutefois aucun invariant propre au dossier commercial (`lead_id`, `opportunity_id`, type rendez-vous, créneau, statut actif). La dérogation d’agenda pouvait donc autoriser un doublon métier et aucune route dédiée ne permettait de reporter ou d’annuler proprement le rendez-vous.

Le bouton frontend limitait le double-clic grâce à l’état `isPending`, mais cette protection ergonomique n’était pas un invariant serveur.

## 3. Modèle et statuts existants

- `activities` porte le type `appointment`, le sujet, la description, `due_at` et le statut visible.
- `follow_ups` porte le rendez-vous opérationnel : prospect, opportunité, responsable, activité liée, créneau, durée et état.
- Statut actif retenu : `pending`.
- Statuts terminaux pour la détection de doublons : `completed`, `cancelled`, `overdue`.
- Les codes persistés n’ont pas été renommés.
- Une annulation met `follow_ups` et `activities` à `cancelled`, renseigne leur date terminale et conserve le motif dans les champs historiques existants.

## 4. Définition métier du doublon

Un doublon est un `follow_up` :

- du même `lead_id` ;
- de la même `opportunity_id` ;
- lié à une activité de type `appointment` ;
- au même `scheduled_at` ;
- encore au statut `pending`.

Un rendez-vous à un autre horaire, un autre prospect ou une autre opportunité n’est pas un doublon. Un rendez-vous terminal ne bloque pas une nouvelle planification. Le texte du sujet ou de la description n’est pas utilisé comme identité métier.

## 5. Routes et contrôles backend

### Création

`POST /api/leads/:id/appointments`

Dans la transaction :

1. verrouille l’opportunité avec `FOR UPDATE` ;
2. recherche le doublon métier actif ;
3. retourne HTTP 409 et `CRM_APPOINTMENT_DUPLICATE` si nécessaire ;
4. contrôle ensuite les conflits d’agenda du commercial et les essais routiers ;
5. insère l’activité et le `follow_up` seulement en l’absence de conflit.

Message français : « Un rendez-vous actif existe déjà pour ce prospect sur ce créneau. »

Le rejet survient avant insertion. Les appels de notification et de Socket.IO, placés après la transaction, ne sont donc jamais exécutés sur ce refus.

### Report / modification

`PATCH /api/leads/:id/appointments/:appointmentId`

- Permission : `crm.prospect.update` avec les scopes existants.
- Le rendez-vous doit appartenir au prospect et à l’opportunité accessibles.
- Seul un rendez-vous `pending` est modifiable.
- Le rendez-vous lui-même est exclu du contrôle de doublon et de conflit.
- Les lignes `follow_ups` et `activities` sont mises à jour ; aucun nouvel identifiant et aucune nouvelle activité ne sont créés.
- Le hint temps réel est `appointment_updated`.

### Annulation

`POST /api/leads/:id/appointments/:appointmentId/cancel`

- Permission : `crm.prospect.update` avec les scopes existants.
- Motif obligatoire.
- Aucune suppression physique.
- Les deux lignes liées passent à `cancelled` dans une transaction.
- Le hint temps réel est `appointment_cancelled`.

## 6. Stratégie de concurrence

MySQL/InnoDB sérialise les créations d’un même contexte grâce au verrou exclusif sur la ligne `opportunities`. Le contrôle du doublon et l’insertion sont exécutés après l’acquisition de ce verrou et dans la même transaction. Une seconde transaction attend la première, puis voit la ligne `pending` validée et reçoit HTTP 409.

Le verrou sur le commercial est conservé pour les conflits d’agenda transversaux. Aucune contrainte unique trop large n’a été ajoutée, car MySQL ne fournit pas directement un index unique conditionnel sur le seul statut actif et les données historiques peuvent déjà contenir des cas à qualifier.

Aucune migration n’est nécessaire.

## 7. Frontend

- Le DTO prospect expose le rendez-vous actif : identifiant, date, durée et sujet.
- Le détail CRM affiche le prochain rendez-vous actif.
- Actions **Reporter le RDV** et **Annuler le RDV** conditionnées par `crm.prospect.update`.
- Le report réutilise la modale existante et préremplit date/durée.
- Après une annulation, le bouton **Planifier un RDV** est disponible si aucun rendez-vous actif ne subsiste.
- Le HTTP 409 affiche le message backend, ne ferme pas la modale et conserve le créneau saisi.
- Les boutons utilisent les états `loading`, ce qui évite les doubles soumissions de la même instance UI.
- Les invalidations TanStack existantes couvrent liste, activités et notifications.

## 8. Notifications et temps réel

- Création : comportement existant conservé (`appointment`).
- Report : notification « Rendez-vous commercial reporté » et hint `appointment_updated`.
- Annulation : notification « Rendez-vous commercial annulé » et hint `appointment_cancelled`.
- Les événements restent des hints minimaux ; le client recharge les données sous son RBAC courant.
- Un refus de doublon ne produit ni notification, ni événement, ni historique fictif.

## 9. RBAC et scopes

- Création : `crm.appointment.create`.
- Report/annulation : `crm.prospect.update`.
- Les accès passent par `accessibleLead`, puis par les scopes existants `OWN`, `AGENCY`, `CONCESSION`, `GLOBAL`.
- Les recherches de doublon sont effectuées uniquement après validation de l’accès au prospect et ne retournent aucune information sur un rendez-vous hors périmètre.
- Aucune permission ni règle territoriale n’a été ajoutée ou assouplie.

## 10. Tests

### Backend

Campagne ciblée : **36/36 PASS**.

Elle couvre notamment :

- première création ;
- doublon exact HTTP 409 sans écriture ;
- autre créneau autorisé ;
- ordre verrou → contrôle → insertion ;
- dérogation incapable de contourner le doublon métier ;
- report avec identifiant conservé ;
- auto-exclusion ;
- collision lors du report ;
- annulation sans suppression ;
- impossibilité de réécrire un état terminal ;
- transitions CRM, temps réel, scopes et Client 360.

### Frontend

Campagne ciblée : **14/14 PASS**.

Elle couvre notamment :

- saisie `datetime-local` ;
- création nominale ;
- message HTTP 409 ;
- conservation de la modale et du créneau après refus ;
- invalidations TanStack et temps réel CRM.

### Qualification technique

- Lint backend : PASS.
- Build backend : PASS.
- Lint frontend : PASS.
- Build frontend : PASS.
- `git diff --check` : PASS.

## 11. Tests MySQL et recette navigateur

Le code n’introduit aucune migration. Aucun serveur MySQL 8.4 temporaire autorisé ni environnement navigateur local authentifié n’a été mis en service pendant cette mission. Les conteneurs et bases existants n’ont pas été touchés.

Réserves à lever :

1. exécuter deux créations identiques réellement concurrentes sur MySQL 8.4 isolé et confirmer une création/une réponse 409 ;
2. tester rollback, report et annulation sur cette base temporaire ;
3. effectuer la recette navigateur création, doublon, conservation de saisie, report, annulation, nouvelle planification, historique et mobile.

## 12. Données historiques et risques

Aucune donnée historique n’est modifiée ou fusionnée automatiquement. Les éventuels doublons préexistants restent visibles et doivent être qualifiés métier. Lorsqu’il en existe plusieurs, le contrat prospect expose le premier rendez-vous actif dans l’ordre chronologique ; aucune suppression silencieuse n’est effectuée.

Le risque résiduel principal est l’absence de preuve MySQL concurrente réelle. Le mécanisme InnoDB retenu est déterministe et testé structurellement, mais le verdict complet reste suspendu à cette recette isolée.

## 13. Fichiers modifiés

- `backend-node/src/modules/crm/crm.routes.ts`
- `backend-node/src/modules/crm/crm.realtime.ts`
- `backend-node/test/crm-appointment-integrity-b341.test.ts`
- `backend-node/test/crm-appointment-concurrency-b341.test.ts`
- `frontend/src/api/erpHooks.ts`
- `frontend/src/modules/crm/CrmPage.tsx`
- `frontend/src/modules/crm/crmAppointmentPolicy.ts`
- `frontend/src/types/index.ts`
- `frontend/test/crm-appointment-duplicate-b341.behavior.test.ts`
- `docs/RAPPORT-RENDEZ-VOUS-CRM-B341.md`

## 14. Préservation des autres lots

La migration 093, le référentiel GARAGE, les transferts véhicules, la pagination Clients B.3.4.5.1, les sept paginations Client 360, le bouton GED Aperçu, les signatures/cachets et les workflows financiers n’ont pas été modifiés. Aucun commit, push, déploiement, accès VPS, changement de branche, reset, restore, stash ou clean n’a été effectué.
