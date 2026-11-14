# Audit des interactions UI

## États communs

Les pages auditées rendent des états de chargement, erreur et liste vide. Les actions sensibles sont conditionnées par `can(permission)`, et les mutations affichent un retour d’erreur plutôt que de simuler un succès.

## CRM / showroom

- Création prospect, devis et essai : formulaires réels et mutations API.
- Pipeline : actions conditionnées par état et permission; erreurs serveur restituées.
- Showroom : affecter, prendre en charge, clôturer, annuler, convertir, planifier/reprogrammer/démarrer/retourner un essai.
- Les boutons d’essai respectent les états planifié/en cours/terminé et la temporalité.

## Client 360°

- Onglets masqués en fonction des permissions.
- Pagination par section et choix de taille de page.
- Téléchargement GED et PDF officiel déclenchent des appels réels.
- Les actions “Nouveau RDV / OR” et “Créer Vente” ouvrent les parcours transversaux avec le client prérempli.
- Réserve : aucune action visible d’édition générale du client sur la fiche.

## Stock

- Basculage cartes/tableau, filtres, pagination et réinitialisation cohérents.
- Les actions de création, modification, statut, emplacement et photos sont protégées.
- Les vues “stock actif”, “vendu” et “tous” évitent de confondre disponibilité et historique.
- Réserves : aucun contrôle de prix min/max, aucun tri sélectionnable; le dialogue de transfert ne doit pas promettre un changement d’agence tant que le backend le refuse.

## Accessibilité et robustesse

Les sélecteurs importants possèdent des libellés accessibles dans les scénarios testés. La densité des tableaux larges impose un défilement horizontal; acceptable sur poste de travail, à revalider sur petit écran lors de la recette manuelle.
