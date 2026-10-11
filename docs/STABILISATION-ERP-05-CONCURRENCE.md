# STABILISATION-ERP-05 — Concurrence

Deux `POST /sales` simultanés, deux clés différentes, même Hyundai #4 : réponses **201 et 409**. Une seule vente et une seule réservation active ont existé ; le véhicule a été verrouillé par transaction puis libéré par l'annulation.

Le rejeu avec la même clé sur la vente #2 renvoie le même identifiant. Le service est idempotent, mais la route renvoie 201 au lieu de différencier le rejeu par 200 : anomalie mineure REC05-A01.

Les concurrences paiement/annulation, facture/annulation et autorisation/livraison possèdent des tests d'intégration existants. Elles n'ont pas toutes été rejouées sur les dossiers conservés afin de ne pas détruire les états requis pour les campagnes suivantes.
