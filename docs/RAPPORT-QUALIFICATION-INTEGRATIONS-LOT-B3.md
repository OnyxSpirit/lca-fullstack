# Rapport de qualification des intégrations — Lot B.3

Date d'exécution : 17 octobre 2026  
Environnement : local, temporaire et isolé  
Verdict : **NON VALIDÉ**

## 1. Résumé exécutif

La pile intégrée React/Express/MySQL 8.4 a été créée sous le projet Docker `lca-b3`, sans volume persistant et sans partage avec une base métier. Le bootstrap officiel 071→091, la migration 080, la migration 085, le proxy WSS, Socket.IO multiutilisateur et le parcours navigateur ciblé `NewRepairOrderModal` ont été réellement exécutés.

Les 83 scénarios opt-in ont tous été déclenchés. Vingt-neuf scénarios répartis dans 19 fichiers sont PASS. Cinquante-quatre scénarios répartis dans 40 fichiers sont FAIL. Aucun scénario n'est présenté comme réussi lorsqu'il ne l'est pas. La majorité des échecs observés provient de fixtures opt-in historiques incompatibles avec les contrats actuels (JWT sans `sid`/session persistée, login du `SUPER_ADMIN` supposé retourner directement un JWT malgré la 2FA obligatoire, niveaux de migration 45/60/63/71–76 codés en dur alors que le niveau courant est 91). D'autres échecs de fixtures ou d'assertions restent à corriger individuellement. En conséquence, les réserves du lot B.2 ne sont pas toutes levées.

## 2. Environnement utilisé

- MySQL `mysql:8.4`, conteneur `lca-b3-mysql`, port `127.0.0.1:33323`, stockage `tmpfs`.
- Backend `lca-b3-backend`, port `127.0.0.1:3005`.
- Frontend `lca-b3-frontend`, port `127.0.0.1:4183`.
- Proxy TLS jetable `lca-b3-tls`, port `127.0.0.1:14443`.
- Réseau Docker dédié `lca-b3-network`.
- Secrets, comptes et données strictement fictifs.
- Aucun volume Docker métier, aucune base historique et aucun service préexistant n'ont été modifiés.

Le bootstrap officiel sur base vierge a atteint la version 91. Le schéma observé comportait 161 tables. Les migrations 080, 085, 087 à 091 ont été appliquées par le runner officiel dans la base jetable.

## 3. Inventaire des scénarios opt-in

L'inventaire exact contient 83 scénarios dans 59 fichiers et 59 variables d'activation. Le décompte est fondé sur les blocs `skip: !enabled`, et non sur une estimation historique du nombre de fichiers MySQL.

