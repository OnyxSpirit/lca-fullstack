# Registre final des anomalies

| ID | Gravité | Anomalie | Preuve | Action requise |
|---|---|---|---|---|
| FIN-001 | Majeure | Archivage GED des nouveaux documents finalisés incomplet | aucune archive ABS créée pendant la recette | raccorder aux transitions existantes avec clé source idempotente |
| FIN-002 | Majeure | DOC-022 à DOC-049 non intégralement harmonisés/réouverts | campagne ExcelJS/CSV absente | générer et rouvrir chaque export |
| FIN-003 | Moyenne | Certains accès UI événementiels restent moins directs que demandé | endpoint fonctionnel mais action non présente pour chaque sous-variante | compléter facture/remboursement/réception/mouvements |
| FIN-004 | Moyenne | Worker d’intégration comptable : conflit de collations | `source_id` en `utf8mb4_unicode_ci` comparé à des conversions héritant de la collation de connexion; filtre sur une colonne `credit_notes.created_at` absente | quatre jointures explicitement alignées sur `utf8mb4_unicode_ci`; filtre fondé sur `issue_date`; test ajouté; backend reconstruit et worker rejoué sur MySQL 8.4 (`discovered: 0`, `processed: 0`) — **CORRIGÉE ET VALIDÉE** |

## Verdict

**MISSION NON VALIDÉE**

Les 18 familles sont générables et validées sur MySQL. FIN-004 est corrigée et validée. FIN-001, FIN-002 et FIN-003 restent ouvertes et empêchent encore la validation finale.
