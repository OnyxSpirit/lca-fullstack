# Phase 2C-2A — Infrastructure commune d'autorisation

Date : 10 novembre 2026. Cette phase prépare l'adoption progressive du RBAC multi-agences. Aucun endpoint métier n'est migré et aucun scope, rôle, permission ou lien rôle-permission n'est modifié.

## 1. Audit initial

Les mécanismes 2B sont opérationnels : contexte par session et agence active, fusion de rôles d'agence, SUPER_ADMIN système résolu depuis MySQL, changement d'agence versionné, guards Express, synchronisation Socket.IO et détection d'un contexte obsolète.

Trois lacunes communes ont été corrigées :

- `resolveAgencyDataScope` acceptait encore `GLOBAL` en produisant `1=1` ;
- `assertAgencyResource` pouvait accepter une propriété pré-calculée au lieu d'une règle serveur ;
- l'enveloppe transactionnelle verrouillait la session mais ne rechargeait pas systématiquement les rôles et affectations avant l'écriture.

Les quatre scopes historiques restent intégralement supportés par le RBAC historique et par la résolution de contexte. Seuls les nouveaux contrats métier refusent `CONCESSION` et `GLOBAL`.

## 2. Architecture et contrats

### Permission métier

`assertAgencyBusinessPermission` et `requireAgencyBusinessPermission` exigent une permission effective et un scope `OWN` ou `AGENCY`. Une attribution historique `CONCESSION` ou `GLOBAL` est refusée par défaut dans un endpoint migré. `assertAgencyPermission` reste disponible pour la compatibilité 2B et les usages non encore migrés.

### Ressource métier

`authorizeAgencyResource<T>` reçoit un identifiant opaque et une `AgencyResourceStrategy<T>` :

- `load` charge la ressource côté serveur, éventuellement avec verrou partagé ou exclusif ;
- `agencyId` extrait l'agence réelle de la ressource, y compris via une relation indirecte ;
- `isOwner` définit la propriété métier du module.

`OWN` refuse l'accès si `isOwner` est absent ou faux. `AGENCY` exige que l'agence réelle soit l'agence active. Un verrou de ressource est interdit hors transaction. Aucun booléen client `owned` ni `agencyId` client n'est une preuve d'accès.

`assertAgencyResource` est conservé comme compatibilité 2B, mais n'accepte plus de booléen `owned`. Les nouvelles migrations doivent employer `authorizeAgencyResource`.

### SQL

`resolveAgencyDataScope` est désormais le constructeur sûr des futurs modules :

- uniquement `OWN` ou `AGENCY` ;
- nom de colonne d'agence validé comme identifiant SQL ;
- agence active toujours liée par paramètre ;
- prédicat OWN fourni explicitement par le module ;
- paramètres OWN liés séparément ;
- rejet de fragments vides, `1=1`, commentaires et séparateurs SQL ;
- refus par défaut si la stratégie est incomplète.

Le contrat ne tente pas de résoudre universellement les appartenances indirectes. Une liste ou un détail complexe doit utiliser une stratégie propre au module.

### Écritures et concurrence

`withCurrentAgencyAuthorization` :

1. ouvre une transaction ;
2. recharge le contexte depuis MySQL dans cette transaction ;
3. compare agence active et version au contexte de la requête ;
4. verrouille la session `FOR SHARE` ;
5. verrouille l'affectation active et les lignes de rôles/permissions, ou le vrai lien SUPER_ADMIN ;
6. exécute le callback avec la connexion et le contexte frais ;
7. commit ou rollback via l'utilitaire transactionnel existant.

Un changement d'agence, une révocation de session ou un retrait intervenu avant l'écriture est donc observé. Un changement concurrent des lignes verrouillées attend la fin de la transaction. La ressource métier reste à verrouiller par la stratégie du module avec `lock: 'update'` lorsque l'opération le nécessite.

### Autorisation centrale

`assertCentralAgencyPermission` conserve strictement la règle 2B : rôle `SUPER_ADMIN`, `is_system=TRUE`, actif, utilisateur actif et permission présente. Aucun rôle délégué n'est créé et aucun scope historique n'est automatiquement converti en capacité centrale.

### Inter-agences

`assertInterAgencyAuthorization` exige :

- agence source égale à l'agence active ;
- scope source OWN ou AGENCY ;
- source et destination distinctes ;
- callback `destinationAuthorization` obligatoire et fourni par le module.

Ce contrat empêche l'héritage implicite des droits source. Il ne définit volontairement ni permission destination, ni acceptation, ni états métier : ces décisions restent propres au transfert concerné.