| Fichier | Activation | Scénarios | Résultat |
|---|---|---:|---|
| `admin-provisioning-security.test.ts` | `SEED_ADMIN_MYSQL_TEST` | 1 | PASS |
| `avoir-remboursement-mysql.integration.test.ts` | `LCA_REFUND_DB_TEST` | 1 | FAIL |
| `budget-treasury-mysql.integration.test.ts` | `BUDGET_TREASURY_MYSQL_TEST` | 1 | FAIL |
| `corr-erp-02d-test-drive-mysql.integration.test.ts` | `CORR_ERP_02D_MYSQL` | 1 | FAIL |
| `corr-erp-02e-test-drive-mysql.integration.test.ts` | `CORR_ERP_02E_MYSQL` | 1 | FAIL |
| `customer-identity-mysql.integration.test.ts` | `CUSTOMER_IDENTITY_MYSQL_TEST` | 1 | FAIL |
| `delivery-checklist-concurrency-mysql.integration.test.ts` | `DELIVERY_CHECKLIST_CONCURRENCY_MYSQL_TEST` | 1 | PASS |
| `delivery-financial-authorization-concurrency-mysql.integration.test.ts` | `DELIVERY_FINANCIAL_CONCURRENCY_MYSQL_TEST` | 1 | PASS |
| `delivery-services-concurrency-mysql.integration.test.ts` | `DELIVERY_SERVICE_CONCURRENCY_MYSQL_TEST` | 6 | PASS |
| `document-marks-lot13-mysql.integration.test.ts` | `LOT13_MYSQL_TEST` | 1 | FAIL |
| `dynamic-workshop-labor-rates-mysql.integration.test.ts` | `LCA_LABOR_RATES_DB_TEST` | 1 | FAIL |
| `fin01-billing-export-mysql.integration.test.ts` | `FIN01_MYSQL_TEST` | 1 | FAIL |
| `fin02-budget-approval-mysql.integration.test.ts` | `FIN02_MYSQL_TEST` | 1 | FAIL |
| `fin03-treasury-coverage-mysql.integration.test.ts` | `FIN03_MYSQL_TEST` | 1 | FAIL |
| `fin04-remunerations-mysql.integration.test.ts` | `FIN04_MYSQL_TEST` | 1 | FAIL |
| `fin05-supplier-invoices-mysql.integration.test.ts` | `FIN05_MYSQL_TEST` | 1 | FAIL |
| `fin06-mysql.integration.test.ts` | `FIN06_MYSQL_TEST` | 1 | PASS |
| `fin07-mysql.integration.test.ts` | `FIN07_MYSQL_TEST` | 1 | PASS |
| `fin09-mysql.integration.test.ts` | `FIN09_MYSQL_TEST` | 1 | FAIL |
| `ged-http-mysql.integration.test.ts` | `LCA_GED_DB_TEST` | 1 | PASS |
| `hr-budget-agency-mysql.integration.test.ts` | `LCA_HR_BUDGET_AGENCY_DB_TEST` | 1 | FAIL |
| `hr-budget-categories-mysql.integration.test.ts` | `LCA_HR_BUDGET_CATEGORIES_DB_TEST` | 1 | FAIL |
| `hr-budget-funds-mysql.integration.test.ts` | `LCA_HR_BUDGET_FUNDS_DB_TEST` | 1 | FAIL |
| `hr-reporting-mysql.integration.test.ts` | `LCA_HR_REPORTING_DB_TEST` | 1 | FAIL |
| `hr-salary-scope-mysql.integration.test.ts` | `LCA_HR_SALARY_SCOPE_DB_TEST` | 1 | FAIL |
| `hr-stock-governance-mysql.integration.test.ts` | `LCA_HR_STOCK_GOVERNANCE_DB_TEST` | 1 | PASS |
| `lot14c2-mysql-api.integration.test.ts` | `LOT14C2_MYSQL_TEST` | 1 | PASS |
| `lot14c5b-workshop-report-mysql.integration.test.ts` | `LCA_14C5B_DB_TEST` | 1 | PASS |
| `migration-054-checksum-mysql.integration.test.ts` | `MIGRATION_054_MYSQL_TEST` | 1 | FAIL |
| `migration-080-mysql.integration.test.ts` | `MIGRATION_080_MYSQL_TEST` | 1 | PASS |
| `migration-085-mysql.integration.test.ts` | `MIGRATION_085_MYSQL_TEST` | 1 | PASS |
| `mysql-migration-runner.test.ts` | `MIGRATION_MYSQL_TEST` | 1 | FAIL |
| `ops-ux01-final-mysql.integration.test.ts` | `LCA_OPS_UX01_FINAL_DB_TEST` | 1 | FAIL |
| `ops-ux01-mysql.integration.test.ts` | `LCA_OPS_UX01_DB_TEST` | 1 | FAIL |
| `pdf-session-revocation-mysql.integration.test.ts` | `LCA_PDF_SESSION_DB_TEST` | 1 | FAIL |
| `pr02-sav-or03-mysql.integration.test.ts` | `LCA_PR02_SAV03_DB_TEST` | 1 | FAIL |
| `pr03-locations-mysql.integration.test.ts` | `LCA_PR03_DB_TEST` | 1 | FAIL |
| `pr04-parts-location-list-mysql.integration.test.ts` | `LCA_PR04_DB_TEST` | 1 | PASS |
| `pr06-purchase-order-cancellation-mysql.integration.test.ts` | `LCA_PR06_DB_TEST` | 1 | FAIL |
| `preproduction-mysql.integration.test.ts` | `LCA_PREPROD_DB_TEST` | 1 | FAIL |
| `qualification-reserves-mysql.integration.test.ts` | `LCA_RESERVES_TEST` | 2 | PASS |
| `reporting-mysql.integration.test.ts` | `LCA_REPORT_DB_TEST` | 5 | PASS |
| `sale-cancellation-mysql.integration.test.ts` | `LCA_SALE_CANCEL_DB_TEST` | 1 | PASS |
| `sav-abandon-or-02-mysql.integration.test.ts` | `LCA_SAV_ABANDON_DB_TEST` | 1 | FAIL |
| `sav-or-ux03-mysql.integration.test.ts` | `LCA_SAV_OR_UX03_DB_TEST` | 1 | FAIL |
| `sav-or04-09-mysql.integration.test.ts` | `LCA_SAV0409_DB_TEST` | 1 | FAIL |
| `sav-or16-18-mysql.integration.test.ts` | `LCA_SAV1618_DB_TEST` | 1 | FAIL |
| `sav-or19-mysql.integration.test.ts` | `LCA_SAV19_DB_TEST` | 1 | PASS |
| `sav-or20-mysql.integration.test.ts` | `LCA_SAV20_DB_TEST` | 1 | FAIL |
| `sav-or21-mysql.integration.test.ts` | `LCA_SAV21_DB_TEST` | 1 | FAIL |
| `sav-parts-targeted-mysql.integration.test.ts` | `LCA_TARGETED_DB_TEST` | 1 | FAIL |
| `sav-warranty-validation-mysql.integration.test.ts` | `LCA_WARRANTY_VALIDATION` | 1 | FAIL |
| `showroom-integrity-mysql.integration.test.ts` | `SHOWROOM_INTEGRITY_MYSQL_TEST` | 4 | FAIL |
| `treasury-closure-mysql.integration.test.ts` | `TREASURY_CLOSURE_MYSQL_TEST` | 1 | FAIL |
| `treasury-flow-mysql.integration.test.ts` | `TREASURY_FLOW_MYSQL_TEST` | 1 | FAIL |
| `treasury-manual-mysql.integration.test.ts` | `TREASURY_MANUAL_MYSQL_TEST` | 1 | FAIL |
| `valid-erp-02-appointment-mysql.integration.test.ts` | `VALID_ERP_02_MYSQL` | 1 | PASS |
| `vehicle-return-concurrency-mysql.integration.test.ts` | `VEHICLE_RETURN_MYSQL_TEST` | 12 | FAIL |
| `wss-proxy-mysql.integration.test.ts` | `LCA_WSS_PROXY_TEST` | 1 | PASS |

