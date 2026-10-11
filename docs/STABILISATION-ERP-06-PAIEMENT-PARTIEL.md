# ERP-06 — Paiement partiel

La vente #2 reste financièrement exacte après livraison : total 16 943 250 XAF, encaissé 3 388 650 XAF, solde 13 554 600 XAF, facture `partially_paid`.

L'autorisation financière #1 couvrait exactement ce solde. La signature a consommé l'autorisation une seule fois (`USED`, `used_delivery_id=2`, `used_by=17`) sans créer de paiement ni modifier le solde.

Une anomalie d'affichage post-livraison a été corrigée : le backend considère désormais une autorisation `USED` comme couverture historique uniquement pour la livraison qui l'a consommée ; l'UI affiche « Dérogation consommée » et son détail au lieu de « Livraison impossible ».
