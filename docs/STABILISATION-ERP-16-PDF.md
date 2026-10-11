# ERP-16 — Contrôle PDF

Sept documents ont été téléchargés par les API officielles, contrôlés avec `pdfinfo`, extraits avec `pdftotext`, rendus en PNG et inspectés visuellement page par page : facture véhicule 13, reçu paiement 11, bon de commande vente 8, PV livraison 4, facture atelier 14, OR 7 et facture garantie 16.

Tous sont des PDF A4 lisibles, de 1 ou 2 pages. Identité agence, références, montants, ventilation garantie et signatures concordent avec les données métier.

Réserves mineures : `100 /000 km` au lieu de `100 000 km` dans l'OR ; alignement incomplet de la quantité de la ligne pièce sur la facture Atelier. Aucun défaut bloquant d'impression.

Statut : **VALIDÉ AVEC RÉSERVES MINEURES**.

