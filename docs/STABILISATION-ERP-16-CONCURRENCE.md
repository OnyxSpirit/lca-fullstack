# ERP-16 — Concurrence transactionnelle REC16-CONC

## Verdict

Bloc réel **VALIDÉ** par API et MySQL sur des ressources dédiées. Aucun scénario ne réutilise ni ne modifie `REC16-GAR-01`.

| Scénario | Précondition / requêtes concurrentes | Réponses API | État MySQL exact | Verdict |
|---|---|---|---|---|
| Vente | véhicule 13 `REC16CN0000000001` disponible ; deux `POST /sales` avec deux clés distinctes | une création `201`, un conflit `409` | une vente 10, véhicule `reserved`, un audit de vente | VALIDÉ |
| Encaissement | facture 19, total 118 900 XAF ; deux paiements de 100 000 XAF distincts | une création `201`, un refus `409` | un paiement, encaissé 100 000, solde 18 900, statut `partially_paid` | VALIDÉ |
| Livraison | livraison 6 prête ; deux `POST /deliveries/6/sign` | finalisation et rejeu convergent vers `delivered` | une signature, une transition `delivered`, un document GED | VALIDÉ |
| Pièces | pièce 7 `REC16-CONC-DERNIERE`, stock source 1 ; deux transferts de 1 avec clés distinctes | `201` + `409 Stock disponible insuffisant` | source 0, destination 1, un mouvement sortant et un entrant, aucun stock négatif | VALIDÉ |
| OR | OR 8 ; deux transitions `planned → received` | une réussite `200`, un conflit `409` | une seule transition `received`, une intervention | VALIDÉ |
| Facturation Atelier | deux `POST /repair-orders/8/invoice` simultanés | `201` + `201`, tous deux renvoient l'ID 23 | une facture active 23 et un document GED | VALIDÉ |

Ressources principales : client 10, véhicules 13/14, ventes 10/11, facture véhicule 22, livraison 6, OR 8 `OR-1791746618067`, facture Atelier 23 et pièce 7.

Les statuts HTTP sont interprétés selon chaque contrat : la finalisation Livraison et la facturation Atelier sont idempotentes et peuvent donc répondre avec succès aux deux appels, alors que Vente, Paiement distinct et Pièces refusent le perdant concurrent.

