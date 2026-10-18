# LOT B.3.1 — Remise à niveau des fixtures d’intégration

Date de campagne : 18 octobre 2026. Environnement : MySQL 8.4.11 isolé `lca-b31-mysql`, port local 33331, base `lca_b31`, stockage `tmpfs`, réseau dédié `lca-b31-network`. Aucun conteneur, volume ou schéma métier n’a été utilisé ou modifié.

## État et méthode

Le bootstrap officiel 071→091 est validé. Une image logique de ce schéma courant est restaurée avant chaque fichier opt-in afin d’éviter toute dépendance d’ordre. Le premier replay B.3 avait établi 29 PASS et 54 FAIL sur 83 scénarios. Le replay B.3.1 intermédiaire a établi 38 fichiers PASS et 21 fichiers FAIL (les fichiers contiennent désormais 108 tests Node réellement déclenchés, alors que l’inventaire historique comptait 83 scénarios opt-in). Ce résultat intermédiaire n’est pas un verdict de livraison.

## Causes confirmées

- JWT historiques sans `sid` et sans session persistée ;
- authentification directe supposée pour le `SUPER_ADMIN`, incompatible avec la 2FA obligatoire ;
- versions de migration historiques codées en dur ;
- fixtures de trésorerie antérieures à `attachment_type` et au workflow de réservation à quatre yeux ;
- dépendance à des données préexistantes (livraisons, visites showroom, utilisateurs, archives GED) ;
- workflows SAV antérieurs aux préconditions actuelles (devis accepté, interventions dérivées, sessions arrêtées, garantie valide) ;
- tests de migration historiques exécutés contre le baseline courant sans reconstruction isolée de leur état antérieur.

## Corrections validées

- helper MySQL commun : acteurs RBAC non système, sessions persistées, état 2FA vérifié et administrateur HTTP de recette ;
- remboursements/exports, budget-trésorerie, FIN-01/02/03/04/05/09, trésorerie manuelle et clôture ;
- RH budget agence/catégories, reporting et scopes salariaux ;
- GED marques documentaires ;
- PR-02, PR-03, PR-04 et PR-06 ;
- SAV-OR-19/20/21 et plusieurs parcours OPS ;
- retour véhicule : fixture complète et autonome, 12/12 tests de concurrence/idempotence/rollback PASS ;
- migration 085 pré-migration corrigée : la fixture n’utilise plus la colonne avant son ajout, test MySQL réel PASS ;
- provisioning admin rendu compatible avec le nom explicite d’une base jetable, 3/3 PASS ;
- fixtures showroom 02D/02E et agenda rendues indépendantes des identifiants 1/2/3.

Les réservations FIN utilisent désormais `DRAFT → SUBMITTED → ACTIVE`, un bénéficiaire, une échéance et un approbateur distinct. Aucun contrôle RBAC, 2FA, session, scope territorial ou règle des quatre yeux n’a été neutralisé.

## Validations exécutées

- `npm run lint` backend : PASS ;
- `git diff --check` : PASS ;
- migration 085 MySQL 8.4 : PASS ;
- provisioning admin : 3/3 PASS ;
- PR-04 : PASS, absence de fuite inter-agence vérifiée ;
- SAV-OR-19 : PASS, scopes OWN/AGENCY/CONCESSION vérifiés ;
- retour véhicule : 12/12 PASS ;
- FIN-03, FIN-04 et FIN-09 : PASS.

## Reliquat démontré

### Poursuite du 18 octobre 2026

Les réserves suivantes ont été levées avec preuves ciblées :

- migration historique 054→056 reconstruite dans une base indépendante : checksum publié, journal, index final et conservation de données PASS ;
- runner courant : fresh 071→091, idempotence, reprises après coupures DDL/journal, détection d'un checksum 085 falsifié, conservation de données, verrou et deux runners concurrents PASS (2/2 sous-tests) ;
- flux Treasury courant sur schéma 091 : transactions, rollback, idempotence, mapping et concurrence PASS ;
- GED/session : PDF autonome dans le stockage temporaire, téléchargement autorisé, refus immédiat après révocation puis nouvelle session légitime PASS ;
- préproduction : véritable rôle système `SUPER_ADMIN`, session persistée et 2FA vérifiée, scénario PASS ;
- Showroom 02D et 02E : identifiants dynamiques, ressources autonomes et fermeture des deux pools, PASS ;
- SAV/Pièces ciblé : PASS.

Le SAV OR04-09 a progressé jusqu'aux préconditions d'atelier actuelles. L'inspection de réception est désormais correctement considérée comme immuable après son premier enregistrement et l'administrateur technique de fixture n'est plus utilisé comme cas négatif lorsqu'il porte explicitement les permissions Atelier. Un nouveau rejeu est encore requis après le dernier ajustement.

### Reprise de finalisation du 18 octobre 2026

Quatre réserves SAV supplémentaires sont levées sur MySQL 8.4 réel :

