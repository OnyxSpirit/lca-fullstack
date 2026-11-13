# Registre des anomalies — Comptabilité & Trésorerie

Audit du 13 novembre 2026. Les constats « statique » proviennent du code courant ; aucune donnée métier de `concession_erp` n'a été modifiée.

## Synthèse

| Gravité | Nombre |
|---|---:|
| P0 | 0 |
| P1 | 4 |
| P2 | 9 |
| P3 | 3 |
| **Total** | **16** |

## AUDIT-CT-001 — Workflow de clôture contournable

1. **Domaine :** Comptabilité avancée / périodes.
2. **Fonctionnalité :** clôture et réouverture.
3. **Chemin UI :** Comptabilité → Exercices → Fermer/Rouvrir.
4. **Description :** le bouton de l'onglet Exercices appelle `PATCH /accounting/periods/:id/status`, qui modifie directement le statut. Il contourne `prepare`, les contrôles bloquants et le motif de dix caractères imposés par le workflow avancé.
5. **Attendu :** un seul workflow de clôture, préparé et audité ; réouverture motivée.
6. **Observé :** deux chemins concurrents, dont un sans préparation.
7. **Reproduction :** statique : `AccountingPage.tsx` → `usePeriodStatus`; comparer `accounting.service.ts::periodStatus` et `accounting-advanced.service.ts::{prepareClosure,closePeriod,reopenPeriod}`.
8. **Cause :** maintien du endpoint Lot 2 après ajout du Lot 5.
9. **Fichiers :** `AccountingPage.tsx`, `accountingHooks.ts`, `accounting.routes.ts`, `accounting.service.ts`, `accounting-advanced.service.ts`.
10. **Endpoint :** `PATCH /accounting/periods/:id/status`.
11. **Tables :** `accounting_periods`, `accounting_closures`, `accounting_control_runs`.
12. **Permissions :** `accounting.period.manage` contre `accounting.closure.manage`.
13. **Gravité :** **P1**.
14. **Impact :** gouvernance de clôture incohérente et réouverture non justifiée.
15. **Risque données :** écritures ultérieures possibles après réouverture directe ; pas de corruption démontrée.
16. **Correction :** retirer l'action directe de l'UI et faire converger l'API vers le workflow avancé ; conserver un endpoint de transition compatible qui délègue aux mêmes invariants.
17. **Dépendances :** AUDIT-CT-006.
18. **Test :** toute clôture sans préparation échoue ; toute réouverture sans motif échoue.
19. **Statut :** ouverte, preuve statique.

## AUDIT-CT-002 — Rapprochement avancé sans interface

- **Domaine / fonctionnalité :** rapprochement bancaire groupé, allocations partielles, tableau de bord et écarts.
- **Chemin UI :** Trésorerie → Rapprochement bancaire.
- **Attendu / observé :** les fonctions du Lot 6 doivent être accessibles ; l'UI ne consomme aucun des cinq endpoints `/treasury/bank-reconciliation/*` avancés.
- **Reproduction :** comparer `bank-reconciliation-advanced.routes.ts` avec `treasuryHooks.ts` et `BankReconciliationPanel.tsx`.
- **Cause :** backend/migration livrés sans couche frontend.
- **Fichiers / endpoints :** `bank-reconciliation-advanced.routes.ts`, `bank-reconciliation-advanced.service.ts`; dashboard, groups, group cancel, discrepancies GET/POST.
- **Tables :** `bank_reconciliation_groups`, `bank_reconciliation_allocations`, `bank_reconciliation_discrepancies`.
- **Permissions :** `treasury.reconciliation.dashboard`, `.reconcile`, `.cancel`, `.discrepancy.manage`.
- **Gravité / impact :** **P1** — fonctions majeures du lot annoncées mais inutilisables par un utilisateur.
- **Risque données :** faible tant que l'API n'est pas appelée ; risque d'usage manuel non supervisé.
- **Correction / test :** créer des écrans permissionnés et des scénarios 1↔N, N↔1, allocations partielles, annulation et écarts.
- **Statut :** ouverte, preuve statique.

## AUDIT-CT-003 — OCR indisponible dans l'environnement audité

- **Domaine :** rapprochement bancaire / import PDF numérisé.
- **Attendu :** `pdftotext`, `pdftoppm` et Tesseract disponibles.
- **Observé :** `pdftotext` et `pdftoppm` sont trouvés ; `tesseract` est absent de l'hôte audité. Le service retourne 503 lorsque l'OCR est requis.
- **Reproduction :** `command -v tesseract` ne retourne rien ; chemin d'exécution dans `bank-file-extraction.service.ts`.
- **Tables :** `bank_extraction_runs`, `bank_statements`.
- **Permission :** `treasury.reconciliation.import`.
- **Gravité :** **P1** — import des PDF image inutilisable.
- **Risque données :** aucun ; import bloqué.
- **Correction / test :** intégrer Tesseract et les langues `fra+eng` à l'image backend, healthcheck de dépendances, test PDF image réel.
- **Statut :** ouverte, vérification dynamique locale.

