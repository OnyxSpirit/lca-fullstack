# ERP LCA — Lot 6 : rapprochement bancaire, imports et OCR

## Architecture livrée

Le module réutilise les comptes `treasury_accounts` de type `BANK` et le rapprochement historique de la migration 076. Aucun second référentiel bancaire et aucun mouvement Treasury fictif ne sont créés. La migration 123 ajoute les profils d’import, l’historique d’extraction, les groupes de rapprochement, les affectations partielles et les écarts.

La chaîne est : compte bancaire autorisé → extraction locale → normalisation CSV interne → aperçu brouillon → validation humaine → propositions → rapprochement unitaire ou multiple → audit. Les affectations multiples verrouillent les lignes bancaires et les mouvements Treasury, puis contrôlent les cumuls avant insertion. L’annulation libère les affectations sans supprimer les sources.

## Formats

- CSV : analyse native, séparateurs et formats décimaux configurables.
- XLSX : lecture de la première feuille avec ExcelJS. Le format binaire XLS est refusé avec une demande de conversion, car ExcelJS ne le garantit pas.
- PDF textuel : extraction locale par Poppler `pdftotext`, puis profil regex explicite.
- PDF numérisé : détection de l’absence de texte, rendu limité aux 20 premières pages par `pdftoppm`, puis appel local à Tesseract en français et anglais.

Un résultat PDF/OCR sans ligne reconnue est refusé. Un résultat OCR porte un avertissement et doit être validé humainement. Les fichiers temporaires sont créés avec des droits restreints et supprimés dans un bloc `finally`. Aucun service OCR externe ne reçoit de données.

### Réserve OCR réelle

Poppler 24.02.0 est disponible et le test PDF textuel réussit. L’image backend installe désormais Tesseract avec les langues `fra+eng`. Le conteneur de recette actuellement démarré n’a pas été reconstruit ni déployé conformément à l’interdiction de déploiement : l’OCR reste donc préparatoire jusqu’au build de l’image et à un test représentatif après reconstruction.

## Permissions

Les permissions existantes `treasury.reconciliation.*` restent appliquées. La migration ajoute `treasury.reconciliation.dashboard`, `treasury.reconciliation.profile.manage`, `treasury.reconciliation.discrepancy.manage`, `treasury.reconciliation.history` et `treasury.bank_account.manage`. Toutes les routes utilisent l’agence active et les comptes hors périmètre sont exclus côté SQL.

## API ajoutée

- `GET /api/treasury/bank-reconciliation/dashboard`
- `POST /api/treasury/bank-reconciliation/groups`
- `POST /api/treasury/bank-reconciliation/groups/:id/cancel`
- `GET /api/treasury/bank-reconciliation/discrepancies`
- `POST /api/treasury/bank-reconciliation/discrepancies`

L’endpoint historique d’aperçu accepte désormais CSV, XLSX et PDF. Il persiste le moteur, le format et les avertissements d’extraction.

## Validation MySQL

Le refus sur `127.0.0.1:3307` provenait d’une configuration locale erronée. La recette expose MySQL 8.4.11 sur `127.0.0.1:33321`. La base jetable `lca_lot6_validation_20261112` a été créée séparément ; le bootstrap complet a atteint le niveau 123. Les tables des migrations 122 et 123 sont donc réellement créées sur MySQL 8.4.

Le test FIN-07 réel réussit en 8,7 s et couvre l’import CSV, le doublon de fichier, le refus d’un compte non bancaire, les propositions ambiguës, deux rapprochements concurrents, l’idempotence, l’annulation, l’audit et l’absence de création de mouvements Treasury. La préparation indépendante d’une base au niveau 121 a été lancée, mais les longues reprises du runner ont été interrompues par la limite d’exécution de l’outil ; le scénario spécifique 121 → 122 → 123 n’est donc pas déclaré réussi.

## Autres validations

- cinq tests du lot 6 réussis : CSV, XLSX, PDF textuel, migration et francisation ;
- build TypeScript backend réussi ;
- build Vite frontend réussi ;
- KPI remplacé par « Solde de trésorerie », sans changement de formule ;
- `npm audit` n’a pas pu joindre `registry.npmjs.org` (`ENOTFOUND`). Les risques transitifs déjà documentés restent ouverts.

Aucune campagne de performance représentative n’a été exécutée : aucun p50 ou p95 n’est inventé.

## Procédure de recette

1. Aller dans **Comptabilité & Trésorerie → Rapprochement bancaire** avec `treasury.reconciliation.view`.
2. Choisir **Importer**, un compte bancaire actif du périmètre et un fichier fictif CSV/XLSX/PDF.
3. Vérifier les colonnes, dates, montants, devise, avertissements et doublons dans l’aperçu.
4. Avec `treasury.reconciliation.validate_import`, valider ou rejeter le brouillon.
5. Ouvrir une opération, examiner les candidats et ne confirmer une ambiguïté qu’après contrôle.
6. Pour un paiement partiel ou groupé, utiliser les affectations multiples ; une sur-affectation doit retourner 409.
7. Qualifier les frais ou opérations inconnues comme écarts, sans modifier silencieusement Treasury.
8. Annuler avec un motif : les allocations doivent être libérées et l’historique conservé.
9. Exporter le relevé avec `treasury.reconciliation.export`.

Les états SYSCOHADA, Sage, reports définitifs, valorisation des stocks et règles RH restent soumis aux réserves documentées des lots précédents.
