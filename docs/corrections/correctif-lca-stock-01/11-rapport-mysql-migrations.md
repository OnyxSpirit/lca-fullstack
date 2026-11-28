# MySQL et migrations

La migration additive `138_vehicle_order_operational_tracking.sql` ajoute les références directes et l'illustration, rend le profil commercial facultatif, pose index/contraintes et rétroalimente les commandes historiques. Elle a été exécutée sur MySQL 8.4 isolé : niveau 138, zéro état partiel. Le vérificateur d'immuabilité annonce 105 migrations conformes jusqu'à la référence 134 et une exception historique documentée. La migration 138 n'a plus été modifiée après application.