## AUDIT-CT-004 — Accès à la comptabilité gardé par une permission trop spécifique

- **Domaine :** RBAC / navigation.
- **Attendu :** un utilisateur possédant une permission comptable (écritures, grand livre, contrôles, etc.) accède aux espaces correspondants.
- **Observé :** la route et le lien Comptabilité exigent toujours `accounting.chart.view`. Un utilisateur doté uniquement de `accounting.entry.view` ou `accounting.ledger.view` ne peut pas atteindre son écran autorisé.
- **Fichiers :** `App.tsx`, `TreasuryWorkspace.tsx`, `AccountingPage.tsx`.
- **Endpoint :** tous les endpoints `/accounting/*` concernés.
- **Gravité :** **P1** — droits valides rendus inexploitables.
- **Correction / test :** garde « au moins une permission comptable » puis filtrage des onglets ; scénarios multi-agences avec permissions différentes.
- **Statut :** ouverte, preuve statique.

## AUDIT-CT-005 — Profils d'import bancaire non raccordés

- **Domaine :** rapprochement / profils CSV-XLSX-PDF.
- **Observé :** table et permission présentes, mais aucun endpoint CRUD, hook ou écran ; l'UI envoie un format standard et le backend accepte directement un `pdfLinePattern` fourni par la requête.
- **Fichiers :** migration 123, `bank-file-extraction.service.ts`, `BankReconciliationPanel.tsx`.
- **Tables / permission :** `bank_import_profiles`; `treasury.reconciliation.profile.manage`.
- **Gravité :** **P2**.
- **Impact :** banques aux formats différents non administrables ; profil validé non appliqué.
- **Correction / test :** CRUD, validation/activation, sélection du profil, version et traçabilité ; refuser les profils non validés en production.
- **Statut :** ouverte.

## AUDIT-CT-006 — Capacités comptables avancées exposées mais non raccordées

- **Domaine :** contrôles, clôture annuelle, reports, états et échanges.
- **Observé :** aucun consommateur frontend pour le détail d'un contrôle, `prepare-close` annuel, `carryforward/prepare`, modèles d'états et profils d'échange. L'écran affiche seulement des cartes informatives.
- **Endpoints :** `GET controls/:id`, `POST fiscal-years/:id/prepare-close`, `POST carryforward/prepare`, `GET statements/templates`, `GET exchange/profiles`.
- **Tables :** `accounting_control_anomalies`, `accounting_carryforward_runs`, `accounting_statement_*`, `accounting_exchange_*`.
- **Permissions :** `accounting.control.view`, `accounting.carryforward.manage`, `accounting.statement.view`, `accounting.exchange.view`.
- **Gravité :** **P2**.
- **Correction / test :** raccorder les écrans ; garder explicitement bloquées les opérations nécessitant une spécification externe.
- **Statut :** ouverte.

## AUDIT-CT-007 — Paramétrage comptable modifiable en API mais pas en UI

- **Domaine :** plan, journaux, liaisons Treasury-comptabilité.
- **Observé :** l'API permet modifier/activer comptes, journaux et mappings et consulter l'historique d'un compte ; l'UI ne propose que création/import/lecture.
- **Endpoints :** `PATCH accounts/:id`, `GET accounts/:id/history`, `PATCH journals/:id`, `PATCH mappings/:id`.
- **Tables :** `accounting_accounts`, `accounting_journals`, `accounting_treasury_mappings`, `audit_logs`.
- **Gravité :** **P2**.
- **Impact :** corrections de paramétrage impossibles sans appel API direct.
- **Correction / test :** actions d'édition/activation et historique, avec contrôles sur comptes de référence.
- **Statut :** ouverte.

## AUDIT-CT-008 — Actions d'import bancaire mal alignées avec le RBAC

- **Domaine :** RBAC rapprochement.
- **Observé :** après prévisualisation, « Confirmer » est visible sans test `treasury.reconciliation.validate_import` ; l'utilisateur importateur sans droit de validation reçoit un 403. Rejet et annulation d'import existent en API mais pas en UI.
- **Endpoints :** validate, reject, cancel d'un relevé.
- **Gravité :** **P2**.
- **Correction / test :** masquer/désactiver selon permission et exposer rejet/annulation avec motif ; tester importateur séparé du valideur sans imposer cette séparation.
- **Statut :** ouverte.

