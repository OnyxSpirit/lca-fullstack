# Matrice documentaire finale

## Entrées DOC-001 à DOC-051

La matrice exhaustive de référence reste [l’inventaire d’audit](../../audits/vin-documentation-lca/INVENTAIRE-EXHAUSTIF-DOCUMENTS-ERP.md). Les statuts acquis après la première mission sont conservés sans modification dans ce lot. DOC-001 à DOC-019 et DOC-050/051 restent fonctionnels; DOC-020/021 avaient été harmonisés lors de la première mission. DOC-022 à DOC-049 n’ont reçu aucun changement supplémentaire dans ce lot et conservent donc leurs réserves antérieures sur les exports financiers.

## Entrées ABS

| ID | Document | Endpoint | Permission | Scope | UI | Génération / GED | Test | Statut final |
|---|---|---|---|---|---|---|---|---|
| ABS-001 | Fiche prospect | `/leads/:id/official-pdf` | `crm.prospect.view` | agence + OWN | CRM > détail | live, non archivé | structure + rendu | Partiel |
| ABS-002 | Fiche client | `/customers/:id/official-pdf` | `customers.view` | agence + OWN | Client > détail | live, non archivé | structure + rendu | Partiel |
| ABS-003 | Visite showroom | `/showroom/:id/visit-pdf` | `showroom.view` | agence + OWN | non raccordé | live | structure + rendu | Partiel |
| ABS-004 | Essai véhicule | `/showroom/test-drives/:id/pdf` | `showroom.view` | agence + OWN | non raccordé | final, GED manquante | structure + rendu | Partiel |
| ABS-005 | Inventaire véhicules | `/vehicles/inventory/pdf` | `vehicles.view` | agence | Stock > inventaire PDF | instantané, non GED | structure + rendu | Partiel |
| ABS-006 | Mouvement véhicule | `/vehicle-movements/:id/pdf` | `vehicles.view` | agence source/destination | non raccordé | final, GED manquante | structure + rendu | Partiel |
| ABS-007 | Remboursement | `/payment-refunds/:id/pdf` | `billing.payment.view` | agence facture | non raccordé | final, GED manquante | structure + rendu | Partiel |
| ABS-008 | Annulation | `/invoices/:id/cancellation-pdf`, ventes/paiements équivalents | permissions de lecture métier | agence | non raccordé | final, GED manquante | structure + rendu | Partiel |
| ABS-009 | Diagnostic | `/repair-orders/:id/diagnostic-pdf` | `service.order.view` | agence + OWN | OR > Diagnostic | live | structure + rendu | Partiel |
| ABS-010 | Contrôle qualité | `/repair-orders/:id/quality-control-pdf` | `service.order.view` | agence + OWN | OR > Contrôle qualité | final, GED manquante | structure + rendu | Partiel |
| ABS-011 | Restitution | `/repair-orders/:id/handover-pdf` | `service.order.view` | agence + OWN | OR > Restitution | final, GED manquante | structure + rendu | Partiel |
| ABS-012 | Demande pièces | `/parts-internal-requests/:id/pdf` | `parts.internal_request.view` | agence | Demandes Atelier > Bon PDF | live/final selon statut | structure + rendu | Partiel |
| ABS-013 | Commande/réception pièces | `/parts/purchase-orders/:id/pdf`, `/parts/purchase-receipts/:id/pdf` | `parts.purchase_order.view` | agence | commande non raccordée | final, GED manquante | structure + rendu | Partiel |
| ABS-014 | Mouvement pièces | `/parts/movements/:id/pdf` | `parts.stock.view` | agence | non raccordé | final, GED manquante | structure + rendu | Partiel |
| ABS-015 | Inventaire pièces | `/parts/inventory/pdf` | `parts.inventory.view` | agence | Pièces > Inventaire PDF | instantané, non GED | structure + rendu | Partiel |
| ABS-016 | Journal comptable | `/accounting/journals/:id/pdf` | `accounting.journal.advanced.view` | agence | non raccordé | état de période | structure + rendu | Partiel |
| ABS-017 | Pièce comptable | `/accounting/entries/:id/pdf` | `accounting.entry.view` | service métier | non raccordé | final si comptabilisée, GED manquante | structure + rendu | Partiel |
| ABS-018 | Rapprochement | `/treasury/bank-statements/:id/pdf` | `treasury.reconciliation.export` | service métier | non raccordé | final si validé, GED manquante | structure + rendu | Partiel |

« Partiel » signifie endpoint et renderer présents, mais critère de clôture complet non satisfait (UI, GED ou intégration réelle).
