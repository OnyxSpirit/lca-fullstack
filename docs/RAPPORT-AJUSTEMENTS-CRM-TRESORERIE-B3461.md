# Rapport d’ajustements CRM et Trésorerie — Lot B.3.4.6.1

Date : 19 octobre 2026  
Projet : ERP / CRM — La Congolaise de l’Automobile

## 1. Résumé exécutif

Le score historique de qualification a été retiré des interfaces CRM et Client 360 sans supprimer `opportunities.probability`, sans migration et sans rupture des contrats API. La progression commerciale dérivée de l’étape reste la seule mesure d’avancement affichée.

Les actions de gestion d’un rendez-vous actif sont désormais limitées à l’étape `appointment` (`RDV`) dans le frontend et dans le backend. Le backend relit l’étape de l’opportunité sous verrou transactionnel avant toute écriture. La planification initiale depuis `qualified` reste possible.

Les trois KPI de la vue d’ensemble Trésorerie portent les nouveaux libellés demandés. Le quatrième est harmonisé en « Transactions internes ». Aucun agrégat, montant, filtre, scope ou contrat API n’a été modifié.

Verdict : **VALIDÉ AVEC RÉSERVES**. Les tests ciblés, lint et builds passent. La suite frontend complète finale est documentée à l’issue du rejeu. La recette navigateur authentifiée et une exécution MySQL 8.4 isolée n’ont pas été réalisées dans ce lot.

## 2. État initial

- `probability` était affiché comme qualification dans les cartes, la liste, le détail CRM et Client 360.
- `commercialProgress` et `commercialProgressState` existaient déjà et appliquaient le barème validé.
- Reporter et Annuler dépendaient de la présence d’un rendez-vous actif, mais pas de l’étape commerciale.
- Le backend verrouillait l’opportunité, sans relire son étape sous ce verrou avant report ou annulation.
- Les KPI Trésorerie étaient libellés « externe » alors que leur source agrège les mouvements `POSTED` non-transferts du périmètre accessible.

## 3. Cartographie des composants

- CRM : `frontend/src/modules/crm/CrmPage.tsx`.
- Politique rendez-vous frontend : `frontend/src/modules/crm/crmAppointmentPolicy.ts`.
- Client 360 : `frontend/src/modules/customers/CustomerDetailPage.tsx`.
- Routes CRM : `backend-node/src/modules/crm/crm.routes.ts`.
- Progression centralisée : `backend-node/src/modules/crm/crm-commercial-progress.ts`.
- Trésorerie : `frontend/src/modules/treasury/TreasuryPage.tsx` et `backend-node/src/modules/treasury/treasury.service.ts`.

## 4. Suppression visuelle du score

Les occurrences visibles ont été supprimées des cartes Kanban, de la colonne de liste, du détail CRM et des opportunités Client 360. Le tableau CRM passe correctement de dix à neuf colonnes. Les formulaires actuels n’exposaient déjà aucune saisie de `probability`; aucune saisie n’a donc été ajoutée ou déplacée.

## 5. Conservation du champ SQL et des contrats

`opportunities.probability` reste intact. Le backend continue de le sélectionner et de l’exposer, le mapper frontend historique reste compatible et les valeurs existantes ne sont ni recalculées ni modifiées. Aucune migration et aucune écriture de données n’ont été effectuées.

## 6. Progression commerciale

La fonction centrale et son contrat sont inchangés : Nouveau 0 %, Contacté 10 %, Qualifié 25 %, Rendez-vous 40 %, Essai routier 55 %, Offre et devis 70 %, Négociation 85 %, Vente gagnée 100 %. Vente perdue conserve l’état terminal distinct `LOST` et le rendu « Vente perdue ».

## 7. Workflow réel des rendez-vous

Le code persistant utilise `qualified`, `appointment`, `test_drive`, `offer`, `negotiation`, `won` et `lost`. Le rendez-vous actif est un `follow_up` de type activité `appointment` au statut `pending`. Les lignes terminales restent historiques. La planification initiale depuis `qualified` produit l’entrée dans `appointment`.

