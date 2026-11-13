# Rapport de tests documentaires

## PDF

- `document-identity-footer.test.ts` : 10 tests réussis. NIU, ordre légal, valeurs absentes, valeurs longues, multipage, logo/en-tête et archives historiques couverts.
- `delivery-stabilization.test.ts` : 7 tests réussis. Transaction, permissions, checklist, GED, empreinte et renderer partagé couverts.
- `accounting-document-lca.test.ts` : 2 tests réussis. PDF réel `%PDF`, fin `%%EOF`, 90 lignes et plusieurs pages ; absence de `slice(0,1500)` et collecte exhaustive vérifiées.
- Inspection visuelle manuelle et impression physique : non exécutées dans cette passe.

## Excel et CSV

- Compilation ExcelJS réussie. Les exports grand livre/balance restent de vrais OOXML écrits par `book.xlsx.write()` ; feuilles françaises, filtre, gel et style d’en-tête ajoutés.
- Réouverture du fichier par ExcelJS : non exécutée sans jeu de données d’intégration.
- Les CSV comptables passent toujours par `financialCsv()` : BOM UTF-8, séparateur français, échappement et protection `=`, `+`, `-`, `@` conservés.
- Les exports reporting hors grand livre/balance n’ont pas été harmonisés et restent réservés.

## Signatures, cachets et GED

Le système de signature utilisateur/cachet existant reste présent. Le fac-similé client est optionnel ; lorsqu’il est absent, le PV prévoit la signature manuscrite. Le consentement et l’empreinte restent stockés. Les archives existantes ne sont jamais réécrites. La création réelle d’une nouvelle archive n’a pas été testée contre MySQL dans cette passe.
