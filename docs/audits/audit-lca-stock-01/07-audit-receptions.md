# Réceptions

Accès : tableau « Suivi des commandes » → bouton « Réceptionner » → modale quantité. Réception partielle et successive autorisée; réception totale en renseignant tout le reliquat. Le reliquat est le nombre courant de fiches `ordered`, présenté par l'API.

Traitement serveur : validation entier 1..1000 et UUID; contrôle agence; verrou `vehicle_orders FOR UPDATE`; sélection `vehicles ... status='ordered' ORDER BY id FOR UPDATE`; refus si aucun reliquat ou dépassement; choix des premiers identifiants; update vers `received` et `entry_date`; historique par véhicule; insertion `vehicle_order_receipts`; audit. Aucun véhicule nouveau, aucun VIN exigé, aucune affectation d'emplacement.

Concurrence : le verrou de commande sérialise deux réceptions; le test MySQL existant démontre deux demandes simultanées de 6 sur un reliquat de 6 : une 201, une 409. Idempotence : même utilisateur + même clé renvoie 200 sans réappliquer. Une clé déjà liée à une autre commande renvoie 409.

Limites : pas de consultation frontend des reçus historiques; pas de date choisie (NOW/CURDATE serveur); pas de réception ciblée par VIN/identifiant; pas de correction/annulation de réception; aucun événement Socket.IO explicite dans ces routes, seulement invalidation React Query du client initiateur.

