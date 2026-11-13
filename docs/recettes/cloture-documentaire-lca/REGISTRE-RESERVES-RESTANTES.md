# Registre des réserves restantes

| ID | Gravité | Cause / impact | Réalisé | Manquant / action |
|---|---|---|---|---|
| RES-001 | Majeure | UI incomplète : plusieurs documents ne sont pas accessibles depuis leur écran métier | endpoints sécurisés | raccorder ABS-003/004/006/007/008/013-réception/014/016/017/018 |
| RES-002 | Majeure | Archives finales absentes : preuve GED/immutabilité impossible | règles inventaire non-GED, routes sans mutation | brancher l’archivage sur les transitions métier finales, jamais sur la simple consultation |
| RES-003 | Majeure | Aucune recette MySQL isolée exécutée | tests statiques et rendu synthétique | créer/identifier une base dédiée différente de `concession_erp`, migrer et tester deux agences |
| RES-004 | Majeure | Schémas SQL réels des 18 routes non exercés | compilation TypeScript verte | exécuter chaque requête sur la base isolée et corriger les écarts de colonnes |
| RES-005 | Moyenne | XLSX/CSV DOC-022 à DOC-049 non réouverts dans ce lot | acquis grand livre/balance conservés | campagne ExcelJS/CSV complète et harmonisation française |
| RES-006 | Moyenne | Inspection visuelle exhaustive non exécutée | renderer multipage testé | produire des fixtures représentatives, rasteriser et inspecter chaque famille |

## Verdict

**MISSION NON VALIDÉE**

Les réserves RES-001 à RES-004 touchent directement les critères obligatoires de clôture.
