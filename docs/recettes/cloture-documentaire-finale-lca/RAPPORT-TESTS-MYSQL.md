# Tests MySQL réels

- Serveur : MySQL 8.4 isolé.
- Projet Compose : `lca-recette`.
- Base : `lca_recette` (contrôle bloquant dans le test).
- Port hôte : 33321.
- Schéma : 227 tables, migrations jusqu’au niveau 126.
- Fixtures : deux agences, identité légale, CRM, showroom, véhicules, SAV, pièces, facturation, comptabilité et banque.

Résultat : 21 variantes couvrant ABS-001 à ABS-018 retournent HTTP 200, `application/pdf` et une signature `%PDF`. Les variantes facture/vente/paiement, commande/réception et les documents pièces sont incluses.

Une incompatibilité de fixture a été détectée puis corrigée : `part_stocks.location_key` est générée. La contrainte d’origine des demandes SAV a également été respectée via une approbation réelle.

Le worker comptable signale un défaut préexistant de collation sur ses intégrations automatiques; il n’a pas bloqué les documents testés.
