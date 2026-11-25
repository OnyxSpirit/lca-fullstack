# Sauvegarde et restauration

La base principale a été lue par `mysqldump` MySQL 8.4 avec transaction cohérente, structure, données, index, FK, routines, triggers et événements. Archive sécurisée hors Git : `/tmp/correctif-lca-infrastructure-01/concession_erp-before-correctif.sql.gz`, mode 0600, SHA-256 `7084d71cc6eed8824ab06f14899f5244cc6a7be2371c1c4766d2620c6a88e671`.

`gzip -t` a réussi. La restauration réelle sur MySQL 8.4 a produit 242 tables, 64 migrations et 264 étapes, identiques au principal; rôles 2, permissions 383, clients/factures/employés 0 et total factures 0,00 concordaient. Les contraintes, colonnes et le journal 135 ont été contrôlés. Une duplication interactive interrompue à 103 tables a été écartée, conservée et remplacée par un import détaché achevé avec code 0. Aucune donnée réelle n'est incluse dans Git.
