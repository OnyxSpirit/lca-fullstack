# Inventaire exhaustif des documents et exports ERP

Légende : `P` partiellement conforme au modèle LCA, `NC` non conforme, `NA` non applicable (fichier utilisateur), `ABS` attendu mais absent. Les chemins UI sont les modules où l'action est exposée ; `—` signifie absence d'action trouvée.

| ID | Module / sous-module | Document | Format | UI | Permission | Service / endpoint | Template | État | Anomalie | Priorité |
|---|---|---|---|---|---|---|---|---|---|---|
| DOC-001 | CRM / Devis | Devis | PDF | Ventes > Devis | `quotations.view` | `GET /quotations/:id/pdf` | commercial central | P | pied incomplet | P1 |
| DOC-002 | Ventes / Pro-forma | Facture pro-forma | PDF | Ventes > Pro-formas | `proformas.export` | `GET /proformas/:id/pdf` | commercial central | P | pied incomplet | P1 |
| DOC-003 | Ventes | Bon de commande | PDF | Détail vente | `sales.view` | `GET /documents/business/sale/:id/pdf` | commercial central | P | pied incomplet | P1 |
| DOC-004 | Facturation | Facture commerciale | PDF | Détail facture | `billing.invoice.view` | `GET /invoices/:id/pdf` | commercial central | P | pied incomplet | P1 |
| DOC-005 | SAV / Facturation | Facture SAV | PDF | Détail facture/OR | `billing.invoice.view` | même endpoint facture | commercial central | P | distinction de type limitée | P2 |
| DOC-006 | Encaissements | Reçu commercial | PDF | Paiements | `billing.payment.view` | `GET /payments/:id/receipt` | commercial central archivé | P | pied incomplet | P1 |
| DOC-007 | SAV / Encaissements | Reçu SAV | PDF | Facture SAV | `billing.payment.view` | même endpoint reçu | commercial central archivé | P | pas d'identité SAV spécifique | P2 |
| DOC-008 | Facturation | Avoir | PDF | Détail facture | `billing.invoice.view` | `GET /credit-notes/:id/pdf` | commercial central archivé | P | pied incomplet | P1 |
| DOC-009 | Retours véhicule | Avoir de résolution | PDF | Retour véhicule | `vehicle.return.view` | `GET /vehicle-returns/:id/credit-notes/:creditNoteId/pdf` | avoir central | P | accès différent, template commun | P2 |
| DOC-010 | Livraisons | PV de livraison/remise | PDF | Détail livraison | `delivery.view` + `delivery.documents.view` | `GET /deliveries/:id/pdf` | livraison centrale | P | capture client obligatoire | P1 |
| DOC-011 | Livraisons | Planning quotidien | PDF | Livraisons | `delivery.view` | `GET /deliveries-planning/pdf` | commercial central | P | pas une archive officielle | P2 |
| DOC-012 | Stock | Fiche véhicule | PDF | Détail véhicule | `vehicles.view` | `GET /documents/business/vehicle/:id/pdf` | commercial central | P | pied incomplet | P1 |
| DOC-013 | SAV | Ordre de réparation | PDF | Détail OR | `service.order.view` | `GET /repair-orders/:id/pdf` | OR central | P | document multi-usage | P2 |
| DOC-014 | SAV | Devis SAV émis | PDF | Détail OR | `service.order.view` | même endpoint, archive estimate | OR central | P | identité de type peu distincte | P2 |
| DOC-015 | Administration | Rapport d'activités | PDF | Activités | `activity.view` | `GET /activity/print/pdf` | activity-document + layout | P | pied nouvelle cible absent | P1 |
| DOC-016 | Administration | Fiche d'activité | PDF | Détail activité | `activity.view` | `GET /activity/:id/print/pdf` | activity-document + layout | P | idem | P1 |
| DOC-017 | RH | Fiche employé standard | PDF | Dossier employé | `hr.employees.view` | `GET /hr/employees/:id/pdf?mode=standard` | employee-document | P | conformité visuelle à confirmer | P2 |
| DOC-018 | RH | Fiche employé complète | PDF | Dossier employé | `hr.employees.view` + `hr.salary.view` | même endpoint, mode complete | employee-document | P | données sensibles | P2 |
| DOC-019 | Retours | PV de retour véhicule | PDF | Retour véhicule | `vehicle.return.view` | `GET /vehicle-returns/:id/pdf` | central archivé | P | pied incomplet | P1 |
| DOC-020 | Comptabilité | Grand livre | PDF | Comptabilité | `accounting.advanced.export` | `/accounting/advanced/export/ledger/pdf` | PDFKit local | NC | aucune identité/pied/table réelle | P1 |
| DOC-021 | Comptabilité | Balance générale | PDF | Comptabilité | `accounting.advanced.export` | `/accounting/advanced/export/balance/pdf` | PDFKit local | NC | idem | P1 |
| DOC-022 | Reporting | Pilotage financier synthétique/détaillé | PDF | Reporting financier | `reporting.export` | `/reports/financial-dashboard/export/pdf` | PDFKit local | NC | clés techniques, pas de modèle LCA | P1 |
| DOC-023 | Comptabilité | Plan comptable | XLSX | Comptabilité | `accounting.chart.export` | `/accounting/accounts/export/xlsx` | ExcelJS local | NC | style et métadonnées limités | P2 |
| DOC-024 | Comptabilité | Écritures comptables | XLSX | Comptabilité | `accounting.entry.export` | `/accounting/entries/export/xlsx` | ExcelJS local | NC | pas de totaux/identité | P2 |
| DOC-025 | Comptabilité | Grand livre | XLSX | Comptabilité | `accounting.advanced.export` | `/accounting/advanced/export/ledger/xlsx` | ExcelJS local | NC | feuille générique | P2 |
| DOC-026 | Comptabilité | Balance | XLSX | Comptabilité | `accounting.advanced.export` | `/accounting/advanced/export/balance/xlsx` | ExcelJS local | NC | feuille générique | P2 |
| DOC-027 | Reporting | Pilotage financier synthétique | XLSX | Reporting | `reporting.export` | dashboard export | ExcelJS local | NC | clés de sections anglaises possibles | P2 |
| DOC-028 | Reporting | Pilotage financier détaillé | XLSX | Reporting | `reporting.export` | dashboard export | ExcelJS local | NC | idem | P2 |
| DOC-029 | Facturation | Opérations facturation | CSV | Facturation | `billing.export` | `/invoices/export/accounting` | `financialCsv` | NC | export brut, pas document officiel | P2 |
| DOC-030 | Trésorerie | Journal de trésorerie | CSV | Trésorerie | `treasury.view` | `/treasury/journal/export` | `financialCsv` | NC | pas PDF officiel | P1 |
| DOC-031 | Trésorerie | Rapprochement bancaire | CSV | Rapprochement | `treasury.reconciliation.export` | `/treasury/bank-statements/:id/export` | `financialCsv` | NC | libellé interne “Treasury” | P2 |
| DOC-032 | Comptabilité | Plan comptable | CSV | Comptabilité | `accounting.chart.export` | accounts export | `financialCsv` | NC | export brut | P2 |
| DOC-033 | Comptabilité | Écritures comptables | CSV | Comptabilité | `accounting.entry.export` | entries export | `financialCsv` | NC | export brut | P2 |
| DOC-034 | Comptabilité | Grand livre | CSV | Comptabilité | `accounting.advanced.export` | advanced export | `financialCsv` | NC | export brut | P2 |
| DOC-035 | Comptabilité | Balance | CSV | Comptabilité | `accounting.advanced.export` | advanced export | `financialCsv` | NC | export brut | P2 |
| DOC-036 | Reporting | Pilotage financier synthétique | CSV | Reporting | `reporting.export` | dashboard export | `financialCsv` | NC | clés techniques possibles | P2 |
| DOC-037 | Reporting | Pilotage financier détaillé | CSV | Reporting | `reporting.export` | dashboard export | `financialCsv` | NC | idem | P2 |
| DOC-038 | Reporting financier | Trésorerie | CSV | Reporting | `reporting.view` | `/reports/financial-export/treasury` | `financialCsv` | NC | nom de section anglais | P2 |
| DOC-039 | Reporting financier | Clients/créances | CSV | Reporting | `reporting.view` | section customers | `financialCsv` | NC | fallback de clés techniques | P2 |
| DOC-040 | Reporting financier | Budgets | CSV | Reporting | `reporting.view` | section budgets | `financialCsv` | NC | idem | P2 |
| DOC-041 | Reporting financier | Fournisseurs | CSV | Reporting | `reporting.view` | section suppliers | `financialCsv` | NC | idem | P2 |
| DOC-042 | Reporting financier | Rémunérations | CSV | Reporting | `reporting.view` | section remunerations | `financialCsv` | NC | nom fichier anglais | P2 |
| DOC-043 | Reporting financier | Couverture | CSV | Reporting | `reporting.view` | section coverage | `financialCsv` | NC | idem | P2 |
| DOC-044 | Reporting | Synthèse ERP | CSV | Rapports | `reporting.view` | `/reports/export?section=overview` | report.csv | NC | export brut | P2 |
| DOC-045 | Reporting | Ventes | CSV | Rapports | permissions section | section sales | report.csv | NC | export brut | P2 |
| DOC-046 | Reporting | Finance | CSV | Rapports | permissions section | section finance | report.csv | NC | export brut | P2 |
| DOC-047 | Reporting | Stock véhicules | CSV | Rapports | permissions section | section vehicles | report.csv | NC | export brut | P2 |
| DOC-048 | Reporting | Atelier | CSV | Rapports | permissions section | section workshop | report.csv | NC | export brut | P2 |
| DOC-049 | Reporting | Pièces | CSV | Rapports | permissions section | section parts | report.csv | NC | export brut | P2 |
| DOC-050 | GED | Pièces utilisateur générales | original | GED | `ged.view` | `/documents/:id/download` | aucun | NA | contenu externe | — |
| DOC-051 | Livraison | Pièces remises jointes | original | Détail livraison | `delivery.documents.view` | `/deliveries/:id/documents/:documentId/download` | aucun | NA | contenu externe | — |
| ABS-001 | CRM | Fiche prospect officielle | PDF | — | — | absent | — | ABS | seulement écran/données | P2 |
| ABS-002 | CRM | Fiche client officielle | PDF | — | — | — | — | ABS | absent | P2 |
| ABS-003 | Showroom | Fiche de visite | PDF | — | — | — | — | ABS | absent | P2 |
| ABS-004 | Showroom | Fiche d'essai | PDF | — | — | — | — | ABS | absent | P1 |
| ABS-005 | Stock | Inventaire officiel véhicules | PDF | — | — | — | — | ABS | CSV reporting seulement | P1 |
| ABS-006 | Stock | Bon de réception/mouvement | PDF | — | — | — | — | ABS | workflow sans document | P1 |
| ABS-007 | Encaissements | Document de remboursement | PDF | — | — | — | — | ABS | événement financier seulement | P1 |
| ABS-008 | Encaissements | Document d'annulation | PDF | — | — | — | — | ABS | absence document autonome | P2 |
| ABS-009 | SAV | Fiche diagnostic | PDF | — | — | — | intégré à l'OR | ABS | non autonome | P2 |
| ABS-010 | SAV | Contrôle qualité | PDF | — | — | — | — | ABS | données seulement | P1 |
| ABS-011 | SAV | Bon de restitution | PDF | — | — | — | — | ABS | données seulement | P1 |
| ABS-012 | Magasin | Bon de demande pièces | PDF | — | — | — | — | ABS | absent | P1 |
| ABS-013 | Magasin | Bon de commande/réception | PDF | — | — | — | — | ABS | absent | P1 |
| ABS-014 | Magasin | Bon de sortie/retour | PDF | — | — | — | — | ABS | absent | P1 |
| ABS-015 | Magasin | Inventaire/transfert | PDF | — | — | — | — | ABS | absent | P1 |
| ABS-016 | Comptabilité | Journal comptable officiel | PDF | — | — | — | — | ABS | XLSX/CSV seulement | P1 |
| ABS-017 | Comptabilité | Pièce/écriture comptable imprimable | PDF | — | — | — | — | ABS | écran + exports seulement | P1 |
| ABS-018 | Trésorerie | Rapprochement officiel imprimable | PDF | — | — | — | — | ABS | CSV seulement | P1 |

## Totaux

51 artefacts existants : 22 PDF, 6 XLSX, 21 CSV, 2 familles originales. 18 documents attendus mais absents. Les variantes synthétique/détaillée partagent un endpoint mais produisent des documents fonctionnellement distincts.
