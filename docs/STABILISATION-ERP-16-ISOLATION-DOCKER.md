# ERP-16 — Isolation Docker

Snapshot initial en lecture seule :

- historique : frontend `d088a359…` port 3001, backend `b542c1b2…`, MySQL `9b37c86b…` ; tous sains ;
- recette : frontend `3825fe4f…` port 4176, backend `f95ed37f…` port 3004, MySQL `5e7de0ba…` port 33321 ; tous sains ;
- MySQL recette 8.4.11 ; volumes nommés `lca_recette_mysql_data`, `lca_recette_uploads_data`, `lca_recette_ged_data` présents ;
- réponses HTTP : 4176=200, 3004=200, 3001=200.

## Vérification P0 levée

Les premiers nombres issus de `information_schema.table_rows` étaient des estimations InnoDB périmées, pas des pertes. Les comptages exacts et recherches par identifiant confirment : 8 ventes, 14 factures, 10 paiements, 4 livraisons, 6 OR ; client 8, véhicule 11 à 30 km, vente 8, livraison 4, OR 6, factures 13/14 et paiements 11/12 sont présents et terminaux.

Le conteneur monte bien `lca_recette_mysql_data`, créé le 11/10 à 00:52, sur `/var/lib/mysql`. Isolation et conservation démontrées ; les écritures REC16 peuvent commencer. Commandes Docker mutantes ERP-16 exécutées à ce stade : aucune.