## 3. Activation progressive

Chaque endpoint doit être migré explicitement et déclarer : permission, scope cible, stratégie de ressource, règle OWN, colonne/relation d'agence, verrou requis, éventuelle règle destination et tests négatifs. Aucun feature flag global, middleware automatique ou conversion silencieuse n'est introduit.

Ordre technique conforme à 2C-1 : notifications/activité/auth personnel ; administration centrale ; CRM/clients/showroom/devis ; véhicules/transferts ; ventes/livraisons/facturation ; pièces/SAV ; RH/trésorerie ; reporting et traitements techniques.

## 4. Tests réalisés

### Tests TypeScript ciblés

Fichiers : `agency-authorization.test.ts`, `agency-rbac-context.test.ts`, `agency-realtime-mysql.integration.test.ts`, `auth-session-revocation.test.ts`, `treasury-realtime-attachment.test.ts`.

Résultat final : 5 fichiers réussis, 0 échec. Les scénarios couvrent permission accordée/refusée, fusion, refus des scopes historiques dans le nouveau contrat, OWN direct/indirect, règle absente, propriétaire falsifié, agence étrangère, ID absent, verrou hors transaction, SQL paramétré, rejet `1=1`, vrai/faux SUPER_ADMIN, destination inter-agences obligatoire, compatibilité du contexte et des rooms temps réel.

### MySQL 8.4 réel et isolé

Un conteneur `mysql:8.4` jetable a été lancé avec stockage `tmpfs`, sans volume et sans connexion aux bases LCA existantes. Le schéma a été bootstrapé jusqu'à la migration 115. `agency-rbac-context-mysql.integration.test.ts` passe : 1 test, 0 échec. Il couvre plusieurs rôles, fusion des scopes historiques, changement d'agence, contexte obsolète, retrait de rôle, affectation inactive, utilisateur inactif, faux rôle SUPER_ADMIN, vrai SUPER_ADMIN, agence créée après la session et exécution de `withCurrentAgencyAuthorization`. Le conteneur a été arrêté et supprimé après validation.

### Vérifications de compilation

- `npm run lint` : réussi (`tsc --noEmit`).
- `npm run build` : réussi.
- `git diff --check` : à exécuter dans la passe finale et consigné dans le rapport de clôture.

Une première invocation de `npm test` avec un motif a chargé tous les fichiers du glob avant filtrage ; elle a été interrompue et remplacée par les commandes Node ciblant explicitement les suites pertinentes. Aucun test frontend, navigateur ou E2E n'a été lancé.

## 5. Compatibilité

- RBAC historique : inchangé, y compris ses quatre scopes.
- Modules métier : aucun raccordement aux nouveaux guards.
- API : aucune route ni réponse métier modifiée.
- Socket.IO : aucune modification 2C-2A ; les protections 2B sont conservées et retestées.
- Sessions : version et révocation conservées ; transaction durcie par relecture et verrou.
- Base métier : aucune lecture-écriture de validation ; les écritures de test ont eu lieu uniquement dans le conteneur jetable.
- Frontend : aucun fichier modifié et aucun test lancé.

## 6. Prérequis pour chaque module

1. Écrire une stratégie de chargement de ressource depuis MySQL.
2. Définir l'agence réelle, directe ou indirecte.
3. Définir OWN par une règle fonctionnelle validée ; sinon ne pas proposer OWN.
4. Employer le guard métier OWN/AGENCY, pas le guard compatible historique.
5. Construire les listes avec `resolveAgencyDataScope` ou un SQL module-spécifique aussi strict.
6. Encapsuler les écritures dans `withCurrentAgencyAuthorization`.
7. Verrouiller la ressource et revalider ses états dans la transaction.
8. Pour un transfert, définir séparément la décision destination.
9. Émettre les événements après commit, uniquement vers les agences vérifiées.
10. Tester permission, propriétaire, autre agence, paramètre falsifié, contexte obsolète et concurrence.

## 7. Décisions métier ouvertes

- définition de OWN pour chaque famille de ressources ;
- référentiels communs ou surcharges agence pour fiscalité, types RH, checklist, cachets et tarifs ;
- permission et acteur requis côté destination pour chaque transfert ;
- règles de délégation centrale futures hors SUPER_ADMIN ;
- ensemble d'agences autorisé pour chaque reporting transversal.

## 8. Verdict

**VALIDÉ.** Les mécanismes communs sont opérationnels, testés sur MySQL 8.4 isolé, compatibles avec 2B et adoptables endpoint par endpoint. Aucune règle métier incertaine n'a été inventée.
