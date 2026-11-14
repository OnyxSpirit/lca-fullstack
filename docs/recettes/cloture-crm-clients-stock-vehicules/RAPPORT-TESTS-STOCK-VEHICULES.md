# Rapport de tests Stock Véhicules

Les bornes de prix rejettent valeurs négatives, non numériques et min supérieur au max. Le tri accepte uniquement la liste blanche et reste stable grâce à `v.id`. Le statut `in_transit` verrouille les mutations génériques du véhicule.

Preuves : build backend/frontend, `vehicles-dynamic-rbac` vert, assertions dédiées de `crm-customer-stock-closure` et recette navigateur des seuils 13 000 000/12 000 000 ainsi que du tri décroissant.
