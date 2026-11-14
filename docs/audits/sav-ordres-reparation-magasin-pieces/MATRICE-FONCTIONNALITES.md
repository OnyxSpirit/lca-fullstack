# Matrice des fonctionnalités

| Fonctionnalité | UI | Composant | Endpoint | Permission | Table principale | Test |
|---|---|---|---|---|---|---|
| Liste/création OR | `/service` | ServiceDashboard/NewRepairOrderModal | `/repair-orders` | `service.order.view/create` | `repair_orders` | Automatisé OK |
| Détail/workflow OR | `/service/repair-orders/:id` | RepairOrderDetailPage | `/repair-orders/:id/*` | permissions `service.order.*` | tables `repair_*` | Automatisé OK |
| Véhicule extérieur | modal OR | NewRepairOrderModal | `/workshop/external-vehicles` | création/association atelier | `vehicles`, relations | Automatisé OK |
| Caisse transit | `/service` onglet | SavTransitSection | `/sav/transit*` | `service.transit.*` | `sav_transit_transfers` | Accès SA KO |
| Journal | `/service` onglet | SavJournalSection | `/sav/journal` | `service.journal.view` | historiques/paiements | Accès SA KO |
| Reporting SAV | `/service` onglet | SavReportingSection | `/sav/reporting` | `service.reporting.view` | agrégats | Accès SA KO |
| Catalogue pièces | `/parts` | SparePartsPage | `/parts*` | `parts.catalog.*` | `parts` | Automatisé OK |
| Stock/mouvements | `/parts/:id` | SparePartDetailPage | `/parts/*` | `parts.stock.*` | `part_stocks`, `part_movements` | Automatisé OK |
| Demandes SAV | `/parts/repair-orders` | PartsWorkQueuePage | logistique interne | `parts.internal_*` | `sav_part_requests*` | Automatisé OK |
| Approvisionnement | `/parts` | SparePartsPage | commandes/réceptions | `parts.purchase_order.*` | `purchase_orders*` | Automatisé OK |
| PDF/GED | vues métier | openOfficialPdf | `/api/*/pdf` | permission source | `documents` | Contrats OK |

