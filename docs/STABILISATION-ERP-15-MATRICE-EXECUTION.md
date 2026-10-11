# ERP-15 — Matrice d'exécution finale

| Scénario | Statut | Preuve |
|---|---|---|
| VENTE-01 / FINANCE-01 / STOCK-01 | VALIDÉ | vente 8, facture 13, paiement 11, livraison 4 |
| DOC-01 | PARTIEL | quatre PDF générés, inspection visuelle incomplète |
| SAV-01 / PIECES-01 / KM-01 | VALIDÉ | OR 6, pièce 6, facture 14, 15→20→25→30 km |
| GARANTIE-01 | NON APPLICABLE | contrat NOT_APPLICABLE |
| Notifications | PARTIEL | persistance oui, reconnexion non rejouée |
| RBAC-01 | VALIDÉ | 50/50 tests ciblés |
| AGENCES-01 / AUDIT-01 | PARTIEL | preuves réelles mais non exhaustives |
| CONCESSIONS-01 | BLOQUÉ | une concession |
| PIECES-02 / CONCURRENCE-01 | NON EXÉCUTÉ | ressources positives préservées |
| Navigateur | PARTIEL | frontend 4176 ouvert, parcours UI complet non rejoué |
