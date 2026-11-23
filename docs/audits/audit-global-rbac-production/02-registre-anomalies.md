# Registre des anomalies

## AUD-CONCESSION-001 — Création des cachets et catégories rejetée

- **État / confiance :** confirmée, confiance élevée.
- **Module / gravité :** Paramètres de concession — **MAJEURE**.
- **Reproduction :** avec `stamp.manage=AGENCY`, ouvrir Paramètres → Signatures et cachets; créer une catégorie ou un cachet.
- **Attendu :** création dans la concession et/ou l'agence active.
- **Constaté :** HTTP 403, « Portée cachet invalide ».
- **Cause racine :** `DocumentMarksSettings` ne collecte ni n'envoie `agencyId`. `target()` rejette toute valeur différente de l'agence active, y compris `null`. La création de catégorie appelle explicitement `target(r,s,null,null)`.
- **Preuves :** `frontend/src/modules/settings/DocumentMarksSettings.tsx:8,51`; `frontend/src/api/documentMarkHooks.ts:10,24`; `backend-node/src/modules/document-marks/document-mark.routes.ts:103-111,170-174`.
- **Endpoints :** `POST /api/document-marks/stamps`, `POST /api/document-marks/categories`.
- **Permission :** `stamp.manage` / `AGENCY`.
- **Données :** `service_stamps`, `service_stamp_categories`, `service_stamp_versions`, `service_stamp_document_types`.
- **Impact métier :** administration des cachets bloquée, y compris pour le vrai Super Admin.
- **Risque sécurité :** faible élévation; risque d'indisponibilité fonctionnelle élevé.
- **Correction proposée :** définir explicitement le modèle de propriété. Pour une ressource d'agence, injecter côté serveur l'agence active ou exiger/afficher un sélecteur contrôlé. Pour une ressource centrale, créer une autorisation centrale indépendante du scope RBAC, sans réintroduire `CONCESSION`.
- **Non-régression :** test UI→FormData, catégorie et cachet pour Super Admin et utilisateur ordinaire `AGENCY`, absence d'agence, autre agence, `OWN`, agence changée.

## AUD-RBAC-001 — Permission centrale neutralisée par le rôle système

- **État / confiance :** confirmée, confiance élevée.
- **Module / gravité :** RBAC et référentiels centraux — **MAJEURE**.
- **Reproduction :** attribuer `settings.general.manage=AGENCY` à un rôle non système, puis modifier l'identité ou le logo.
- **Attendu :** l'utilisateur habilité gère la ressource centrale de sa concession.
- **Constaté :** HTTP 403 « Autorisation centrale insuffisante ».
- **Cause racine :** `assertCentralAgencyPermission*` exige simultanément la permission et `context.isSuperAdmin`. La permission attribuée à un rôle ordinaire ne suffit jamais.
- **Preuves :** `backend-node/src/modules/rbac/agency-authorization.ts:133-137`; `backend-node/src/modules/settings/setting.routes.ts:7-30`; `frontend/src/modules/settings/SettingsPage.tsx:38,59-60,71-83`.
- **Endpoints :** identité/logo, paramètres, agences, barèmes, constructeurs, documents, catalogues livraison, checklist, 2FA, rôles et plusieurs catalogues centraux.
- **Permissions :** toutes celles passées à `requireCentralAgencyPermission`.
- **Impact métier :** délégation impossible; dépendance opérationnelle au compte le plus privilégié.
- **Risque sécurité :** concentration excessive des opérations dans le Super Admin; incitation au partage/usage courant d'un compte puissant.
- **Correction proposée :** formaliser une autorisation « ressource de concession » fondée sur permission + appartenance à la concession active; réserver le rôle système aux opérations véritablement système et en dresser une liste explicite.
- **Non-régression :** profils habilité/non habilité, deux concessions, changement d'agence, rôle système réel et faux rôle nommé Super Admin.

## AUD-API-001 — Modèle de propriété des cachets contradictoire

