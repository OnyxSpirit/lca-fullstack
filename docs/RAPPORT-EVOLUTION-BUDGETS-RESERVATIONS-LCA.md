# Rapport d’évolution — Budgets, réservations et trésorerie LCA

Date : 14 octobre 2026  
Périmètre : code source local uniquement. Aucun conteneur, volume, service distant ni donnée métier n’a été modifié.

## 1. Résumé exécutif

La protection P0 des liquidités réservées est corrigée dans le code : toute sortie, y compris un décaissement budgétaire, est désormais confrontée aux réservations actives des autres dépenses. Les budgets RH restent l’unique source de vérité et sont maintenant consultables depuis Treasury. Les rallonges et les réservations disposent d’un workflow demande/soumission/décision avec séparation demandeur-approbateur.

État global : **implémenté dans le code et validé statiquement, non qualifié transactionnellement sur MySQL 8.4**. La migration 083 n’a pas été appliquée à la base métier.

## 2. Architecture existante réutilisée

- Tables conservées : `budgets`, `budget_expenses`, `budget_fund_movements`, `budget_approval_history`, `treasury_accounts`, `treasury_movements`, `treasury_reservations`.
- Services réutilisés : transactions MySQL, calcul de solde Treasury, contrôles territoriaux et mécanisme central `writeAudit`.
- Routes et hooks RH réutilisés par la nouvelle vue Treasury : aucune table `treasury_budgets` et aucun second modèle budgétaire.
- RBAC dynamique conservé : les permissions sont enregistrées dans le référentiel sans attribution automatique à un rôle métier.

Statut : **implémenté, testé statiquement**.

## 3. Corrections P0

L’exception accordée à `BUDGET_EXPENSE_DISBURSEMENT` dans `postMovement` a été supprimée. Le contrôle s’applique maintenant à toute sortie. Lorsqu’une réservation est fournie au décaissement, son identifiant est transmis au service Treasury afin que seul son propre reliquat puisse être exclu du montant protégé.

La disponibilité est calculée strictement par `solde comptable - réservations actives protégées`; une valeur négative n’est plus masquée par un retour automatique à zéro.

Statut : **implémenté, testé statiquement, non testé en concurrence réelle MySQL**.

## 4. Protection des liquidités

- Sans réservation : le décaissement est limité à la liquidité réellement non réservée.
- Avec réservation : le contrôle exclut uniquement la réservation explicitement rattachée à la dépense; les autres réservations restent protégées.
- La consommation s’exécute dans la transaction du décaissement et contrôle état actif, dépense, compte, devise et reliquat.
- Le verrouillage `FOR UPDATE` existant du compte et des ressources financières est conservé.
- Aucun mouvement n’est créé par la réservation elle-même.

Statut : **implémenté; invariants couverts par inspection automatisée; scénarios de concurrence non exécutés**.

## 5. Gouvernance des budgets

- Modification autorisée uniquement pour un budget `draft` ou `rejected`.
- Soumission, approbation, rejet et resoumission conservent le modèle existant.
- Un budget actif n’est pas modifiable directement sur son enveloppe.
- La modification est contrôlée par permission, périmètre, validation serveur et audit.

Limite : l’écran Treasury partagé couvre surtout consultation et décisions; la création et l’édition détaillée restent exposées dans RH afin de réutiliser les écrans existants.

Statut : **implémenté côté serveur; interface Treasury partielle pour création/édition; testé statiquement**.

## 6. Approbation des rallonges

La route historique d’ajout de fonds crée désormais une entrée `budget_fund_requests` au statut `SUBMITTED`; elle ne modifie plus immédiatement l’enveloppe. L’approbation verrouille la demande, contrôle que le budget est actif, interdit l’auto-approbation, crée exactement un `budget_fund_movements`, puis relie ce mouvement à la demande. Le rejet conserve motif et décideur sans modifier l’enveloppe.

Statut : **implémenté, testé statiquement, non testé transactionnellement**.

## 7. Gestion des clôtures

La clôture refuse un budget comportant au moins une demande de rallonge soumise, une dépense approuvée non soldée ou une réservation active avec reliquat. Aucun engagement ni aucune réservation n’est supprimé ou libéré automatiquement.

Statut : **implémenté, testé statiquement**.

## 8. Workflow des réservations

