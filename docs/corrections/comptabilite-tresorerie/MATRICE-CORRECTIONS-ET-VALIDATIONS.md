# Matrice des corrections et validations

| ID | P | Cause | Correction / fichiers principaux | Validation | Statut |
|---|---:|---|---|---|---|
| CT-001 | P1 | ancien endpoint Lot 2 concurrent | `accounting.routes.ts`, `AccountingPage.tsx`, `AccountingAdvancedPanels.tsx` : délégation prepare/close/reopen, retrait transition directe, modale | lot2/lot5 + test global, lint/build | CORRIGÉE ET VALIDÉE |
| CT-002 | P1 | backend Lot 6 sans UI | `treasuryHooks.ts`, `BankReconciliationPanel.tsx`, `BankReconciliationGroupsPanel.tsx`, service de requête groupes | lot6 + test global, build | CORRIGÉE ET VALIDÉE |
| CT-003 | P1 | Tesseract absent de l'environnement audité | Dockerfile reproductible, diagnostic service/route/UI | image reconstruite, versions/langues ; pas de PDF image réel | PARTIELLEMENT CORRIGÉE |
| CT-004 | P1 | garde limitée à `chart.view` | `permissions.ts`, `App.tsx`, `Sidebar.tsx`, `TreasuryWorkspace.tsx` | test global frontend, lint/build | CORRIGÉE ET VALIDÉE |
| CT-005 | P2 | table sans API/UI | `bank-import-profile.service.ts`, routes, hooks et panneau : brouillon/validation/désactivation | test global, migration 123 sur MySQL | CORRIGÉE ET VALIDÉE |
| CT-006 | P2 | endpoints avancés non consommés | hooks/panneaux : détail, annuel, report, modèles, échanges | lot5 + test global | CORRIGÉE ET VALIDÉE |
| CT-007 | P2 | API de modification sans actions UI | `AccountingReferenceManagement.tsx`, `accountingHooks.ts` | tests UI, lint/build | CORRIGÉE ET VALIDÉE |
| CT-008 | P2 | import et validation non séparés en UI | permission `validate_import`, rejet/annulation motivés | tests frontend/global | CORRIGÉE ET VALIDÉE |
| CT-009 | P2 | texte unique 15 Mo | validation exacte 5/10/15 Mo | `treasury-functional-corrections` | CORRIGÉE ET VALIDÉE |
| CT-010 | P2 | endpoints unitaires orphelins | hooks/actions et vues non rapprochées | lot6/global | CORRIGÉE ET VALIDÉE |
| CT-011 | P2 | onglet local persistant | `useEffect` agence + ensemble de permissions | test global, build | CORRIGÉE ET VALIDÉE |
| CT-012 | P2 | mutations sans retour utilisateur | `onError`, toasts, erreurs de formulaires, états pending | tests UI + lint | CORRIGÉE ET VALIDÉE |
| CT-013 | P2 | spécifications externes absentes | affichage préparatoire fidèle, aucune fausse activation | revue statique | BLOQUÉE / RÉSERVE |
| CT-014 | P3 | `.xls` sur contenu XLSX | `FinancialDashboardPage.tsx`, test backend mis à jour | lot1 backend | CORRIGÉE ET VALIDÉE |
| CT-015 | P3 | assertions textuelles périmées | 3 contrats initiaux et 4 attentes devenues obsolètes actualisés | 15 fichiers ciblés verts | CORRIGÉE ET VALIDÉE |
| CT-016 | P3 | `window.prompt` | modale contrôlée, motif ≥ 10, erreur intégrée | test global et FIN08 | CORRIGÉE ET VALIDÉE |
| NEW-CT-001 | — | `chown -R /app` très coûteux dans l'image | `Dockerfile` : `COPY --chown`, ownership limité aux volumes | reconstruction image réussie | CORRIGÉE ET VALIDÉE |

Les fichiers de tests ciblés sont détaillés dans le rapport de non-régression. Les preuves dites « validées » couvrent le contrat, la compilation et la base isolée ; elles ne remplacent pas les essais utilisateur décrits dans le guide.