- **SAV OR04-09 : PASS (1/1)**. La fixture crée son propre barème actif, respecte la normalisation du code, fournit les clés d'idempotence et dérive les interventions des lignes de chiffrage acceptées.
- **SAV UX03 : PASS (1/1)**. La reprise après contrôle qualité en échec fournit désormais un réel facturable confirmé avant le nouveau passage en contrôle qualité.
- **SAV OR16-18 : PASS (1/1)**. L'intervention et la ligne facturable sont dérivées du chiffrage accepté ; le snapshot tarifaire serveur reste autoritaire. Les sessions sont arrêtées avant achèvement et la facture finale reste séparée du temps opérationnel.
- **Garantie : PASS (1/1)**. Chaque véhicule possède un contrat actif et applicable ; la fixture configure un compte Treasury jetable, son mapping de moyen de paiement et les permissions de reporting réellement exercées. Les garanties totale et partielle, l'idempotence des règlements, le refus du surpaiement et le reporting sont validés.

Les refus successivement observés (barème absent, intervention libre après acceptation, contrat véhicule absent, moyen de paiement absent, intégration Treasury inactive, permissions de reporting absentes) étaient conformes aux règles métier courantes. Aucune de ces protections n'a été affaiblie.

Validation statique après ces corrections : `npm run lint` backend **PASS** et `git diff --check` **PASS**.

Restent à traiter ou requalifier : RH rallonges budgétaires selon demande/approbation à quatre yeux, intégrité Showroom, et WSS sur proxy TLS isolé. Le replay intégral 59 fichiers n'a donc pas encore été relancé après ces corrections supplémentaires.

## Campagne de clôture définitive

### RH — rallonges budgétaires

`hr-budget-funds-mysql.integration.test.ts` est **PASS (1/1)** sur MySQL 8.4.11. La fixture exerce le workflow réel demande puis approbation, sans seuil implicite ni rôle d’approbateur codé en dur. Elle démontre la séparation demandeur/approbateur, les permissions RBAC dynamiques, les scopes `AGENCY`, `CONCESSION` et `GLOBAL`, les refus `403/404/409`, le rejet sans mouvement, la double approbation, la concurrence de deux approbateurs (résultats `[200,409]`), l’unicité du mouvement et l’audit. Preuve synthétique : `approved=1`, `rejected=2`, `race=[200,409]`, `concessionApproved=4`, `globalApproved=5`, `audits=6`.

### Showroom — intégrité

`showroom-integrity-mysql.integration.test.ts` est **PASS (4/4)**. Les identifiants sont tous créés dynamiquement. Sont vérifiés : doublon concurrent avec confirmation explicite, conversion concurrente atomique (un lead et une opportunité), rollback intégral sous erreur forcée, absence d’orphelins, clés étrangères, isolation inter-agence et isolation `REPEATABLE-READ`. La fixture ne supprime ni ne recrée plus les tables applicatives.

### WSS / TLS

Un Nginx temporaire, auto-signé et isolé a exposé `wss://127.0.0.1:14443` vers un backend de recette local. Le handshake Engine.IO/Socket.IO a été observé, puis `wss-proxy-mysql.integration.test.ts` a obtenu **PASS (1/1)** avec trois vérifications réelles : session persistée acceptée, JWT invalide rejeté et même JWT rejeté après révocation de sa session. Les tests backend ordinaires couvrent en complément le routage par rooms utilisateur/agence, l’isolation des destinataires, les événements Socket.IO et les appels de déconnexion lors d’une désactivation, d’un changement RBAC ou d’une révocation liée au mot de passe. Aucun proxy ou service de production n’a été touché ; le proxy, le certificat et le backend temporaires ont été retirés après la recette.

### Rejeu intégral des opt-in

Une base `lca_b31_replay`, distincte de `lca_b31`, a été créée dans le seul conteneur jetable. Le bootstrap officiel a produit un schéma 071→091. Une image logique de cet état a ensuite été restaurée avant chacun des 58 fichiers MySQL ; le fichier WSS a été exécuté séparément contre le backend placé derrière le proxy TLS. Résultat définitif : **59/59 fichiers PASS, 111/111 tests Node PASS, 0 FAIL, 0 SKIP**. Durée cumulée rapportée par Node pour les 58 fichiers MySQL : **173,405 s** ; WSS : **2,779 s**. Le temps de restauration entre fichiers n’est pas inclus dans ces durées Node.

