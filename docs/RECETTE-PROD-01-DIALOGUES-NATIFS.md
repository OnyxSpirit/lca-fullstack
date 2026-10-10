# RECETTE-PROD-01 — Inventaire des dialogues natifs

Inventaire ciblé des actions financières ou assimilées relevées dans `frontend/src`.

| Fichier / action | API native | Gravité | Traitement recommandé |
|---|---|---:|---|
| `modules/treasury/TreasuryPage.tsx` — transfert et contrepassation | `prompt` | P1 | Modale partagée avec compte, montant/motif, récapitulatif et pending |
| `modules/hr/RemunerationsAdministration.tsx` — soumission, validation, rejet, engagement | `confirm` / `prompt` | P1 | Modale partagée, motif obligatoire et statut cible explicite |
| `modules/hr/BudgetExpenseDisbursement.tsx` — contrepassation | `confirm` | P1 | Confirmation contextualisée, motif et focus restitué |
| `modules/billing/InvoiceDetailPage.tsx` — notes de facture | `prompt` | P2 | Formulaire contrôlé dans la modale existante |
| `modules/deliveries/DeliveryFinancialAuthorizationPanel.tsx` — dérogation avec solde et révocation | `prompt` / `confirm` | P1 | Formulaire unique, récapitulatif du solde, garanties et échéance |
| `components/layout/Header.tsx` — changement de mot de passe | `prompt` | P1 sécurité | Formulaire dédié; ne jamais afficher ni persister les secrets |
| `modules/sales/SaleDetailPage.tsx` — garantie, notes, annulation | `prompt` / `confirm` | P2 | Modales contrôlées par action |
| `modules/service/RepairOrderDetailPage.tsx` — annulation OR | `prompt` | P2 | Modale motif obligatoire |

Les occurrences de gestion non financière (planning atelier, paramètres, utilisateurs) restent à inventorier dans un lot UX distinct. Aucun remplacement n'a été entrepris ici : convertir plusieurs workflows sans recette navigateur aurait introduit un risque supérieur au bénéfice dans cette mission de validation stricte.
