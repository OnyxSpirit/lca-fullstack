# Registre final des anomalies

| ID | Gravité | Anomalie | Preuve | Action requise |
|---|---|---|---|---|
| FIN-001 | Majeure | Archivage GED des nouveaux documents finalisés incomplet | 12/12 archives MySQL, SHA-256, agence/auteur, rejeu sans doublon; GET 16→16 | **CORRIGÉE ET VALIDÉE** |
| FIN-002 | Majeure | DOC-022 à DOC-049 non intégralement harmonisés/réouverts | DOC-022 PDF 200; 6/6 XLSX rouverts; 21/21 CSV contrôlés | **CORRIGÉE ET VALIDÉE** |
| FIN-003 | Moyenne | Certains accès UI événementiels restent moins directs que demandé | actions Facturation/Ventes/Magasin raccordées; permissions dynamiques; suite frontend 219/219 | **CORRIGÉE ET VALIDÉE** |
| FIN-004 | Moyenne | Worker d’intégration comptable : conflit de collations | `source_id` en `utf8mb4_unicode_ci` comparé à des conversions héritant de la collation de connexion; filtre sur une colonne `credit_notes.created_at` absente | quatre jointures explicitement alignées sur `utf8mb4_unicode_ci`; filtre fondé sur `issue_date`; test ajouté; backend reconstruit et worker rejoué sur MySQL 8.4 (`discovered: 0`, `processed: 0`) — **CORRIGÉE ET VALIDÉE** |

## Verdict

**MISSION VALIDÉE**

Les 18 familles et leurs variantes sont générables et validées sur MySQL isolé. FIN-001 à FIN-004 sont fermées sans réserve fonctionnelle restante dans le périmètre documentaire.