Commande de principe : activation d'une seule variable et exécution sérialisée du seul fichier, avec restauration du schéma jetable entre fichiers. Durée cumulée du passage complet : environ 582 secondes, hors bootstrap initial et rejeux de diagnostic.

## 4. Tests MySQL

- Base vierge → bootstrap officiel 071→091 : PASS.
- Migration 080 avec reprise : PASS.
- Migration 085 isolée : PASS.
- Concurrence checklist, autorisation financière et services de livraison : PASS.
- Les tests qui attendent encore exactement les versions 45, 60, 63, 71, 72, 73, 74, 75 ou 76 échouent face au baseline consolidé 71 et au niveau courant 91. Modifier seulement la valeur attendue ne suffit pas pour les scénarios qui détruisent puis rejouent d'anciennes structures.

## 5. Tests HTTP

Les appels navigateur et WSS ont utilisé le backend réel. Les routes principales CRM, ventes, véhicules, atelier, pièces, facturation, trésorerie, RH, GED, utilisateurs et sécurité ont été chargées après authentification réelle. Aucun HTTP 500 n'a été observé sur ces parcours.

Les anciens tests HTTP opt-in qui signent directement un JWT sans `sid` échouent désormais correctement en 401 : `authenticate` exige un `sid`, une ligne `refresh_tokens` active et un utilisateur actif. Les anciens tests qui connectent le vrai `SUPER_ADMIN` supposent à tort un `accessToken` direct ; le contrat actuel renvoie un challenge d'enrôlement 2FA.

## 6. Tests RBAC

- Rôle personnalisé fictif doté des permissions dynamiques : navigation réelle PASS.
- Mise à jour territoriale d'un utilisateur via API : PASS.
- Notification `rbac:updated` ciblée, sans fuite vers le second utilisateur : PASS.
- Déconnexion de la socket cible après mise à jour RBAC : PASS.
- Refus de reconnexion après révocation de session : PASS.
- Les tests opt-in historiques doivent être adaptés au contrat de session sans introduire de bypass de sécurité.

