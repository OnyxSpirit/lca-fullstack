# ERP-16 — Non-régression ciblée

Exécution initiale avant écritures REC16 :

- garantie SAV/MySQL : vert ;
- concurrence services Livraison/MySQL : vert ;
- portée des notifications : vert ;
- intégrité Showroom/MySQL : vert ;
- GED : le nouveau contrôle d'archive Facture Atelier est vert en exécution détaillée ; le fichier reste globalement rouge sur l'assertion Livraison historique qui attend deux occurrences textuelles d'`archiveDelivery` alors que le code actuel en contient une.

Classification : quatre suites vertes ; un défaut de test historique isolé, non traité en modifiant une règle métier correcte.
