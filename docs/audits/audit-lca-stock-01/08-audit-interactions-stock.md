# Interactions avec « Véhicules en stock »

Créer un profil seul ne crée aucun véhicule. Créer une commande crée immédiatement N fiches visibles dans le stock actif, identifiants stables, VIN NULL, statut `ordered`, prix du profil, même agence. Une réception met à jour ces mêmes fiches vers `received`; aucune recréation. Après réception partielle, les deux populations coexistent.

Le stock permet ensuite, avec ses propres droits, détail, modification individuelle, statut, photographie et VIN. `PATCH /vehicles/:id/status` autorise notamment les transitions manuelles entre statuts administrables et journalise, sans synchroniser une ligne de commande stockée (il n'y en a pas). Le calcul des quantités de commande se recalculera toutefois sur `status <> ordered` : une unité `ordered` passée manuellement à `demo` sera comptée reçue; une unité reçue repassée à `ordered` diminuera le reçu.

Défauts de raccordement : l'API véhicule ne renvoie pas `vehicleOrderId`; l'UI stock n'affiche donc ni commande d'origine ni lien retour. Il n'existe aucun filtre par commande. Les photographies du profil et celles de l'unité sont distinctes; l'unité peut recevoir jusqu'à 8 images via le workflow stock. Le VIN peut être ajouté ultérieurement par modification individuelle selon les validations habituelles du stock.

