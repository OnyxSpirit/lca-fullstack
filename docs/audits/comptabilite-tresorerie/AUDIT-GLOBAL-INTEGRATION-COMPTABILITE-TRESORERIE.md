# Audit global d'intégration Comptabilité & Trésorerie

**Date :** 13 novembre 2026  
**Nature :** audit transversal unique des six lots, sans correction métier  
**Verdict :** **AUDIT COMPLET AVEC RÉSERVES**

## 1. Résumé exécutif

Le domaine possède une fondation technique substantielle : six routes frontend dédiées, 105 endpoints protégés, migrations 119 à 124, transactions/idempotence dans les flux sensibles et interfaces réellement raccordées pour Treasury, écritures, automatisation, analyses et rapprochement unitaire. Aucun tableau métier codé en dur ni bouton affichant un faux succès explicite n'a été trouvé dans le périmètre inspecté.

Le domaine n'est toutefois pas intégralement utilisable. Quatre anomalies P1 empêchent de considérer l'intégration comme achevée : le workflow de clôture avancé peut être contourné par l'ancien changement direct de statut ; le rapprochement avancé (groupes, allocations partielles, écarts) n'a pas d'interface ; Tesseract manque dans l'environnement audité ; et la porte d'entrée Comptabilité exige abusivement `accounting.chart.view`, même pour des utilisateurs autorisés seulement sur les écritures ou analyses.

La validation dynamique métier reste limitée : `concession_erp` est la base partagée explicitement interdite d'écriture, et l'isolation/autorisation de `lca_recette` n'est pas démontrée. Les vérifications de persistance, RBAC multi-agences et parcours financiers complets n'ont donc pas été simulées par des écritures.

## 2. Chiffres de couverture

| Indicateur | Résultat |
|---|---:|
| Pages frontend auditées | 6 |
| Actions/capacités recensées | 64 |
| Endpoints analysés | 105 |
| Permissions endpoint distinctes examinées | 60 |
| Capacités validées statiquement | 48 |
| Capacités partiellement opérationnelles | 8 |
| Capacités non raccordées | 6 |
| Capacités en anomalie directe | 2 |
| Boutons superficiels / faux succès | 0 |
| Anomalies P0 / P1 / P2 / P3 | 0 / 4 / 9 / 3 |
| Contrôles dynamiques exécutés | 18 |
| Scénarios métier dynamiques non exécutés | 13 |

Les détails action par action sont dans [la matrice](./MATRICE-TRACABILITE-FRONTEND-BACKEND-MYSQL.md) et les constats dans [le registre](./REGISTRE-ANOMALIES-COMPTABILITE-TRESORERIE.md).

## 3. Périmètre réellement audité

- Domaine A : dashboard, comptes, soldes, journal, entrées/sorties manuelles, transferts, réservations, budgets, exports et justificatifs.
- Domaine B : plan comptable, exercices/périodes, journaux, liaisons Treasury-classe 5, schémas.
- Domaine C : brouillons, lignes, validation, comptabilisation, numérotation, contrepassation, périodes et idempotence.
- Domaine D : découverte et supervision des événements d'intégration ; liens facturation, paiements, Treasury, fournisseurs, dépenses, rémunérations et SAV recensés dans les services/tests.
- Domaine E : grand livre, balance, auxiliaires, journaux, contrôles, clôtures, reports, états, exports et réserve Sage.
- Domaine F : CSV, XLSX, PDF texte/OCR, import, doublons, propositions, rapprochement unitaire, groupes/allocations/écarts côté backend.

Hors validation : conformité SYSCOHADA officielle, exactitude métier sur données réelles, Sage et états réglementaires faute de référentiel/spécification externe autorisés.

## 4. Environnement

