# ERP-07 — Anomalies

## Corrigées

1. **Facture de total nul acceptée** — reproduction 201 et facture #3 à 0 XAF. Cause : agrégation autorisant un TTC nul. Correction minimale : rejet 400 de tout total `<= 0`, test ciblé ajouté.
2. **Création concurrente idempotente exposant un deadlock en 500** — reproduction MySQL `ER_LOCK_DEADLOCK`. Correction minimale : retry transactionnel borné à 3 sur ce code uniquement. Nouvelle exécution : 201 + 200, un enregistrement.

## Résiduelles

- Le détail frontend affiche encore des valeurs techniques `FACTURE_MANUELLE`, `confirmed` et `partially_refunded` en complément des libellés métier. Impact faible, correction UX différée pour éviter un changement de design.
- La suite globale reste historiquement rouge : 180/219 tests réussis, 39 échecs hors périmètre ou de conformité textuelle préexistants. Les tests ciblés ERP-07 passent.
- La facture #4 conserve l'état partiel issu d'une passe interrompue ; il est cohérent et traçable, sans écriture SQL corrective.
