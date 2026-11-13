# Tests MySQL réels

- Serveur : MySQL 8.4 isolé.
- Projet Compose : `lca-recette`.
- Base : `lca_recette` (contrôle bloquant dans le test).
- Port hôte : 33321.
- Schéma : 227 tables, migrations jusqu’au niveau 126.
- Fixtures : deux agences, identité légale, CRM, showroom, véhicules, SAV, pièces, facturation, comptabilité et banque.

Résultat final après rebuild de l’image backend : DOC-022 et 21 variantes couvrant ABS-001 à ABS-018 retournent HTTP 200, `application/pdf` et une signature `%PDF`. Les variantes facture/vente/paiement, commande/réception et les documents pièces sont incluses.

Une incompatibilité de fixture a été détectée puis corrigée : `part_stocks.location_key` est générée. La contrainte d’origine des demandes SAV a également été respectée via une approbation réelle.

Les 6 XLSX et 21 CSV ont été générés depuis cette même base. Les 12 archives GED ont été vérifiées avec empreinte et rejeu idempotent. FIN-004 a été rejouée avec création d’un événement unique, d’une écriture équilibrée à deux lignes, rejeu sans doublon et seconde découverte nulle.