Cycle introduit : `DRAFT → SUBMITTED → ACTIVE` ou `REJECTED`, puis selon l’état `CANCELLED`, `RELEASED`, `CONSUMED` ou `EXPIRED`.

- La création enregistre dépense métier, compte, montant, motif, bénéficiaire, échéance et clé d’idempotence; elle n’immobilise aucun fonds.
- La soumission et la décision sont distinctes.
- L’approbation interdit l’auto-approbation et recalcule les disponibilités et le reste réservable.
- Annulation avant activation; libération ou expiration explicite après activation.
- Les anciennes réservations sont marquées comme héritées par la migration, sans faux approbateur.

L’ajustement serveur existant est sécurisé en diminution uniquement. L’augmentation doit passer par une nouvelle demande approuvée. Son exposition UI dédiée reste **partiellement implémentée** : le hook existe, mais aucun formulaire d’ajustement n’a été ajouté dans ce lot.

Statut : **implémenté sauf formulaire d’ajustement UI; testé statiquement; non testé transactionnellement**.

## 9. Consommation et libération

La consommation partielle ou totale demeure atomique avec le décaissement. La libération, l’annulation, le rejet et l’expiration utilisent maintenant une modale demandant un motif utilisateur; aucun motif de libération codé en dur n’est envoyé. La libération et l’expiration ne créent aucun encaissement fictif.

Statut : **implémenté, build frontend validé; recette navigateur non exécutée**.

## 10. Intégration RH/Treasury

La section `Budgets & engagements` de Treasury consomme les mêmes routes et hooks RH. Les demandes et décisions de rallonge sont donc immédiatement issues de la même source de données. Aucun modèle parallèle n’a été ajouté.

Statut : **implémenté, testé statiquement**.

## 11. Interfaces développées

- Onglet Treasury `Budgets & engagements`.
- Affichage enveloppe, engagé, disponible à engager et période.
- Actions conditionnées par permissions : soumettre, approuver, rejeter, clôturer, demander/approuver/rejeter une rallonge.
- Formulaire de réservation avec sélecteur de dépense éligible, bénéficiaire et échéance.
- Sélecteur facultatif d’une réservation active lors d’un décaissement budgétaire.
- Actions de réservation et modale de motif.

Statut : **implémenté partiellement** pour le périmètre cible; création/édition détaillée de budget et ajustement de réservation restent dans leurs interfaces/hooks existants. **Build et lint validés; navigateur non testé**.

## 12. Permissions RBAC

Permissions additives :

- `hr.budget.fund.request`
- `hr.budget.fund.request.view`
- `hr.budget.fund.approve`
- `treasury.reservation.submit`
- `treasury.reservation.approve`
- `treasury.reservation.cancel`
- `treasury.reservation.expire`

Les contrôles `AGENCY`, `CONCESSION` et `GLOBAL` réutilisent les prédicats territoriaux existants. `OWN` n’est pas utilisé comme contournement pour ces ressources collectives. Aucune permission n’est affectée automatiquement à un rôle, et aucun nom de rôle n’est codé en dur.

Statut : **implémenté, testé statiquement; matrice RBAC réelle non testée en base isolée**.

## 13. Historique et audit

Les décisions de budget, rallonge et réservation sont journalisées via l’infrastructure d’audit existante et/ou leurs historiques spécialisés. Les demandes conservent demandeur, dates, décideur, motif et référence de mouvement. Les opérations historiques ne sont ni réécrites ni attribuées artificiellement.

Statut : **implémenté, non testé sur MySQL**.

## 14. Migration

Migration additive créée : `083_financial_workflow_hardening.sql`.

Elle ajoute `budget_fund_requests`, enrichit le cycle et les métadonnées de `treasury_reservations`, étend les types d’événements et ajoute les permissions dynamiques. Elle ne supprime ni ne recrée aucune table financière et ne modifie aucune migration historique.

État : **créée, non appliquée à la base métier, non exécutée sur MySQL 8.4 isolé**.

## 15. Tests exécutés

