# REC-02.4 — Rétablissement des comptes de recette et clôture de REC-02

Date : 20 octobre 2026  
Environnement : Docker local `lca` uniquement  
Verdict final : **VALIDÉ**

Ce rapport ne contient aucun mot de passe, code TOTP, JWT, cookie ou en-tête d'authentification.

## 1. Comptes de recette rétablis

Les quatre comptes fictifs demandés ont été rétablis au moyen de l'action officielle **Mot de passe** de l'administration Utilisateurs, depuis une session Super Administrateur authentifiée avec TOTP :

- `REC02_TREASURER` ;
- `REC02_FINANCE` ;
- `REC02_APPROVER` ;
- `REC02_PROVIDER`.

Les secrets ont été générés séparément et transmis au harnais exclusivement en mémoire dans une enveloppe RSA-OAEP éphémère. Aucun secret n'a été écrit dans le dépôt, le rapport ou les sorties de tests. Aucune table d'authentification, aucun hash SQL, aucune session et aucune règle 2FA n'ont été modifiés directement.

Le test d'authentification officielle a confirmé séparément les quatre identités et leurs permissions minimales : **1 test PASS, 0 FAIL**.

Pour disposer d'un budget isolé suffisant, la matrice RBAC officielle a ajouté strictement :

- `REC02_FINANCE` : `hr.budget.manage` et `hr.budget.submit`, scope AGENCY ;
- `REC02_APPROVER` : `hr.budget.approve`, scope AGENCY.

La séparation demandeur/approbateur est restée active. Aucun compte réel ni Super Administrateur n'a été modifié.

## 2. Anomalie corrigée

### REC02-4-001 — Rejeu idempotent bloqué après paiement intégral

La route de décaissement des rémunérations prestataires vérifiait le solde restant avant d'appeler le service Treasury idempotent. Après un premier paiement intégral, le rejeu strict avec le même `clientRequestId` recevait donc HTTP 409 avant que le service central puisse reconnaître le duplicata.

La correction supprime uniquement ce précontrôle redondant de la route. Le service central `budgetExpenseDisburse` reste l'autorité et continue de vérifier, sous transaction et verrouillage :

- la clé d'idempotence et l'égalité de la requête rejouée ;
- le montant et le solde restant ;
- le compte, la devise et le territoire ;
- l'état de la dépense et du budget ;
- les écritures de trésorerie.

Un test de non-régression empêche la réintroduction du calcul préalable dans la route et confirme la délégation au service transactionnel.

## 3. Idempotence HTTP

Résultat réel après reconstruction ciblée du backend :

- premier décaissement : HTTP 201 ;
- rejeu strict, même clé et même contenu : HTTP 200 avec duplicata reconnu ;
- aucune seconde écriture MySQL ;
- même clé avec montant modifié : HTTP 409.

La correction rétablit donc le contrat idempotent sans relâcher les validations financières.

## 4. Concurrence HTTP

Trois jeux indépendants de 600 000 XAF ont été soumis à deux décaissements simultanés de 400 000 XAF, avec des clés distinctes.

Pour chacune des trois courses :

- une requête a répondu HTTP 201 ;
- une requête a répondu HTTP 409 ;
- MySQL contient exactement un décaissement de 400 000 XAF ;
- MySQL contient exactement un mouvement Treasury associé.

Preuve répétée : `1|400000.00|1`. Aucun dépassement ni double mouvement n'a été constaté.

## 5. GED et exceptions documentaires

Le parcours complet a été exécuté :

- justificatif PAYMENT absent : décaissement refusé HTTP 409 ;
- demande d'exception puis rejet par une identité indépendante : refus maintenu HTTP 409 ;
- dépôt multipart d'un PDF fictif : accepté ;
- décaissement après dépôt : HTTP 201 ;
- téléchargement du document : contenu identique, empreinte SHA-256 vérifiée ;
- téléchargement par le trésorier dépourvu de `ged.view` : HTTP 403 ;
- seconde exception approuvée par l'approbateur distinct : décaissement HTTP 201.

