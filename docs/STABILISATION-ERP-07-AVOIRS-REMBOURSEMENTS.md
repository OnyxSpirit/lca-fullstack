# ERP-07 — Avoirs et remboursements

Le workflow existe réellement. L'avoir #2 `AVO-REC01A2-2026-000002` de 100 000 XAF est rattaché à la facture #6, statut `applied`. Son rejeu idempotent renvoie 200 sans doublon ; un montant supérieur au disponible est refusé.

Le remboursement #1 de 100 000 XAF est rattaché au paiement #6 et à l'avoir #2. Deux appels concurrents n'ont créé qu'un remboursement ; l'autre a reçu 409. Le paiement reste `confirmed` avec statut effectif `partially_refunded`. Le mouvement Treasury `OUT` est `POSTED` et le net facturé/encaissé reste équilibré à 1 089 000 XAF.

Réserve : aucun PDF d'avoir ou de remboursement n'est implémenté. Aucun nouveau document ni règle métier n'a été inventé.