## 7. Tests 2FA

La recette navigateur antérieure de cette campagne a exécuté l'enrôlement TOTP obligatoire du `SUPER_ADMIN`, la confirmation TOTP et l'accès au tableau de bord. La suite frontend couvre challenge, enrôlement, code de récupération, step-up et gouvernance. La pile était configurée avec une clé fictive conforme, jamais versionnée.

Les modes absent/incomplet sont couverts par les tests automatisés non opt-in. Aucun changement n'a été apporté pour accepter les JWT sans session ou contourner la 2FA obligatoire.

## 8. Appareils de confiance

Les écrans « Mes appareils » et « Appareils administrés » ont été chargés dans un navigateur réel, avec états vides et contrôles attendus. Les tests frontend de cookies HttpOnly/SameSite, consentement, récupération et gouvernance sont PASS. Le cycle complet de rotation/réutilisation d'un ancien jeton n'a pas été rejoué en navigateur pendant ce lot et reste une réserve.

## 9. Suppression permanente

La migration 091 est appliquée dans la base jetable. L'interface distingue révocation et suppression permanente, et les tests frontend associés sont PASS. Les scénarios MySQL opt-in complets de concurrence et d'audit ne constituent pas une famille dédiée dans l'inventaire des 83 ; la preuve intégrée exhaustive reste donc partielle.

## 10. Workflows financiers

FIN-06, FIN-07, vente annulée et reporting passent réellement. Les scénarios FIN-01 à FIN-05 et FIN-09 sont bloqués par leurs assertions de niveau de migration devenues obsolètes avant d'atteindre l'ensemble des invariants métier. Les scénarios trésorerie historique attendent également la version 60/63. Ils ne sont pas qualifiés par substitution.

## 11. Workflows métier

Les parcours récents de livraison, GED, stock RH, reporting atelier 14C et rendez-vous passent. Les parcours SAV historiques présentent des fixtures de login/session ou des préconditions devenues obsolètes. La vente, le stock, le SAV et l'atelier sont accessibles dans la pile intégrée, mais les 54 scénarios opt-in en échec empêchent une validation globale.

## 12. Recette navigateur

Navigateur réel utilisé : navigateur intégré Chromium, origine `http://127.0.0.1:4183`.

- Connexion d'un rôle personnalisé fictif : PASS.
- Navigation sur CRM, ventes, véhicules, atelier, pièces, facturation, trésorerie, RH, GED, utilisateurs et centre 2FA : PASS.
- `NewRepairOrderModal` : PASS.
- Client `B3-CUSTOMER` et véhicule `Toyota Land Cruiser B3 Garantie` chargés.
- Garantie affichée : constructeur `Toyota Constructeur B3`, code `TOYOTA-B3`, statut `ACTIVE`, durée 24 mois, activation/début/échéance, kilométrage de référence 12 000, limite 100 000.
- Après saisie de 48 500 km : statut « Garantie active » et kilométrage de réception 48 500.
- Console du parcours ciblé : aucune erreur et aucun avertissement.
- Aucun OR n'a été créé ; la vérification était une recette de lecture et de présentation.

## 13. Socket.IO multiutilisateur

- WSS réel via Nginx TLS : session persistée acceptée, jeton invalide refusé — PASS (3,03 s).
- Deux utilisateurs simultanés : connexion PASS.
- Événement `rbac:updated` reçu uniquement par la cible : PASS.
- Absence de fuite interutilisateur : PASS.
- Déconnexion de la cible : PASS.
- Session du second utilisateur révoquée puis reconnexion refusée : PASS.

Événements sans consommateur explicite : aucune conclusion globale n'est tirée ; l'inventaire exhaustif producteur/consommateur n'a pas été automatisé dans cette campagne.

## 14. Anomalies détectées

1. Fixtures JWT opt-in antérieures au contrat `sid` + `refresh_tokens`.
2. Fixtures de login `SUPER_ADMIN` antérieures à l'obligation 2FA.
3. Versions de migrations historiques codées en dur, incompatibles avec le baseline consolidé.
4. Scénarios de retour véhicule exigeant un clone de livraison finalisée absent du modèle générique.
5. Test documentaire Lot 13 : assertion de chemin de stockage non alignée avec le répertoire GED injecté.
6. Test showroom : ordre de suppression de tables devenu incompatible avec une FK ajoutée (`activities` → `opportunities`).

