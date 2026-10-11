# ERP-17 — Tests vérifiables

Exécution directe Node, pas npm test (qui ajoute le glob global).
Backend : NODE_ENV=test DB_HOST=127.0.0.1 DB_USER=test DB_PASSWORD=test DB_NAME=test, secrets JWT factices de test ; node --experimental-test-module-mocks --import tsx --test --test-concurrency=1.
Fichiers : notifications-view-scope, notifications-dynamic-reliability, notifications-traceability-rbac, erp-warranty-lifecycle-03, sav-warranty-workflow-05, warranty-document-context, delivery-checklist-concurrency-mysql.integration, delivery-financial-authorization-concurrency-mysql.integration (.test.ts).

Avant : 64 tests =58 réussis+4 échoués+2 ignorés. Ce sont quatre tests échoués, pas un comptage exhaustif des assertions. Logs /tmp/erp17-backend-before-full.log.
Après ajout rbac-persisted-authority :69=67 réussis+0 échec+2 ignorés (/tmp/erp17-backend-after.log).
Les deux tests MySQL sont conditionnels, non exécutés : aucune validation MySQL de concurrence revendiquée.

Frontend : node --import tsx --test --test-concurrency=1 ; fichiers notifications-reliability, notif-rbac02.behavior, erp-warranty-lifecycle-03.behavior, sav-warranty-workflow-05.behavior, sav-warranty-ui-08.behavior, warranty-manufacturer-sale.behavior, delivery-stabilization, delivery-financial-authorization, parts-rbac (.test.ts).
Avant62=53 réussis+9 échoués ; après62/62. Logs /tmp/erp17-frontend-before.log et /tmp/erp17-frontend-after.log.

Obsolescence démontrée :
- droits SUPER_ADMIN implicites contredits par rbac-persisted-authority et resolveRbacContext ;
- nom historicalBusinessPdf remplacé par requiredHistoricalBusinessPdf (archive obligatoire) ;
- taille pagination et hooks paginés ;
- variables formData/parsedMileage renommées form/mileage ;
- libellé absence de couverture conservant sa distinction.
Défauts produit maintenus puis corrigés : contrôles boutons Pièces ; code/dates/durée/km contractuels absents.

Tests nouveaux : erp17-ged-recovery 1/1 ; erp17-pdf 1/1 avec extraction Poppler, absence de mutation des lignes, TTC et plafond.
Les premiers essais en sandbox ne donnaient que les résultats par fichier ; ils ne constituent pas les comptes de référence.

