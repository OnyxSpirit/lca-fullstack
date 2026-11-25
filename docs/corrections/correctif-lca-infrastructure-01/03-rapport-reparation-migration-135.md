# Réparation de la migration 135

L'artefact exécuté a été retrouvé dans le blob Git non référencé `d96488bb33c923ecf552c834fcefa6847f1e0fb0`, SHA-256 `ecf1175b37967d2a58034f639b12ff5b32a21f451f6032a621228b75d259fc8e`. Ses étapes 1–7 correspondent exactement au journal. Le fichier 135 a été restauré à cet artefact, sans écriture de checksum.

Cause : l'étape 7 combinait suppression et recréation de `fk_invoice_customer` sous le même nom dans un unique `ALTER TABLE`; MySQL 8.4 refusait le doublon. Le runner exécute désormais ce remplacement en trois phases vérifiées : suppression de la FK exacte, adaptation atomique des colonnes, recréation de la FK exacte. Il reprend les états intermédiaires `RUNNING`/`FAILED_PARTIAL` seulement pour cette forme prouvable et bloque une FK homonyme incompatible.

Les ajouts postérieurs qui avaient modifié silencieusement 135 (`tax_justification`, `sale_return`) sont déplacés dans l'additive 137. Tests : fraîche, après DROP, après colonnes, journal FAILED_PARTIAL, FK incompatible et copie historique; tous les scénarios finaux sont réussis.
