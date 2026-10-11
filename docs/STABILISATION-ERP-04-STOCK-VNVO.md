# STABILISATION-ERP-04 — Stock VN/VO

Recette exécutée dans `lca-recette` sur MySQL 8.4.11, migration 079. Sept véhicules `REC04` existent : six dossiers métier (3 VN, 3 VO) et un témoin de concurrence. Cinq sont disponibles à la vente, deux en préparation, aucun vendu/livré.

Fonctionnalités validées : création avec/sans photos, marques/modèles/versions dynamiques, édition, prix, historique, emplacements dédiés, statuts administrables, blocage du statut vendu hors Vente, recherche, filtres combinables, regroupements, compteurs, pagination, fiche 360, photo principale, PDF véhicule, GED, scopes et concurrence.

Le frontend affiche 7 véhicules, 5 disponibles, 174 750 000 XAF de valeur, 7 au Parc et 0 vendu. Les filtres présentent 6 marques et 7 modèles. Les véhicules métier restent exploitables pour STABILISATION-ERP-05.

