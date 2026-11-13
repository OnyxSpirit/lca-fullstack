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
| DOC-022 | Pilotage financier | PDF | P | migration complète vers socle non revalidée |
| DOC-023 | Plan comptable | XLSX | P | réouverture exhaustive non rejouée |
| DOC-024 | Écritures | XLSX | P | idem |
| DOC-025 | Grand livre | XLSX | C | corrigé première mission |
| DOC-026 | Balance | XLSX | C | corrigée première mission |
| DOC-027 | Pilotage synthétique | XLSX | P | campagne finale manquante |
| DOC-028 | Pilotage détaillé | XLSX | P | campagne finale manquante |
| DOC-029 | Facturation | CSV | P | campagne finale manquante |
| DOC-030 | Journal trésorerie | CSV | P | campagne finale manquante |
| DOC-031 | Rapprochement | CSV | P | campagne finale manquante |
| DOC-032 | Plan comptable | CSV | P | campagne finale manquante |
| DOC-033 | Écritures | CSV | P | campagne finale manquante |
| DOC-034 | Grand livre | CSV | C | protection `financialCsv` acquise |
| DOC-035 | Balance | CSV | C | protection `financialCsv` acquise |
| DOC-036 | Pilotage synthétique | CSV | P | campagne finale manquante |
| DOC-037 | Pilotage détaillé | CSV | P | campagne finale manquante |
| DOC-038 | Trésorerie reporting | CSV | P | francisation exhaustive non prouvée |
| DOC-039 | Créances | CSV | P | idem |
| DOC-040 | Budgets | CSV | P | idem |
| DOC-041 | Fournisseurs | CSV | P | idem |
| DOC-042 | Rémunérations | CSV | P | idem |
| DOC-043 | Couverture | CSV | P | idem |
| DOC-044 | Synthèse ERP | CSV | P | idem |
| DOC-045 | Ventes | CSV | P | idem |
| DOC-046 | Finance | CSV | P | idem |
| DOC-047 | Stock véhicules | CSV | P | idem |
| DOC-048 | Atelier | CSV | P | idem |
| DOC-049 | Pièces | CSV | P | idem |
| DOC-050 | Pièce GED utilisateur | original | NA | contenu externe |
| DOC-051 | Pièce remise livraison | original | NA | contenu externe |
| ABS-001 | Fiche prospect | PDF | C | MySQL 200, RBAC agence/OWN, UI CRM |
| ABS-002 | Fiche client | PDF | C | MySQL 200, UI client |
| ABS-003 | Fiche visite | PDF | C | MySQL 200, UI détail showroom |
| ABS-004 | Fiche essai | PDF | P | MySQL/UI OK, archive finale absente |
| ABS-005 | Inventaire véhicules | PDF | C | instantané non GED, UI stock |
| ABS-006 | Mouvement véhicule | PDF | P | MySQL/UI OK, archive finale absente |
| ABS-007 | Remboursement | PDF | P | MySQL OK, archive/UI exhaustive manquantes |
| ABS-008 | Annulation | PDF | P | facture/vente/paiement MySQL OK, GED/UI incomplets |
| ABS-009 | Diagnostic | PDF | C | MySQL 200, UI OR |
| ABS-010 | Contrôle qualité | PDF | P | MySQL/UI OK, GED manquante |
| ABS-011 | Restitution | PDF | P | MySQL/UI/visuel OK, GED manquante |
| ABS-012 | Demande pièces | PDF | C | MySQL 200, UI demande atelier |
| ABS-013 | Commande/réception pièces | PDF | P | deux variantes MySQL OK, UI/GED incomplets |
| ABS-014 | Sortie/retour pièces | PDF | P | MySQL OK, UI/GED incomplets |
| ABS-015 | Inventaire/transfert pièces | PDF | C | inventaire instantané UI/MySQL |
| ABS-016 | Journal comptable | PDF | C | MySQL 200, UI journaux |
| ABS-017 | Pièce comptable | PDF | P | MySQL/UI OK, archive comptabilisation absente |
| ABS-018 | Rapprochement | PDF | P | MySQL/UI OK, archive validation absente |

Les permissions, endpoints et scopes détaillés sont consignés dans la matrice de la deuxième intervention.
