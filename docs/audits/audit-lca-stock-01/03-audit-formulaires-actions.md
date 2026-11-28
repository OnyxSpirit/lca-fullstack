# Formulaires et actions

## Profil commercial

Actions : Nouveau profil/modèle, sélectionner un profil, Enregistrer, ajouter jusqu'à 8 images, monter/descendre, définir principale, supprimer. Toutes exigent `vehicles.catalog.manage` côté affichage; lecture via `vehicles.catalog.view` côté onglet.

Champs réellement affichés : Version normalisée (select, obligatoire à la sauvegarde, immutable en modification), Catégorie technique, Configuration, Moteur, Puissance combinée (kW), Puissance (ch), Couple maximal (Nm), 0 à 100 km/h (s), Nombre de places, Motricité, Autonomie électrique (km), Autonomie combinée (km), Longueur/largeur/hauteur (mm), Suspension arrière, Écran central/tableau de bord, Système de direction, Délai de livraison, Prix catalogue, Devise, Disques avant ventilés, Disques arrière ventilés, Contrôle par application, Capteurs avancés, Refroidissement de batterie, Garantie, Disponibilité, Autres caractéristiques JSON, Disponible commercialement.

Le constructeur, modèle et version proviennent de la version normalisée. Sont absents de ce formulaire : agence, fournisseur, référence/date de commande, date prévisionnelle, quantité, VIN individuel, statut individuel. Le backend accepte davantage de champs techniques (`TECHNICAL_PROFILE_FIELDS`) que cette page n'affiche pas : cylindrée, cylindres, chaîne cinématique, vitesse maximale, réservoir/consommation, sellerie, pneus, rapports, configuration conduite, suspension avant, freins, sécurité, technologies embarquées, connectivité, multimédia, autres technologies, durée/limite de garantie.

## Commande

Après sélection d'un profil, champ numérique « Quantité à commander » (défaut 1, min 1, max HTML 1000, pas 1) et bouton « Enregistrer la commande ». Payload : `{commercialModelId, quantity, clientRequestId: crypto.randomUUID()}`. Validation UI : entier >=1; backend : entier 1..1000, UUID, modèle disponible. Aucun fournisseur, prix négocié, référence externe ou date n'est saisi.

## Réception

Bouton par ligne seulement si droit de gestion et reliquat > 0. La modale initialise la quantité au reliquat; entier 1..reliquat; payload `{quantity, clientRequestId}`. Aucun VIN, emplacement, photographie, date ou commentaire demandé.

Notifications : « Catalogue enregistré », « Photographies ajoutées », « Commande enregistrée — Les fiches véhicules En commande ont été créées », « Réception enregistrée — Les véhicules concernés sont maintenant Réceptionnés », et variantes d'erreur.