## 8. Matrice d’affichage

- `QUALIFIE`, sans rendez-vous actif : Planifier reste disponible avec `crm.appointment.create`.
- `RDV`, sans rendez-vous actif : Planifier reste possible selon le workflow existant.
- `RDV`, rendez-vous actif : Reporter/Annuler avec `crm.prospect.update`.
- `ESSAI`, `OFFRE`, `NEGOCIATION`, `GAGNE`, `PERDU` : aucune action Planifier/Reporter/Annuler du rendez-vous initial.
- Un rendez-vous historique reste consultable dans le journal, sans action de modification.

Cette matrice est centralisée dans `crmAppointmentPolicy.ts` afin d’éviter des conditions divergentes.

## 9. Contrôles backend

Création, report et annulation verrouillent la ligne `opportunities` avec `SELECT stage ... FOR UPDATE`. La création accepte uniquement `qualified` ou `appointment` au moment réellement sérialisé. Report et annulation exigent exactement `appointment`. Tout autre état retourne HTTP 409 avec le code stable `CRM_APPOINTMENT_STAGE_CONFLICT` et un message français. Le refus précède toute modification, notification ou publication temps réel.

## 10. Étapes antérieures

L’exception nécessaire au workflow est préservée : `qualified` peut planifier le premier rendez-vous. Les étapes plus anciennes non déjà autorisées ne gagnent aucune nouvelle transition. Reporter et Annuler restent interdits avant `appointment`.

## 11. Étapes ultérieures

Une opportunité passée à l’essai, l’offre, la négociation ou un état terminal ne peut plus reporter ou annuler le rendez-vous initial, même si une requête concurrente avait lu un ancien état avant le verrou.

## 12. Historique

Aucune suppression ni réécriture historique n’a été ajoutée. Les motifs, auteurs, dates et identifiants existants sont préservés. La restriction concerne les mutations du rendez-vous CRM, pas les rendez-vous SAV, Atelier ou Livraison.

## 13. Concurrence et intégrité

Le verrou de l’opportunité demeure le premier verrou métier du contexte. L’étape est relue depuis la ligne verrouillée avant les rendez-vous, conflits d’agenda et écritures. Les contrôles anti-doublon, verrous commercial/agenda et transactions B.3.4.1 sont conservés.

## 14. RBAC et scopes

Les permissions restent `crm.appointment.create` pour planifier et `crm.prospect.update` pour reporter/annuler. `accessibleLead` continue d’appliquer OWN, AGENCY, CONCESSION ou GLOBAL avant l’opération. Aucune permission ni exception de rôle n’a été ajoutée.

## 15. Notifications

Les notifications et événements Socket.IO existants sont inchangés et ne sont déclenchés qu’après succès transactionnel. Les fixtures ciblées ont été adaptées aux snapshots auteur/agence du lot B.3.4.8, sans relâcher cette exigence.

## 16. Audit des KPI financiers

`summary()` agrège, par devise et sous le prédicat territorial `treasury.view`, les mouvements `POSTED` : entrées/sorties sans `transfer_id`, puis transferts internes sortants séparés. Les périodes `from/to`, comptes accessibles, devises et scopes sont conservés. Le terme « externe » n’identifiait aucune classification comptable dédiée dans la requête ; le renommage visible est donc compatible avec le périmètre de l’ERP.

## 17. Libellés avant/après

- Solde externe net → Solde interne net.
- Entrées externes → Entrées internes.
- Sorties externes → Sorties internes.
- Transferts internes → Transactions internes.

## 18. Conservation des agrégats

Les propriétés `balance`, `totalIn`, `totalOut` et `internalTransfers`, leur formule, la requête SQL, les formats XAF, périodes, filtres et scopes n’ont subi aucune modification.

## 19. Tests backend