- `backend-node`: `npm run lint` — succès.
- `backend-node`: `npm run build` — succès.
- `frontend`: `npm run lint` — succès.
- `frontend`: `npm run build` — succès, 2 493 modules transformés.
- Backend ciblé : `node --experimental-test-module-mocks --import tsx --test test/tres-financial-workflows.test.ts` — succès.
- Frontend ciblé : `node --import tsx --test test/tres-financial-workflows.test.ts` — succès.
- `git diff --check` — succès.
- SHA-256 archive officielle — conforme : `7a05ce52ace2033a5beb0b1f8ff967e346f4e63c8c0fe20bf29b91b0500ea3cc`.

## 16. Résultats des tests

Les tests ciblés regroupent les exigences TRES-01 à TRES-30 sous forme de contrôles structurels du code, des routes, des permissions et de la migration. Les deux fichiers ciblés passent sans échec. Les builds confirment la cohérence TypeScript et la production des bundles.

Une tentative involontaire de lancement de la suite complète, due au placement du filtre après le glob npm, a rencontré des tests historiques déjà dépendants de services externes ou de motifs textuels, puis a été interrompue. Elle n’est pas utilisée comme preuve de qualification de ce lot. Le test frontend via le script npm a aussi rencontré une interdiction sandbox `EPERM` sur le socket IPC de `tsx`; l’exécution directe par `node --import tsx` du même fichier ciblé a réussi.

## 17. Tests non exécutés et raisons

- Tests transactionnels MySQL 8.4, migrations 079/082→083, concurrence, deadlocks, rollback et idempotence réelle : **non exécutés**, faute de base isolée provisionnée et afin de respecter l’interdiction d’écrire dans la base métier.
- Recette API authentifiée et navigateur : **non exécutée**, car Docker ne devait être ni reconstruit ni redémarré et la migration 083 n’est pas appliquée.
- Tests de permissions/scopes sur des utilisateurs réels : **non exécutés**, pour la même raison.
- Suite complète de non-régression : **non qualifiée**; elle contient des dépendances et échecs historiques hors périmètre.

## 18. Risques résiduels

1. La sûreté transactionnelle et la résistance à la concurrence restent à démontrer sur MySQL 8.4 isolé.
2. Le rejeu d’un même décaissement avec une clé d’idempotence identique mais un `reservationId` différent n’est pas distingué par la table historique actuelle; ce cas doit être couvert lors de la qualification transactionnelle avant mise en service.
3. L’interface d’ajustement de réservation n’est pas exposée, bien que l’API limite désormais l’ajustement à une diminution cohérente.
4. L’interface Treasury ne duplique pas tous les formulaires RH; création et édition avancée restent dans RH.
5. Les nouveaux droits devront être attribués explicitement par le Super Administrateur après migration.

## 19. Fichiers modifiés ou créés

- `backend-node/database/migrations/083_financial_workflow_hardening.sql`
- `backend-node/src/modules/hr/hr.routes.ts`
- `backend-node/src/modules/treasury/treasury-coverage.service.ts`
- `backend-node/src/modules/treasury/treasury.routes.ts`
- `backend-node/src/modules/treasury/treasury.service.ts`
- `backend-node/test/tres-financial-workflows.test.ts`
- `frontend/src/api/hrHooks.ts`
- `frontend/src/api/treasuryHooks.ts`
- `frontend/src/modules/hr/BudgetExpenseDisbursement.tsx`
- `frontend/src/modules/hr/HrAdministrationPage.tsx`
- `frontend/src/modules/treasury/BudgetTreasuryPanel.tsx`
- `frontend/src/modules/treasury/TreasuryPage.tsx`
- `frontend/test/tres-financial-workflows.test.ts`
- `docs/RAPPORT-EVOLUTION-BUDGETS-RESERVATIONS-LCA.md`

Le rapport d’audit préexistant non suivi a été conservé sans écrasement.

## 20. Verdict final

**VERDICT : IMPLÉMENTATION CIBLÉE TERMINÉE, QUALIFICATION TRANSACTIONNELLE REQUISE AVANT ACTIVATION.**

La correction P0 et les workflows sont cohérents au build et aux contrôles statiques. Ils ne doivent pas être déclarés validés en production ni activés sur la base métier tant que la migration 083 et les scénarios TRES-01 à TRES-30 n’ont pas été exécutés sur une base MySQL 8.4 isolée, avec une attention particulière à la concurrence, au rollback, à l’idempotence et aux scopes RBAC.

Aucun commit, push, tag, reset, restore, stash, clean, changement de branche, rebuild Docker ou déploiement n’a été effectué.
