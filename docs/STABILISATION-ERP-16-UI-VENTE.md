# ERP-16 — Recette navigateur Vente

Environnement : frontend recette `127.0.0.1:4176`, backend recette `127.0.0.1:3004`, session Super Administrateur.

## Résultats

- `/sales` affiche 11 dossiers et les ressources ERP-16 : vente 9 `V-20261011-D1D3B0EB`, client Garantie REC16, véhicule Hyundai Tucson REC16, 29 725 000 XAF, soldée et livrée ; ventes concurrentes 10/11 visibles avec états Réservation/Livré.
- `/deliveries` affiche 6 livraisons, toutes livrées, dont Garantie REC16 et Concurrence REC16, checklists 10/10 et actions PV.
- `/customers/9` fournit la vue 360 : 1 véhicule, 1 vente, 1 passage atelier, 2 factures et 7 événements.
- Les références client, véhicule, vente et livraison concordent avec l'API et MySQL.

Statut : **VALIDÉ**.

