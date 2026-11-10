# Phase 2C-1 — Autorisations centrales, transversales et inter-agences

## Principe cible

Le scope répond uniquement à « quelles données de l'agence active ? » : `OWN` ou `AGENCY`. Une capacité centrale répond à « cette opération système ou multi-agences est-elle permise ? » et doit être testée séparément par `assertCentralAgencyPermission`. Elle ne doit pas être encodée par un troisième niveau de données.

## Carte de décision

| Fonction actuelle | Classe | Contrôles cibles | Décision 2C-2 |
|---|---|---|---|
| SUPER_ADMIN système | B | rôle système unique actif, permission centrale ; toutes agences présentes/futures | conserver sans `user_agency_roles` artificiels |
| Gestion agences | B | permission centrale, validation concession/tenant | migrer `settings.agencies.*` vers contrôle central |
| Catalogue rôles/permissions et politiques 2FA | B | contrôle central explicite, audit avant/après | dissocier du GLOBAL |
| Paramètres communs, types RH, checklist, cachets | B ou A | déterminer commun vs override agence | décision métier préalable, pas de remplacement automatique |
| Reporting consolidé | D | permission report transverse + liste d'agences autorisée | nouvel objet/policy de sélection, aucun `1=1` implicite |
| Affectation prospect/client/showroom | A/C | lecture+écriture source ; acceptation/droit destination si agence change | scinder affectation locale et transfert |
| Transfert véhicule | C | droit source, droit destination, statut compatible, transaction, audit | utiliser deux contextes d'agence explicites |
| Transfert pièces/stock | C | stock source, emplacement destination, idempotence, double audit | vérifier les deux agences, pas seulement `sourceAgencyId` |
| Transfert trésorerie | C | comptes source/destination, devise, séparation des tâches | deux autorisations et contrôles de solde atomiques |
| Prestataire multi-agences | C | rattachement actif dans chaque agence, contrat et rémunération bornés | scope sur assignment, pas sur profil global |
| Notifications, Socket, tâches | E | contexte système ou agence explicite, destinataires bornés | ne pas fabriquer une agence utilisateur |

## SUPER_ADMIN

La base contient exactement un rôle `SUPER_ADMIN`, actif et système, 331 permissions, un utilisateur historique et aucune affectation `user_agency_roles`. C'est compatible avec l'objectif central. Le nouveau service reconnaît ce rôle indépendamment de l'agence active. Le risque est ailleurs : 329 associations restent stockées en `GLOBAL`, et les scripts de bootstrap/provisioning continuent à remplir ce scope. La phase 2C-2 doit conserver le comportement tout en cessant d'utiliser `GLOBAL` comme sémantique de données : capacité centrale pour les opérations B/D, et accès agence choisi explicitement pour les opérations A.

## Workflows inter-agences

Pour tout workflow C, le contrat minimal est :

1. résoudre la ressource et l'agence source depuis MySQL ;
2. vérifier la permission métier dans la source ;
3. résoudre la destination depuis MySQL et vérifier qu'elle est active ;
4. vérifier une permission destination ou une permission centrale de transfert selon la décision métier ;
5. verrouiller ressource et agrégats (`FOR UPDATE`) ;
6. revalider la version du contexte actif ;
7. écrire le mouvement, les snapshots source/destination et l'audit dans une transaction ;
8. émettre les événements dans les deux rooms seulement après commit ;
9. garantir idempotence et reprise.

Les zones concrètes sont `vehicle_movements`, transferts de stock pièces, `treasury.transfer.create`, réaffectations CRM/client/showroom, rattachements prestataires et fonds SAV (`service.transit.*`). Une permission AGENCY côté source n'autorise jamais implicitement la destination.

## Reporting transversal

`report.routes.ts` traite actuellement `CONCESSION` et `GLOBAL`, refuse certains agrégats OWN et accepte des comparaisons d'agences selon le rang. La cible est : `reporting.view`/`export` en OWN ou AGENCY pour l'agence active ; une capacité D distincte pour consolidation ; résolution serveur de la liste d'agences ; filtre SQL injecté avant agrégation ; export reprenant exactement le même jeu de données ; journalisation des agences et filtres utilisés.

## Traitements E

- Socket.IO : room utilisateur et room agence active ; validation session/version avant join et à chaque action sensible.
- Notifications : `actor_type=SYSTEM` pour l'automatisation, `operation_agency_id` nullable ou explicite selon l'événement ; ciblage destinataire indépendant d'un faux JWT.
- Bootstrap/provisioning : contexte système, idempotent et audité ; pas de permission métier simulée.
- Génération PDF/CSV : hérite d'une décision d'accès déjà validée ou d'un job signé contenant la liste bornée d'agences.
- Aucun scheduler métier autonome important n'a été identifié dans `src`; les scripts et callbacks asynchrones existants doivent néanmoins propager une enveloppe de contexte immuable.

## Décisions métier requises avant codage

1. Paramètres fiscaux, constructeurs, types RH, checklist, cachets et tarifs : communs concession ou surcharge par agence ?
2. Qui peut déléguer les fonctions centrales en dehors de SUPER_ADMIN ?
3. Un transfert exige-t-il validation de la destination ou une seule capacité centrale ?
4. Quelles agences un rôle de reporting transverse peut-il consolider ?
5. Quelles règles définissent OWN pour client, document, vente, OR et notification ?

Sans ces décisions, transformer `CONCESSION/GLOBAL` en AGENCY réduirait des fonctionnalités ou élargirait silencieusement des droits.