- **État / confiance :** confirmée statiquement, confiance élevée.
- **Module / gravité :** Documents / API — **MODÉRÉE**.
- **Description :** le schéma autorise `service_stamps.agency_id IS NULL`, mais les listes, mises à jour, images, affectations et usages filtrent exclusivement l'agence active pour `AGENCY`. Un cachet central historique devient inaccessible. La création tente encore de représenter les deux modèles sans contrat explicite.
- **Preuves :** `backend-node/database/migrations/069_user_signatures_service_stamps.sql`; `backend-node/src/modules/document-marks/document-mark.routes.ts:90-108,121-210`; `backend-node/src/modules/deliveries/delivery.routes.ts` (contrôle de l'agence du cachet lors de l'usage).
- **Impact :** ressources orphelines fonctionnellement et comportements différents selon l'origine des données.
- **Correction proposée :** décision d'architecture obligatoire : cachets exclusivement d'agence, ou cachets centraux avec permission centrale et règles d'usage explicites; migration de qualification séparée après inventaire des données.
- **Non-régression :** cachet `agency_id NULL`, cachet agence A/B, lecture, version, politique, autorisation de rôle et application à un document.

## AUD-TEST-001 — Couverture consacrant ou contournant les défauts

- **État / confiance :** confirmée, confiance élevée.
- **Module / gravité :** Tests — **MODÉRÉE**.
- **Description :** les intégrations cachets ajoutent directement `.field('agencyId', actor.agency)`, donc elles ne couvrent pas le payload réel du frontend. `document-logo-final.test.ts` valide seulement que `AGENCY` affiche l'action. D'autres tests exigent explicitement `requireCentralAgencyPermission` et `isSuperAdmin`, alors que cette règle contredit l'exigence actuelle de délégation.
- **Preuves :** `backend-node/test/document-marks-lot13-mysql.integration.test.ts:9-11`; `frontend/test/document-logo-final.test.ts:4-12`; `backend-node/test/delivery-checklist-configurable.test.ts:5`.
- **Impact :** régressions contractuelles non détectées et comportement obsolète protégé par les tests.
- **Correction proposée :** ajouter des tests de contrat UI/API et remplacer les assertions d'implémentation par des scénarios de profils.

Les tests de matrice Showroom injectent encore volontairement `CONCESSION` et `GLOBAL` pour vérifier leur refus. C'est pertinent côté négatif, mais certains intitulés de sous-tests et le test frontend `crm-negotiation-ui.behavior.test.ts` parlent encore de scopes « compatibles ». Le type de production frontend reste néanmoins strictement `OWN | AGENCY`, et le backend rejette les valeurs anciennes. Ces fixtures doivent être renommées ou limitées aux scénarios de rejet afin d'éviter une documentation exécutable ambiguë.

## AUD-TEST-002 — Assertion VIN obsolète

- **État / confiance :** confirmée par exécution, confiance élevée.
- **Module / gravité :** Tests Véhicules — **MINEURE**.
- **Description :** `backend-node/test/app.test.ts` attend `/17 caractères valides/`, tandis que l'API retourne désormais « Le VIN doit contenir exactement 17 caractères alphanumériques ».
- **Résultat :** 118 tests sur 119 passent dans ce fichier; le comportement de refus est correct, seule l'assertion textuelle échoue.
- **Impact :** suite backend non verte et signal de qualification brouillé; aucun contournement de validation observé.
- **Correction proposée :** aligner l'assertion sur le contrat de message décidé, ou tester le code d'erreur stable plutôt qu'une formulation entière.
- **Non-régression :** VIN court, long, caractères non alphanumériques et caractères I/O/Q selon la règle métier actuelle.

## Observations non classées comme anomalies confirmées

- Les occurrences `GLOBAL`/`CONCESSION` des migrations antérieures à 131 sont historiques; celles des origines véhicule, rattachements de trésorerie, contextes d'audit et contrôles comptables sont des notions métier.
- La production peut présenter un décalage de version, mais aucune preuve accessible ne permet de le confirmer.
- Aucun cachet/catégorie n'existe dans la base locale inspectée; aucune incohérence de ligne existante n'a donc pu être mesurée.