Variables d’activation utilisées : `SEED_ADMIN_MYSQL_TEST`, `LCA_REFUND_DB_TEST`, `BUDGET_TREASURY_MYSQL_TEST`, `CORR_ERP_02D_MYSQL`, `CORR_ERP_02E_MYSQL`, `CUSTOMER_IDENTITY_MYSQL_TEST`, `DELIVERY_CHECKLIST_CONCURRENCY_MYSQL_TEST`, `DELIVERY_FINANCIAL_CONCURRENCY_MYSQL_TEST`, `DELIVERY_SERVICE_CONCURRENCY_MYSQL_TEST`, `LOT13_MYSQL_TEST`, `LCA_LABOR_RATES_DB_TEST`, `FIN01_MYSQL_TEST`, `FIN02_MYSQL_TEST`, `FIN03_MYSQL_TEST`, `FIN04_MYSQL_TEST`, `FIN05_MYSQL_TEST`, `FIN06_MYSQL_TEST`, `FIN07_MYSQL_TEST`, `FIN09_MYSQL_TEST`, `LCA_GED_DB_TEST`, `LCA_HR_BUDGET_AGENCY_DB_TEST`, `LCA_HR_BUDGET_CATEGORIES_DB_TEST`, `LCA_HR_BUDGET_FUNDS_DB_TEST`, `LCA_HR_REPORTING_DB_TEST`, `LCA_HR_SALARY_SCOPE_DB_TEST`, `LCA_HR_STOCK_GOVERNANCE_DB_TEST`, `LOT14C2_MYSQL_TEST`, `LCA_14C5B_DB_TEST`, `MIGRATION_054_MYSQL_TEST`, `MIGRATION_080_MYSQL_TEST`, `MIGRATION_085_MYSQL_TEST`, `MIGRATION_MYSQL_TEST`, `LCA_OPS_UX01_FINAL_DB_TEST`, `LCA_OPS_UX01_DB_TEST`, `LCA_PDF_SESSION_DB_TEST`, `LCA_PR02_SAV03_DB_TEST`, `LCA_PR03_DB_TEST`, `LCA_PR04_DB_TEST`, `LCA_PR06_DB_TEST`, `LCA_PREPROD_DB_TEST`, `LCA_RESERVES_TEST`, `LCA_REPORT_DB_TEST`, `LCA_SALE_CANCEL_DB_TEST`, `LCA_SAV_ABANDON_DB_TEST`, `LCA_SAV_OR_UX03_DB_TEST`, `LCA_SAV0409_DB_TEST`, `LCA_SAV1618_DB_TEST`, `LCA_SAV19_DB_TEST`, `LCA_SAV20_DB_TEST`, `LCA_SAV21_DB_TEST`, `LCA_TARGETED_DB_TEST`, `LCA_WARRANTY_VALIDATION`, `SHOWROOM_INTEGRITY_MYSQL_TEST`, `TREASURY_CLOSURE_MYSQL_TEST`, `TREASURY_FLOW_MYSQL_TEST`, `TREASURY_MANUAL_MYSQL_TEST`, `VALID_ERP_02_MYSQL`, `VEHICLE_RETURN_MYSQL_TEST` et `LCA_WSS_PROXY_TEST`.

L’écart avec les **83 scénarios historiques** vient de deux unités de comptage différentes : 83 était l’inventaire métier manuel de B.3, tandis que 111 est le nombre de tests/sous-tests effectivement déclaré par `node:test` dans les 59 fichiers actuels. Les fichiers de concurrence livraison déclarent respectivement 9, 8 et 6 tests, Lot 13 en déclare 11, retour véhicule 12, reporting 5, Showroom 4, provisioning 3, et les runners de migration/réserves 2 chacun. Le chiffre intermédiaire de 108 précédait les sous-tests et renforcements ajoutés pendant B.3.1 ; aucun test n’a été supprimé ou masqué.

### Non-régression globale

- Frontend complet : **876 PASS, 0 FAIL, 0 SKIP**, durée 156,143 s ; lint TypeScript PASS ; build Vite PASS (2 505 modules).
- Backend ordinaire : **1 822 PASS, 0 FAIL, 83 SKIP opt-in**, 1 905 tests détectés, durée 268,106 s ; lint TypeScript PASS ; build TypeScript PASS.
- `git diff --check` : PASS.

Par rapport à B.2 et B.3, il n’existe plus d’échec ordinaire ni de fixture opt-in incompatible avec le schéma courant. Les SKIP de la campagne backend ordinaire sont intentionnels : ce sont précisément les tests opt-in rejoués séparément avec leurs variables et une base restaurée.

### Corrections finales

- rallonges RH réécrites autour des acteurs RBAC dynamiques et du workflow demande/approbation réel ;
- Showroom rendu autonome, relationnel et non destructif ;
- borne adjacente des essais stabilisée à la précision `DATETIME` MySQL (millisecondes neutralisées dans la fixture) ;
- scénario d’abandon SAV aligné sur la règle actuelle : un travail réellement enregistré interdit toujours l’abandon, même après arrêt de la session ;
- WSS enrichi avec le refus d’une session révoquée.

## Verdict

**VALIDÉ — LOT B.3.1 CLÔTURÉ.** Les trois réserves finales sont levées et la qualification intégrale est démontrée : 59/59 fichiers opt-in, 111/111 tests opt-in, 876/876 tests frontend et 1 822/1 822 tests backend ordinaires exécutés sont PASS. Aucun commit, push, déploiement, accès VPS, changement de branche, volume existant, base métier ou service préexistant n’a été modifié.
