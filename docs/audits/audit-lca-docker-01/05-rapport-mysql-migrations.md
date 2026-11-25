# MySQL et migrations

## État principal

- Versions 133 et 134 enregistrées comme appliquées.
- Migration 135 absente de `schema_migrations`.
- Étapes 1–6 de 135 : APPLIED.
- Étape 7 de 135 : FAILED_PARTIAL.
- Migration 136 : non commencée.
- `is_workshop_technician` existe.
- Les tables et permissions LCA-03 recherchées sont absentes.
- `invoices.customer_id` reste NOT NULL ; les colonnes tiers ne sont pas présentes.

Le runner protège les données en refusant un checksum modifié. La cause initiale de l’état partiel est l’ALTER de `invoices.customer_id`, qui rencontre le nom de contrainte existant `fk_invoice_customer`. La cause actuelle du redémarrage est le drift de checksum de l’étape 2, détecté avant toute reprise.

## Baseline / migration 094

La baseline marquée niveau 071 contient déjà les colonnes `actor_type`, `actor_user_id` et `operation_agency_id`, alors que la migration 094 tente de les ajouter. Cette incohérence rend une reconstruction fraîche par simple baseline + migrations non reproductible sans logique spéciale ou baseline correctement renumérotée. La base principale historique possède toutefois la migration 094 enregistrée et ses colonnes.

## Migration 136

Elle n’est pas responsable du blocage actuel : son exécution n’est jamais atteinte. Sa compatibilité historique reste à qualifier après réparation contrôlée de 135 ; une réussite sur base fraîche ne suffit pas.

