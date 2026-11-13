# Matrice finale des 69 entrées

Légende : `C` conforme dans cette passe, `P` partiel, `R` réserve, `NA` pièce externe. Les chemins, permissions et endpoints non répétés sont ceux de l’inventaire canonique `docs/audits/vin-documentation-lca/INVENTAIRE-EXHAUSTIF-DOCUMENTS-ERP.md`. `Socle` signifie `document-layout.ts`; `local` signifie renderer/export spécialisé. Aucun statut `C` ne vaut preuve d’une recette métier de bout en bout.

| ID | Statut initial | Modification / template / archive / test | Final | Accès et réserve |
|---|---|---|---|---|
| DOC-001 | P | pied Socle corrigé; archive historique préservée; test identité | P | Devis, `quotations.view`, `/quotations/:id/pdf` |
| DOC-002 | P | pied Socle corrigé; archives préservées | P | Pro-formas, `proformas.export`, `/proformas/:id/pdf` |
| DOC-003 | P | pied Socle corrigé; archives préservées | P | Vente, `sales.view`, business PDF |
| DOC-004 | P | pied Socle corrigé; archives préservées | P | Facture, `billing.invoice.view` |
| DOC-005 | P | pied Socle corrigé | P | Facture SAV; distinction de type réservée |
| DOC-006 | P | pied Socle corrigé; archive reçue préservée | P | Paiement, `billing.payment.view` |
| DOC-007 | P | pied Socle corrigé | P | Reçu SAV; identité spécifique réservée |
| DOC-008 | P | pied Socle corrigé; archive avoir préservée | P | Avoir, `billing.invoice.view` |
| DOC-009 | P | pied Socle corrigé | P | Retour véhicule, `vehicle.return.view` |
| DOC-010 | P | PNG client facultatif; contrôles/empreinte/GED conservés; tests livraison | C | Livraison, `delivery.documents.view`, `/deliveries/:id/pdf` |
| DOC-011 | P | pied Socle corrigé; test multipage | P | Planning, `delivery.view`; non archivé |
| DOC-012 | P | pied Socle corrigé | P | Véhicule, `vehicles.view`, business PDF |
| DOC-013 | P | pied Socle corrigé | P | OR, `service.order.view` |
| DOC-014 | P | pied Socle corrigé | P | Devis SAV; séparation visuelle réservée |
| DOC-015 | P | pied Socle corrigé; test identité indirect | P | Activités, `activity.view` |
| DOC-016 | P | pied Socle corrigé | P | Fiche activité, `activity.view` |
| DOC-017 | P | pied Socle corrigé | P | Employé standard, `hr.employees.view` |
| DOC-018 | P | pied Socle corrigé | P | Employé complet; confidentialité conservée |
| DOC-019 | P | pied Socle corrigé; archive préservée | P | Retour, `vehicle.return.view` |
| DOC-020 | NC | nouveau renderer comptable Socle, pagination/totaux/exhaustivité; test PDF | C | Comptabilité, `accounting.advanced.export`, ledger/pdf |
| DOC-021 | NC | nouveau renderer comptable Socle, pagination/totaux; test PDF | C | Comptabilité, `accounting.advanced.export`, balance/pdf |
| DOC-022 | NC | aucun changement | R | PDF pilotage financier local à migrer |
| DOC-023 | NC | aucun changement | R | XLSX plan comptable à harmoniser |
| DOC-024 | NC | aucun changement | R | XLSX écritures à harmoniser |
| DOC-025 | NC | feuille Grand livre, style, filtre, gel, collecte complète | P | `accounting.advanced.export`, ledger/xlsx; réouverture non testée |
| DOC-026 | NC | feuille Balance générale, style, filtre, gel | P | `accounting.advanced.export`, balance/xlsx; réouverture non testée |
| DOC-027 | NC | aucun changement | R | XLSX reporting synthétique |
| DOC-028 | NC | aucun changement | R | XLSX reporting détaillé |
| DOC-029 | NC | sécurité `financialCsv` inchangée | P | CSV facturation; document brut |
| DOC-030 | NC | aucun changement | R | CSV trésorerie; PDF officiel absent |
| DOC-031 | NC | aucun changement | R | CSV rapprochement; libellés à revoir |
| DOC-032 | NC | sécurité CSV existante | P | Plan comptable CSV brut |
| DOC-033 | NC | sécurité CSV existante | P | Écritures CSV brutes |
| DOC-034 | NC | nom français et collecte exhaustive | P | ledger/csv, `accounting.advanced.export` |
| DOC-035 | NC | nom français | P | balance/csv, `accounting.advanced.export` |
| DOC-036 | NC | aucun changement | R | Reporting synthétique CSV |
| DOC-037 | NC | aucun changement | R | Reporting détaillé CSV |
| DOC-038 | NC | aucun changement | R | Reporting trésorerie CSV |
| DOC-039 | NC | aucun changement | R | Reporting clients CSV |
| DOC-040 | NC | aucun changement | R | Reporting budgets CSV |
| DOC-041 | NC | aucun changement | R | Reporting fournisseurs CSV |
| DOC-042 | NC | aucun changement | R | Reporting rémunérations CSV |
| DOC-043 | NC | aucun changement | R | Reporting couverture CSV |
| DOC-044 | NC | aucun changement | R | Synthèse ERP CSV |
| DOC-045 | NC | aucun changement | R | Ventes CSV |
| DOC-046 | NC | aucun changement | R | Finance CSV |
| DOC-047 | NC | aucun changement | R | Stock véhicules CSV |
| DOC-048 | NC | aucun changement | R | Atelier CSV |
| DOC-049 | NC | aucun changement | R | Pièces CSV |
| DOC-050 | NA | intégrité des archives historiques préservée | NA | GED, `ged.view`, contenu utilisateur |
| DOC-051 | NA | téléchargement et preuve de remise conservés | NA | Livraison, `delivery.documents.view` |
| ABS-001 | ABS | non implémenté | R | Fiche prospect : scope CRM/point UI/archive à concevoir |
| ABS-002 | ABS | non implémenté | R | Fiche client : confidentialité/scope à tester |
| ABS-003 | ABS | non implémenté | R | Visite showroom : endpoint/UI/archive absents |
| ABS-004 | ABS | non implémenté | R | Essai : ne pas inventer de résultat |
| ABS-005 | ABS | non implémenté | R | Inventaire véhicules : volumétrie/instantané à définir |
| ABS-006 | ABS | non implémenté | R | Mouvement : impression sans nouvelle opération à tester |
| ABS-007 | ABS | non implémenté | R | Remboursement : lien paiement/avoir et archive requis |
| ABS-008 | ABS | non implémenté | R | Annulation : variantes métier à séparer |
| ABS-009 | ABS | non implémenté | R | Diagnostic autonome : données présentes dans OR |
| ABS-010 | ABS | non implémenté | R | Contrôle qualité : scope SAV/archive requis |
| ABS-011 | ABS | non implémenté | R | Restitution : zones manuscrites/GED requises |
| ABS-012 | ABS | non implémenté | R | Demande pièces : workflow existant à mapper |
| ABS-013 | ABS | non implémenté | R | Commande/réception : variantes achats requises |
| ABS-014 | ABS | non implémenté | R | Sortie/retour : variantes et références requises |
| ABS-015 | ABS | non implémenté | R | Inventaire/transfert : événements distincts |
| ABS-016 | ABS | non implémenté | R | Journal officiel distinct du grand livre |
| ABS-017 | ABS | non implémenté | R | Pièce comptable : endpoint d’écriture et scope requis |
| ABS-018 | ABS | non implémenté | R | Rapprochement : données avancées et archive à mapper |

## Totaux de cette passe

- Entrées examinées : 69/69 via l’audit obligatoire.
- Documents nouvellement créés : 0.
- Documents PDF existants matériellement harmonisés : 21 profitent du pied partagé ; 2 (grand livre et balance) ont en plus un nouveau renderer complet.
- Entrées ABS avec réserve : 18/18.
- Exports comptables modifiés : grand livre et balance en PDF/XLSX/CSV.
