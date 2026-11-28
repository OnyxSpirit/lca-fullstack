# Audit frontend

## Organisation et accès

- Route principale : `/vehicles`, `ModuleGuard module="vehicles"` (`frontend/src/App.tsx:93`).
- Route historique : `/vehicles/catalog` redirige vers `/vehicles` (`App.tsx:94`) et revient donc sur l'onglet initial « Véhicules en stock ».
- Dans `VehiclesListPage`, l'état local `stockSection` vaut initialement `units`; l'onglet « Modèles sur commande » n'est rendu que si `can('vehicles.catalog.view')` (`VehiclesListPage.tsx:38,77-81`). Aucun URL ni deep-link ne mémorise l'onglet.
- Une fois sélectionné, `CommercialCatalogPage embedded` remplace toute la vue stock. Le titre PageHeader « Modèles sur commande » et son sous-titre ne sont pas rendus en mode embarqué; l'utilisateur voit d'abord la barre des deux onglets puis le bouton « Nouveau profil / modèle ».

## Contenu visible exact

1. Barre d'onglets : « Véhicules en stock », « Modèles sur commande ».
2. Pour un gestionnaire : bouton « Nouveau profil / modèle ».
3. Carte « Suivi des commandes »; texte « Commandes et réceptions de l’agence active. »; tableau Référence, Modèle, Date, Commandés, Réceptionnés, Restants, État, Action.
4. États : « Réceptionnée », « Partiellement réceptionnée », « En commande »; vide « Aucune commande enregistrée. »; pagination serveur.
5. Recherche locale de catalogue, placeholder « Marque, modèle, version… »; liste avec photographie ou « Sans photo », marque/modèle, version, prix.
6. État neutre : « Sélectionnez un modèle ou créez-en un. »
7. Éditeur de profil; badge « Commercialisable »/« Indisponible »; formulaire technique; commande quantitative; galerie.
8. États catalogue : « Chargement du catalogue… », « Chargement impossible. », « Aucun modèle commercial. »
9. Modale de réception : titre `Réception CMD-…`, reliquat, champ « Quantité reçue », « Annuler », « Confirmer la réception ».

Il n'existe ni KPI, ni filtre/statut/recherche du tableau de commandes, ni menu d'actions, ni détail de commande, ni lien vers les fiches associées. Les erreurs et succès passent par toasts.

Source structurante : `frontend/src/modules/vehicles/CommercialCatalogPage.tsx:21-47`.