- Frontend React 19 / TypeScript / Vite / TanStack Query / Socket.IO Client.
- Backend Node/Express 5/TypeScript/MySQL2/JWT/Socket.IO.
- Conteneurs `frontend`, `backend`, `mysql` démarrés et sains au moment du contrôle.
- Backend connecté à `concession_erp`, base partagée : lecture du statut seulement, aucune écriture.
- Diagnostic migrations depuis le conteneur : **WARNING**, 78 migrations enregistrées, 0 en attente, 0 bloquée ; dérive historique compatible sur `121_accounting_automation.sql`, sans réexécution. Le dépôt se termine à 124.
- `lca_recette` est déclaré dans `.env.recette`, mais aucun élément ne prouve qu'il est jetable ou autorisé pour cette campagne.
- Dépendances : `pdftotext` et `pdftoppm` présents ; `tesseract` absent.

## 5. Méthodologie

1. Inventaire des routes React, liens de navigation, composants, boutons, formulaires, hooks et URLs.
2. Inventaire des routeurs Express, permissions, services, requêtes et tables/migrations 119–124.
3. Chaînage composant → handler → hook → HTTP → route → service → tables.
4. Recherche de mocks, succès simulés, TODO, dialogues natifs et capacités sans consommateur.
5. Contrôles non destructifs : typage, suites ciblées, état conteneurs, statut migrations et dépendances locales.
6. Qualification stricte : aucune lecture de code n'est déclarée « validée dynamiquement ».

## 6. Inventaire frontend

| Route | Page principale | Fonction |
|---|---|---|
| `/treasury` | `FinancialDashboardPage` | pilotage, KPI, activités, exports |
| `/treasury/operations` | `TreasurySectionPage` + `TreasuryPage` | journal, opérations, comptes, transferts |
| `/treasury/commitments` | mêmes + `BudgetTreasuryPanel` | couverture, réservations, budgets |
| `/treasury/reconciliation` | `BankReconciliationPanel` | import et rapprochement unitaire |
| `/treasury/settings` | `TreasuryPage`, `TreasuryFlowMappingsTable` | comptes, catégories, flux |
| `/treasury/accounting` | `AccountingPage` et panneaux spécialisés | paramétrage, écritures, intégrations, analyses, clôtures |

Les états chargement/erreur/vides sont présents sur les vues majeures, mais la gestion des erreurs de mutation n'est pas uniforme (AUDIT-CT-012). Les données métier proviennent des API ; les dictionnaires de libellés, listes d'états et options de référence ne sont pas des mocks métier.

## 7. Résultats backend

### Points solides

- Montage global derrière authentification et contexte d'agence, puis permission dynamique par endpoint.
- Transactions et verrous dans écritures, automatisation, mouvements et rapprochements.
- Clés d'idempotence/source dans les flux sensibles ; contraintes de doublons dans les migrations.
- Écritures équilibrées, comptes actifs/imputables et périodes contrôlés dans le moteur.
- Exports générés réellement par CSV, ExcelJS ou PDFKit.
- OCR appelé via processus locaux avec nettoyage d'un répertoire temporaire privé.

### Écarts

- Ancien endpoint période incompatible avec le workflow avancé (AUDIT-CT-001).
- API plus riche que l'interface : paramétrage, contrôle détaillé, clôture annuelle/report, banque avancée (002, 006, 007, 010).
- États officiels et Sage volontairement préparatoires (013).

## 8. Résultats MySQL et migrations

Les migrations 119–124 créent les référentiels, écritures/lignes/séquences, schémas/événements/tentatives, contrôles/clôtures/reports/états/échanges et objets bancaires avancés. Les FK, index, checks et uniques couvrent les relations principales et plusieurs risques de doublon.

Limites : les tables `bank_import_profiles`, `accounting_statement_*` et `accounting_exchange_*` dépassent les capacités réellement exposées ; leur présence ne vaut pas fonctionnalité. La migration 124 est une réparation additive `CREATE TABLE IF NOT EXISTS`, non une preuve de données conformes. Aucune requête de validation métier n'a été exécutée sur la base partagée.

## 9. Résultats RBAC multi-agences

Le backend utilise `requireAgencyPermission` et le middleware d'agence active. Les boutons sont majoritairement filtrés avec `can()`. Soixante permissions distinctes protègent les endpoints recensés.