## AUDIT-CT-009 — Limites de taille contradictoires

- **Domaine :** import bancaire.
- **Observé :** UI annonce 15 Mo pour tous les formats ; backend limite CSV à 5 Mo, XLSX à 10 Mo et PDF à 15 Mo.
- **Fichiers :** `BankReconciliationPanel.tsx`, `bank-reconciliation.service.ts`, `bank-file-extraction.service.ts`.
- **Gravité :** **P2**.
- **Impact :** échec tardif de fichiers présentés comme acceptables.
- **Correction / test :** texte et validation client par format, tests aux limites.
- **Statut :** ouverte.

## AUDIT-CT-010 — Endpoints bancaires unitaires sans consommateur

- **Domaine :** rapprochement.
- **Observé :** rejet/annulation de relevé et liste des mouvements Treasury non rapprochés ne sont pas utilisés par le frontend.
- **Endpoints :** `POST .../:id/reject`, `POST .../:id/cancel`, `GET /treasury/bank-unmatched`.
- **Gravité :** **P2**.
- **Correction / test :** compléter les actions d'administration et une vue des mouvements sans contrepartie.
- **Statut :** ouverte.

## AUDIT-CT-011 — Changement d'agence et onglet comptable non resynchronisé

- **Domaine :** RBAC multi-agences.
- **Observé :** `available` est recalculé, mais l'état local `tab` n'est pas replacé sur un onglet autorisé. Après changement d'agence, un onglet devenu interdit peut rester rendu et déclencher des 403 jusqu'à navigation manuelle.
- **Fichier :** `AccountingPage.tsx`.
- **Gravité :** **P2**.
- **Risque :** pas de fuite backend démontrée grâce aux permissions serveur ; UX et erreurs incohérentes.
- **Correction / test :** effet de resynchronisation et test agence A/B.
- **Statut :** ouverte.

## AUDIT-CT-012 — Échecs UI non signalés sur plusieurs mutations comptables

- **Domaine :** paramétrage/intégrations.
- **Observé :** plusieurs handlers `await mutateAsync` ne capturent pas l'erreur et n'affichent ni toast ni `ErrorText` (schémas, actions d'écritures, imports/exports selon chemin).
- **Gravité :** **P2**.
- **Impact :** l'utilisateur peut ne pas comprendre qu'une opération n'a pas persisté.
- **Correction / test :** gestion d'erreur uniforme, bouton réactivé, message serveur lisible, absence de faux succès.
- **Statut :** ouverte.

## AUDIT-CT-013 — Adaptateur Sage et états officiels seulement préparatoires

- **Domaine :** comptabilité avancée.
- **Observé :** tables et permissions existent, mais aucun adaptateur Sage actif ni état SYSCOHADA officiel généré ; l'UI le dit correctement.
- **Gravité :** **P2** si ces fonctions sont incluses dans le périmètre attendu ; dépendance externe assumée.
- **Correction / test :** spécification version/format Sage et référentiel autorisé avant implémentation ; ne pas revendiquer de conformité complète.
- **Statut :** réserve fonctionnelle documentée.

## AUDIT-CT-014 — Extension Excel incohérente au téléchargement du dashboard

- **Domaine :** reporting.
- **Observé :** le backend produit un XLSX avec le MIME OpenXML, mais `FinancialDashboardPage` lui donne l'extension `.xls`.
- **Gravité :** **P3**.
- **Correction / test :** nommer `.xlsx` et vérifier l'ouverture sans avertissement.
- **Statut :** ouverte.

## AUDIT-CT-015 — Tests de contrat statiques périmés

- **Domaine :** non-régression.
- **Observé :** 3 tests échouent sur des chaînes devenues légitimement différentes : libellés d'onglets, intitulé d'intégration et ancien MIME Excel `application/vnd.ms-excel` alors que la sortie est XLSX.
- **Fichiers :** `lot2-accounting-ui.test.ts`, `lot4-accounting-automation-ui.test.ts`, `lot1-financial-dashboard.test.ts`.
- **Gravité :** **P3**.
- **Correction / test :** remplacer les assertions textuelles fragiles par tests de comportement/contrat.
- **Statut :** ouverte, vérification dynamique.

## AUDIT-CT-016 — Dialogue natif pour la réouverture avancée

- **Domaine :** UX clôtures.
- **Observé :** `window.prompt` collecte le motif, contrairement aux modales applicatives et sans état d'erreur intégré.
- **Fichier :** `AccountingAdvancedPanels.tsx`.
- **Gravité :** **P3**.
- **Correction / test :** modale contrôlée avec validation dix caractères et erreurs API.
- **Statut :** ouverte.
