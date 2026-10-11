# ERP-16 — Audits et traçabilité

Les SELECT en lecture seule confirment :

- `audit_logs` : auteur, agence, concession et horodatage pour ventes 9 à 11, factures/paiements, livraisons 5/6 et garantie 2 ;
- `repair_order_status_history` : neuf états ordonnés pour OR 7 et huit pour OR 8 ;
- `delivery_status_history` : cinq états ordonnés pour livraisons 5 et 6 ;
- `part_movements` : inventaire/transfert de la pièce 7 et inventaire/ajustement de la pièce 8, stocks avant/après et auteur ;
- `warranty_claims`/`warranty_claim_payments` : créance 2 payée 41 615 XAF, reçu 41 615 XAF, solde nul, clé de requête conservée.

Preuve brute : `/tmp/stabilisation-erp-16-audits.tsv`.

Statut : **VALIDÉ**.

