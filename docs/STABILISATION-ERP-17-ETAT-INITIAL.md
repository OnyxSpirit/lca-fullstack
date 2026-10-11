# ERP-17 — État initial

HEAD : b102417 (STABILISATION-ERP-16). git status --short vide ; aucun changement préexistant ni fichier non suivi.
MySQL cible : lca_recette, version 8.4.11. Volumes distincts lca_recette_mysql_data / lca_mysql_data.

| Conteneur | ID initial |
|---|---|
| lca-recette-backend-1 | f95ed37f5408 |
| lca-recette-mysql-1 | 5e7de0bab86f |
| lca-recette-frontend-1 | 3825fe4f6c82 |
| lca-backend-1 | b542c1b2cf2f |
| lca-mysql-1 | 9b37c86b3190 |
| lca-frontend-1 | d088a359db75 |

Tous healthy. Ports recette 4176/3004/33321 ; historique frontend 3001.
REC16-GAR : OR7 delivered, véhicule12, entrée50 ; facture16 issued total/solde0 ; créance2 paid 41615 reçu41615 solde0.
REC16-CONC : vente10 reserved, vente11 delivered, livraison6 delivered, OR8 invoiced ; facture23 issued 41615 ; factures19/20/21 soldes18900/82680/89570 ; facture22 paid.
Une requête initiale utilisait à tort sales.vehicle_id : erreur SELECT sans écriture ; les ventes ont ensuite été contrôlées par leurs API officielles.

