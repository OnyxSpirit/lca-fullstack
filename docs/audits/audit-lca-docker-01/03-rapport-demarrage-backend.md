# Démarrage du backend

Commande effective :

```text
node dist/scripts/database-bootstrap.js && node dist/server.js
```

Le premier processus échoue ; le second n’est jamais exécuté. État inspecté : `Restarting`, code de sortie 1, pas d’OOM, PID nul entre deux tentatives. Les journaux répètent :

```text
Migration 135_evolution_lca_02_foundation.sql: PENDING
MIGRATION_CHECKSUM_MISMATCH: 135_evolution_lca_02_foundation.sql étape 2
```

Le journal MySQL apporte une seconde preuve : étapes 1 à 6 APPLIED et étape 7 FAILED_PARTIAL avec `Duplicate foreign key constraint name 'fk_invoice_customer'`.

Le fichier actuel produit pour l’étape 2 le checksum `ebeae01…f9d23`, tandis que le journal conserve `401465…6d49b`. Une version de la migration a donc été exécutée puis modifiée sans nouvelle migration additive. Le runner refuse correctement ce drift.

Le code applicatif Express, l’écoute sur 3001 et l’initialisation des services ne sont jamais atteints. La migration 136 n’est jamais examinée.