Réserves majeures : garde de route trop spécifique (AUDIT-CT-004), validation d'import visible sans permission dédiée (008) et onglet comptable non resynchronisé après changement d'agence (011). Les cinq scénarios obligatoires sont analysés statiquement mais non exécutés sur une base de recette autorisée.

## 10. Intégrations et cohérence financière

Le code couvre les événements facture émise/annulée, encaissement/remboursement, facture/avoir fournisseur, dépense/décaissement, rémunération et mouvement Treasury. L'automatisation sépare événement, tentative et écriture, avec `source_key` et contrôles de doublons.

La chaîne Vente → Facture → Encaissement → Treasury → Comptabilité est raccordée dans le code et les tests ciblés. Grand livre et balance lisent les écritures comptabilisées. Le rapprochement unitaire relie une ligne bancaire à un mouvement Treasury sans créer silencieusement ce mouvement. La chaîne complète n'a pas été rejouée sur MySQL dans cette campagne ; elle reste un scénario de recette prioritaire.

Risques principaux : contournement de clôture, fonctions avancées non accessibles, absence OCR, actions RBAC non alignées et absence de preuve dynamique multi-agences.

## 11. Vérifications dynamiques

### Exécutées (18 contrôles)

- 2 contrôles TypeScript : frontend et backend, réussis.
- 7 fichiers de tests frontend ciblés : 5 réussis, 2 échouent sur assertions textuelles périmées.
- 6 fichiers de tests backend Lots 1–6 : Lots 2–6 réussissent ; Lot 1 échoue uniquement sur l'ancien MIME Excel attendu.
- 1 inspection des conteneurs : trois services sains.
- 1 diagnostic migrations en lecture seule : connexion réussie, aucune migration en attente, avertissement compatible sur 121.
- 1 contrôle de dépendances OCR : Tesseract absent.

### Non exécutés (13 scénarios)

1. Super Admin réel ; 2. comptable autorisé ; 3. utilisateur limité ; 4. sans permission ; 5. multi-agences A/B ; 6. cycle écriture et contrepassation MySQL ; 7. parcours vente-finance complet ; 8. import CSV réel ; 9. import XLSX réel ; 10. PDF texte réel ; 11. PDF OCR réel ; 12. rapprochement groupé/partiel ; 13. ouverture et contrôle de tous les exports produits.

Motif commun : absence de base jetable explicitement autorisée ; OCR en plus bloqué par dépendance manquante.

## 12. Anomalies et risques

Le registre contient 16 anomalies : 0 P0, 4 P1, 9 P2 et 3 P3. Aucune perte, corruption ou double comptabilisation n'a été constatée dynamiquement ; aucune gravité P0 n'est donc attribuée. Les P1 sont justifiées par une gouvernance de clôture contournable, deux ensembles fonctionnels essentiels inaccessibles et une dépendance OCR absente.

## 13. Limites

- Pas d'écriture sur `concession_erp` et pas d'accès à une base jetable prouvée.
- Pas de test navigateur avec comptes réels ni de changement d'agence en session.
- Pas de fichier bancaire réel fourni.
- Pas de référentiel SYSCOHADA officiel autorisé ni de spécification Sage.
- Les tests existants prouvent des contrats ciblés, pas une recette utilisateur exhaustive.

## 14. Plan de correction

Le [plan global](./PLAN-GLOBAL-CORRECTIONS-COMPTABILITE-TRESORERIE.md) propose une séquence unique : sécuriser la recette et les dépendances ; unifier la clôture ; corriger la porte RBAC ; raccorder les capacités existantes ; compléter la banque avancée ; finaliser ou maintenir explicitement bloqués états/Sage ; puis rejouer la non-régression transversale.

## 15. Verdict

**AUDIT COMPLET AVEC RÉSERVES**

Les six lots, leurs interfaces, 105 endpoints, 60 permissions et les migrations associées ont été cartographiés. Les réserves dynamiques sont explicitement circonscrites et le plan est suffisamment précis pour engager une campagne de correction structurée. Le domaine n'est pas déclaré prêt pour la production.
