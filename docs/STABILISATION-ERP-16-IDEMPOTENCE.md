# ERP-16 — Idempotence transactionnelle REC16-CONC

| Intention | Mécanisme réel | Rejeu observé | Persistance | Verdict |
|---|---|---|---|---|
| Facture séquentielle | `idempotencyKey=REC16-CONC-INV-SEQUENTIAL` | `201`, puis `200 duplicate=true`, même ID 17 | une facture | VALIDÉ |
| Facture concurrente | `idempotencyKey=REC16-CONC-INV-CONCURRENT` | création et doublon, même ID 18 | une facture | VALIDÉ |
| Paiement séquentiel / réponse perdue | `idempotencyKey=REC16-CONC-PAY-REPLAY` | premier paiement, puis `200 duplicate=true`, même paiement | une ligne, 60 000 XAF sur facture 20 | VALIDÉ |
| Paiement concurrent identique | `idempotencyKey=REC16-CONC-PAY-CONCURRENT` | deux appels, même ID métier | une ligne, 65 000 XAF sur facture 21 | VALIDÉ |
| Paiements distincts incompatibles | deux clés distinctes de 100 000 XAF sur facture 19 | un `201`, un `409` | pas de surencaissement | VALIDÉ |
| Livraison | état terminal sous verrou, archive `delivery:6:finalized:v2` | rejeu explicite `200`, statut inchangé | une signature, une transition, un document | VALIDÉ |
| Facturation Atelier | unicité de la facture active par OR, verrou OR | deux réponses `201` avec ID 23 | une facture et une archive | VALIDÉ |

Le rejeu d'un paiement est reconnu par la clé d'idempotence, distincte de deux intentions légitimes. Les clés sont persistées et protégées par verrou/contrainte ; aucun nouveau mécanisme métier n'a été inventé.

Preuves brutes : `/tmp/stabilisation-erp-16-concurrency.json`, `/tmp/stabilisation-erp-16-concurrency-resume.json` et `/tmp/stabilisation-erp-16-concurrency-parts.json`.

