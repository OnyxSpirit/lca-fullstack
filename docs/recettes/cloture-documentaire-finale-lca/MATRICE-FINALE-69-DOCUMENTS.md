# Matrice finale des 69 entrées

Abréviations : **C** conforme selon les preuves acquises, **P** partiel/réserve, **NA** document externe non généré.

| ID | Nom | Type | Statut | Preuve / réserve |
|---|---|---|---|---|
| DOC-001 | Devis | PDF | C | renderer commercial et archive existants |
| DOC-002 | Pro-forma | PDF | C | émission/archivage existants |
| DOC-003 | Bon de commande vente | PDF | C | renderer/archives existants |
| DOC-004 | Facture commerciale | PDF | C | renderer/archives existants |
| DOC-005 | Facture SAV | PDF | C | socle facture commun |
| DOC-006 | Reçu commercial | PDF | C | archive paiement existante |
| DOC-007 | Reçu SAV | PDF | C | socle reçu commun |
| DOC-008 | Avoir | PDF | C | archive avoir existante |
| DOC-009 | Avoir retour véhicule | PDF | C | endpoint existant |
| DOC-010 | PV livraison | PDF | C | GED transactionnelle existante |
| DOC-011 | Planning livraisons | PDF | C | export instantané |
| DOC-012 | Fiche véhicule | PDF | C | renderer commercial |
| DOC-013 | Ordre réparation | PDF | C | renderer SAV |
| DOC-014 | Devis SAV | PDF | C | archive émission existante |
| DOC-015 | Rapport activités | PDF | C | socle LCA |
| DOC-016 | Fiche activité | PDF | C | socle LCA |
| DOC-017 | Fiche employé | PDF | C | tests existants |
| DOC-018 | Fiche employé complète | PDF | C | permission sensible |
| DOC-019 | PV retour véhicule | PDF | C | archive clôture existante |
| DOC-020 | Grand livre | PDF | C | harmonisé première mission |
| DOC-021 | Balance | PDF | C | harmonisée première mission |
| DOC-022 | Pilotage financier | PDF | C | campagne MySQL HTTP 200, PDF officiel |
| DOC-023 | Plan comptable | XLSX | C | réouverture ExcelJS conforme |
| DOC-024 | Écritures | XLSX | C | réouverture ExcelJS conforme |
| DOC-025 | Grand livre | XLSX | C | corrigé première mission |
| DOC-026 | Balance | XLSX | C | corrigée première mission |
| DOC-027 | Pilotage synthétique | XLSX | C | réouverture ExcelJS conforme |
| DOC-028 | Pilotage détaillé | XLSX | C | réouverture ExcelJS conforme |
| DOC-029 | Facturation | CSV | C | campagne réelle UTF-8/BOM/CRLF/injection |
| DOC-030 | Journal trésorerie | CSV | C | campagne réelle UTF-8/BOM/CRLF/injection |
| DOC-031 | Rapprochement | CSV | C | campagne réelle UTF-8/BOM/CRLF/injection |
| DOC-032 | Plan comptable | CSV | C | campagne réelle UTF-8/BOM/CRLF/injection |
| DOC-033 | Écritures | CSV | C | campagne réelle UTF-8/BOM/CRLF/injection |
| DOC-034 | Grand livre | CSV | C | protection `financialCsv` acquise |
| DOC-035 | Balance | CSV | C | protection `financialCsv` acquise |
| DOC-036 | Pilotage synthétique | CSV | C | campagne réelle conforme |
| DOC-037 | Pilotage détaillé | CSV | C | campagne réelle conforme |
| DOC-038 | Trésorerie reporting | CSV | C | campagne réelle conforme |
| DOC-039 | Créances | CSV | C | campagne réelle conforme |
| DOC-040 | Budgets | CSV | C | campagne réelle conforme |
| DOC-041 | Fournisseurs | CSV | C | campagne réelle conforme |
| DOC-042 | Rémunérations | CSV | C | campagne réelle conforme |
| DOC-043 | Couverture | CSV | C | campagne réelle conforme |
| DOC-044 | Synthèse ERP | CSV | C | campagne réelle conforme |
| DOC-045 | Ventes | CSV | C | campagne réelle conforme |
| DOC-046 | Finance | CSV | C | campagne réelle conforme |
| DOC-047 | Stock véhicules | CSV | C | campagne réelle conforme |
| DOC-048 | Atelier | CSV | C | campagne réelle conforme |
| DOC-049 | Pièces | CSV | C | campagne réelle conforme |
| DOC-050 | Pièce GED utilisateur | original | NA | contenu externe |
| DOC-051 | Pièce remise livraison | original | NA | contenu externe |
| ABS-001 | Fiche prospect | PDF | C | MySQL 200, RBAC agence/OWN, UI CRM |
| ABS-002 | Fiche client | PDF | C | MySQL 200, UI client |
| ABS-003 | Fiche visite | PDF | C | MySQL 200, UI détail showroom |
| ABS-004 | Fiche essai | PDF | C | MySQL/UI/GED idempotente |
| ABS-005 | Inventaire véhicules | PDF | C | instantané non GED, UI stock |
| ABS-006 | Mouvement véhicule | PDF | C | MySQL/UI/GED idempotente |
| ABS-007 | Remboursement | PDF | C | MySQL/UI/GED idempotente |
| ABS-008 | Annulation | PDF | C | 3 variantes MySQL, UI et GED idempotentes |
| ABS-009 | Diagnostic | PDF | C | MySQL 200, UI OR |
| ABS-010 | Contrôle qualité | PDF | C | MySQL/UI/GED idempotente |
| ABS-011 | Restitution | PDF | C | MySQL/UI/visuel/GED idempotente |
| ABS-012 | Demande pièces | PDF | C | MySQL 200, UI demande atelier |
| ABS-013 | Commande/réception pièces | PDF | C | deux variantes MySQL, UI et GED réception |
| ABS-014 | Sortie/retour pièces | PDF | C | MySQL/UI/GED mouvement |
| ABS-015 | Inventaire/transfert pièces | PDF | C | inventaire instantané UI/MySQL |
| ABS-016 | Journal comptable | PDF | C | MySQL 200, UI journaux |
| ABS-017 | Pièce comptable | PDF | C | MySQL/UI/GED comptabilisation |
| ABS-018 | Rapprochement | PDF | C | MySQL/UI/GED validation |

Verdict : **67 entrées générées par l’ERP conformes** et **2 pièces externes classées NA**. Aucun statut partiel ne subsiste.
