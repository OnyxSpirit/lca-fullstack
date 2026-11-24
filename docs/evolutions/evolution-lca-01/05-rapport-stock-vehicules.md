# Rapport Stock véhicules

Les filtres prix minimum/maximum et les choix de tri par date d'entrée ont été retirés de l'interface. Le statut `demo` est exposé, filtrable et administrable. Une commande crée immédiatement N lignes véhicule avec identifiant et numéro de stock, sans VIN, au statut `ordered`. Après réception, le formulaire existant permet de renseigner le VIN ; l'API normalise, valide les 17 caractères et conserve l'unicité SQL existante.