Les contrôles GED, la séparation des identités et le RBAC restent effectifs.

## 6. RBAC et territorialité

Les preuves IDOR AGENCY/CONCESSION/GLOBAL acquises lors de REC-02.3 restent valides. Une écriture hors périmètre avait été refusée HTTP 403 et la valeur MySQL avant/après était identique.

La campagne REC-02.4 a utilisé quatre sessions officiellement authentifiées et distinctes. Une session Super Administrateur navigateur n'a pas été utilisée comme preuve multi-profils. Les habilitations budgétaires ajoutées sont minimales et limitées aux rôles fictifs concernés.

## 7. Preuves MySQL finales

Les lectures finales de la base locale montrent :

- budget de clôture ID 6, statut `active`, montant initial 3 000 000 XAF ;
- 6 rémunérations prestataires ;
- 6 dépenses budgétaires ;
- 6 décaissements ;
- total décaissé : 1 400 000 XAF.

Ce total correspond exactement à la campagne : 100 000 XAF d'idempotence, trois fois 400 000 XAF de concurrence, 50 000 XAF après dépôt GED et 50 000 XAF après exception approuvée.

Deux traces préparatoires autorisées restent présentes dans la base locale : budget ID 4 avec une chaîne de 100 000 XAF et budget ID 5 sans dépense. Elles sont identifiées comme données fictives REC-02.4 et n'ont pas été supprimées afin de préserver la traçabilité.

## 8. Tests et non-régression

- harnais HTTP critique REC-02.4 : **1 PASS, 0 FAIL**, durée environ 7,9 s ;
- authentification officielle des quatre comptes : **1 PASS, 0 FAIL** ;
- tests backend ciblés : **2 PASS, 0 FAIL** ;
- suite frontend complète : **959 PASS, 0 FAIL, 0 SKIP**, durée 139 425,803 ms ;
- suite backend complète : **1 925 PASS, 0 FAIL, 91 SKIP**, 2 016 tests, durée 223 702,788 ms ;
- lint frontend : PASS ;
- build frontend : PASS, 2 516 modules transformés ;
- lint backend : PASS ;
- build backend : PASS ;
- `git diff --check` : PASS.

Par rapport aux campagnes précédentes, le passage backend de 1 924 à 1 925 tests réussis correspond au nouveau test de non-régression.

## 9. État Docker final

Seul le backend local a été reconstruit et recréé, sans dépendances :

- `lca-backend-1` : healthy ;
- `lca-frontend-1` : healthy, exposé sur le port 80 ;
- `lca-mysql-1` : healthy.

Les volumes MySQL n'ont pas été supprimés ou réinitialisés. Aucune migration structurelle n'a été appliquée.

## 10. Fichiers modifiés

- `backend-node/src/modules/hr/hr-provider-remuneration.routes.ts` ;
- `backend-node/test/provider-remuneration-finance-b3423-lot6.test.ts` ;
- `backend-node/test/rec02-http-integration.ts` ;
- `docs/RAPPORT-REC02-4-CLOTURE-DEFINITIVE.md`.

## 11. Verdict et risques résiduels

Les critères critiques de REC-02.4 sont démontrés en HTTP authentifié et par lectures MySQL : authentification multi-profils, RBAC, idempotence, concurrence, GED, exceptions documentaires et intégrité financière.

**REC-02 est VALIDÉ et techniquement clôturé.**

Le seul élément résiduel est la présence volontaire des fixtures fictives de recette dans la base locale existante. Elles sont clairement identifiables par le préfixe `REC-02.4` et préservées pour la traçabilité.

Aucun commit, push, déploiement, accès VPS, migration, reset de base ou suppression de volume n'a été effectué. REC-03 n'a pas été démarré.
