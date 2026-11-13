# Registre final des anomalies

| ID | Gravité | Anomalie | Preuve | Action requise |
|---|---|---|---|---|
| FIN-001 | Majeure | Archivage GED des nouveaux documents finalisés incomplet | aucune archive ABS créée pendant la recette | raccorder aux transitions existantes avec clé source idempotente |
| FIN-002 | Majeure | DOC-022 à DOC-049 non intégralement harmonisés/réouverts | campagne ExcelJS/CSV absente | générer et rouvrir chaque export |
| FIN-003 | Moyenne | Certains accès UI événementiels restent moins directs que demandé | endpoint fonctionnel mais action non présente pour chaque sous-variante | compléter facture/remboursement/réception/mouvements |
| FIN-004 | Moyenne | Worker d’intégration comptable : conflit de collations | logs recette MySQL 8.4 | harmoniser les collations dans une migration additive dédiée |

## Verdict

**MISSION NON VALIDÉE**

Les 18 familles sont générables et validées sur MySQL, mais FIN-001 et FIN-002 restent des critères essentiels explicites de la mission.
