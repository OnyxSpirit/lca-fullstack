# ERP-07 — Concurrence et idempotence

- Création simultanée, même clé : après correction, 201 + 200 et une seule facture.
- Rejeu d'une facture : 200, aucune duplication.
- Double émission : 200 + 200, une archive officielle.
- Paiement concurrent du solde : 201 + 409, encaissé jamais supérieur au solde.
- Rejeu d'avoir : 201 initial puis 200.
- Remboursement concurrent : 201 + 409, plafond de l'avoir respecté.

Le défaut initial était un `ER_LOCK_DEADLOCK` exposé en 500. `transaction()` délègue désormais à un retry borné (3 tentatives) sur les seuls interblocages MySQL ; toutes les autres erreurs sont propagées. La contrainte unique reste la protection finale.

Annulation concurrente et création concurrente d'avoir avec deux clés distinctes n'ont pas été exécutées ; les verrous et contraintes ont été inspectés mais ne sont pas comptés VALIDÉ.
