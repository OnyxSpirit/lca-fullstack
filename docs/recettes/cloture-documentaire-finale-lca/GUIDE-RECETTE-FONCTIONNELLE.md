# Guide de recette fonctionnelle

Pour chaque action, se connecter, sélectionner l’agence puis ouvrir l’objet métier.

| Famille | Chemin UI | Permission principale | Action |
|---|---|---|---|
| ABS-001 | CRM > prospect > détail | `crm.prospect.view` | Imprimer la fiche |
| ABS-002 | Clients > détail | `customers.view` | Fiche PDF |
| ABS-003/004 | Showroom > détail visite | `showroom.view` | Fiche visite / Essai PDF |
| ABS-005 | Stock véhicules | `vehicles.view` | Inventaire PDF |
| ABS-006 | Véhicule > historique | `vehicles.view` | Bon PDF |
| ABS-007/008 | Facturation > opération | permissions paiement/facture/vente | justificatif PDF selon état |
| ABS-009/010/011 | SAV > OR | `service.order.view` | Diagnostic / Contrôle / Restitution |
| ABS-012 | Magasin > Demandes Atelier | `parts.internal_request.view` | Bon PDF |
| ABS-013 | Magasin > achats/réceptions | `parts.purchase_order.view` | PDF commande/réception |
| ABS-014 | Magasin > mouvements | `parts.stock.view` | Bon mouvement PDF |
| ABS-015 | Magasin | `parts.inventory.view` | Inventaire PDF |
| ABS-016 | Comptabilité > Journaux | `accounting.journal.advanced.view` | PDF |
| ABS-017 | Comptabilité > Écritures > détail | `accounting.entry.view` | Pièce PDF |
| ABS-018 | Trésorerie > Rapprochements | `treasury.reconciliation.export` | Rapprochement PDF |

Attendre un PDF A4 avec identité, NIU et pagination. Un objet inexistant ou hors agence doit répondre 404, une permission absente 403 et une session absente 401. Les inventaires restent des instantanés et ne créent pas d’archive GED.

Pour une transition finalisée (essai, mouvement, remboursement/annulation, contrôle qualité, restitution, réception ou mouvement pièces, écriture comptable, relevé bancaire), vérifier dans la GED une archive `generated`, son agence, son auteur, son empreinte SHA-256 et sa référence métier. Rejouer la finalisation : le même document doit être retourné sans doublon. Un simple GET PDF ne doit jamais augmenter le nombre de lignes GED.

Pour DOC-023 à DOC-028, ouvrir le fichier dans Excel/LibreOffice et vérifier feuille nommée, en-tête en gras, filtre et volet figé. Pour DOC-029 à DOC-049, vérifier UTF-8 avec BOM, séparateur `;`, fins de ligne CRLF et neutralisation des cellules commençant par `=`, `+`, `-` ou `@`.