## 15. Corrections effectuées

Aucune correction du produit n'a été appliquée : les comportements de sécurité actuels sont cohérents et ne doivent pas être affaiblis pour satisfaire d'anciennes fixtures. Le lanceur et les ressources de recette ont été conservés dans `/tmp` uniquement. Le présent rapport est le seul fichier du dépôt ajouté par le lot B.3.

Corrections nécessaires pour une prochaine passe : fournir un helper MySQL de session réelle pour les JWT opt-in ; utiliser un rôle administrateur personnalisé non soumis à la règle système lorsque le scénario ne teste pas la 2FA ; reconstruire explicitement les états historiques de migration ; isoler les fixtures nécessitant une livraison finalisée ; corriger les nettoyages FK et chemins GED.

## 16. Tests de non-régression

- Frontend complet : 876/876 PASS, 0 échec, 122,845 s.
- Frontend lint : PASS.
- Frontend build : PASS, 20,38 s.
- Backend lint : PASS.
- Backend build : PASS.
- Backend complet hors sandbox : 1 822 PASS, 0 échec, 83 SKIP opt-in, 246,503 s. Le premier passage sandboxé a été invalidé car Supertest ne pouvait pas ouvrir ses sockets locales (`listen EPERM 0.0.0.0`).
- `git diff --check` : à exécuter après finalisation du rapport.

## 17. Résultats globaux

| Famille | Prévus | Exécutés | Réussis | Échoués | Ignorés |
|---|---:|---:|---:|---:|---:|
| Opt-in | 83 | 83 | 29 | 54 | 0 |
| Frontend global | 876 | 876 | 876 | 0 | 0 |
| Backend global ordinaire | 1 905 | 1 905 | 1 822 | 0 | 83 opt-in |
| WSS | 1 | 1 | 1 | 0 | 0 |
| Socket.IO multiutilisateur | 1 parcours | 1 | 1 | 0 | 0 |
| Navigateur ciblé | 1 parcours OR + navigation | 1 | 1 | 0 | 0 |

## 18. Scénarios non exécutés

Aucun des 83 opt-in n'a été laissé en SKIP. Les cycles navigateur complets suivants ne sont cependant pas démontrés de bout en bout : rotation d'un cookie de confiance et refus de son prédécesseur, suppression permanente concurrente après révocation, et parcours financiers complets dont les tests s'arrêtent sur une fixture historique.

## 19. Risques résiduels

- Une part importante des tests d'intégration opt-in ne protège plus le produit, car elle échoue avant le comportement métier visé.
- Les workflows financiers FIN-01..05/09 et plusieurs workflows SAV ne disposent pas d'une preuve B.3 complète.
- Les résultats PASS des suites ordinaires ne remplacent pas ces scénarios MySQL réels.
- Le code produit ne doit pas accepter de JWT sans session pour rendre ces tests verts.

## 20. Verdict final

**NON VALIDÉ.**

Les intégrations récentes, le navigateur réel, WSS et Socket.IO sont fonctionnels sur la pile isolée. Toutefois, 54 des 83 scénarios opt-in ne sont pas qualifiés. La prochaine action sûre est un lot de remise à niveau des fixtures d'intégration, suivi du rejeu intégral B.3. Aucun déploiement ne doit être autorisé sur la base de ce rapport seul.

## Nettoyage et état Git

Les conteneurs `lca-b3-frontend`, `lca-b3-backend`, `lca-b3-mysql` et `lca-b3-tls`, ainsi que le réseau `lca-b3-network`, ont été supprimés. Aucun volume Docker n'avait été créé. La vérification par label `lca.scope=lot-b3` ne retourne plus aucune ressource. `git diff --check` est PASS. L'archive officielle est intacte (`SHA256 7a05ce52ace2033a5beb0b1f8ff967e346f4e63c8c0fe20bf29b91b0500ea3cc`). Aucun commit, push, tag, changement de branche ou déploiement n'a été effectué.