- Tests CRM ciblés : **16/16 PASS**.
- Couverture : barème, contrats historiques, planification initiale, verrou parent, doublons, report, annulation, rendez-vous terminal, conflit d’étape 409 et absence d’écriture.
- Lint backend : **PASS**.
- Build backend : **PASS**.

La commande historique `npm test -- ...` a imposé le glob complet du script et exposé des fixtures anciennes sans snapshots de notifications B.3.4.8. Les quatre fichiers CRM réellement ciblés ont ensuite été exécutés directement et passent tous. Les échecs hors périmètre n’ont pas été masqués.

## 20. Tests frontend

- Tests ciblés initiaux : **8/8 PASS**.
- Tests de politique : planification initiale, actions à RDV, absence après RDV.
- Tests de rendu : score absent, progression conservée, perte distincte, KPI renommés.
- Lint frontend : **PASS**.
- Build frontend : **PASS**, 2 508 modules transformés.
- Suite complète : premier passage **914/915**, avec une seule attente historique `colSpan=10`; attente corrigée à 9, puis rejeu final **915/915 PASS** en 109,660 s.

## 21. Tests MySQL

Aucune base métier n’a été touchée. Aucune migration n’est requise. Aucun environnement MySQL 8.4 temporaire n’a été créé pour ce lot ; la preuve de concurrence repose sur les tests transactionnels ciblés et l’ordre des verrous inspecté.

## 22. Non-régression

Les tests ciblés confirment la conservation de B.3.4.1 et B.3.4.6. Les lots de notifications, Client 360, Trésorerie et RBAC restent contractuellement inchangés. `git diff --check` passe avant rédaction du rapport et sera rejoué au contrôle final.

## 23. Recette navigateur

Non exécutée : aucun environnement local authentifié n’a été démarré ou reconstruit, conformément à l’interdiction de modifier les conteneurs existants. Réserve : vérifier visuellement le Kanban, la liste, le détail, Client 360, les actions RDV et les quatre KPI sur le port local autorisé lors d’une recette dédiée.

## 24. Fichiers modifiés

- `backend-node/src/modules/crm/crm.routes.ts`
- `backend-node/test/crm-appointment-concurrency-b341.test.ts`
- `backend-node/test/crm-appointment-endpoint.test.ts`
- `backend-node/test/crm-appointment-integrity-b341.test.ts`
- `frontend/src/modules/crm/CrmPage.tsx`
- `frontend/src/modules/crm/crmAppointmentPolicy.ts`
- `frontend/src/modules/customers/CustomerDetailPage.tsx`
- `frontend/src/modules/treasury/TreasuryPage.tsx`
- `frontend/test/crm-appointment-context-b3461.test.ts`
- `frontend/test/crm-commercial-progress-b346.behavior.test.ts`
- `frontend/test/table-empty-states.test.ts`
- `frontend/test/treasury-realtime-attachment.test.ts`
- `docs/RAPPORT-AJUSTEMENTS-CRM-TRESORERIE-B3461.md`

## 25. Modifications locales préservées

Le dépôt était propre au début du lot. Aucun reset, restore, stash, clean, changement de branche, commit ou push n’a été exécuté. Les migrations 093/094, archives, volumes, conteneurs et bases métier n’ont pas été modifiés.

## 26. Réserves

1. Recette navigateur authentifiée et responsive non exécutée.
2. Concurrence réelle MySQL 8.4 non rejouée sur une base temporaire isolée.
3. La campagne backend complète déclenchée initialement contient des échecs de fixtures historiques de notifications hors périmètre ; les tests backend CRM du lot passent 16/16.

## 27. Verdict final

**VALIDÉ AVEC RÉSERVES**.

Les critères bloquants du lot sont levés dans le code et les tests ciblés : score absent des interfaces ciblées, progression intacte, actions post-RDV masquées et refusées côté backend, planification initiale préservée, historique intact et calculs financiers inchangés. Les réserves portent sur les recettes d’environnement et sur les fixtures historiques hors périmètre, pas sur une régression démontrée du lot.
