# ERP-11 — Concurrence

Anomalie reproduite : deux créations simultanées du même courriel pouvaient produire 201 + 500, la pré-vérification applicative étant sujette à course. Correction : conversion de `ER_DUP_ENTRY` en `EMAIL_ALREADY_EXISTS` 409 dans la transaction. Test ciblé `erp11-user-concurrency.test.ts` validé.
