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

Attendre un PDF A4 avec identité, NIU et pagination. Un objet inexistant/hors agence doit répondre 404; une permission absente 403; une session absente 401. Les inventaires ne doivent pas créer d’archive GED. Ne pas valider la GED des autres familles tant que les raccordements de transition ne sont pas achevés.
