# MySQL

La baseline neuve définit `role_permissions.scope` comme `ENUM('OWN','AGENCY')`. Le seed et le provisioning du Super Administrateur attribuent `AGENCY`. Les migrations 131/132, historiques et déjà appliquées, n’ont pas été réécrites.

Le test d’intégration MySQL ciblé du stock RH a réussi. Aucun test destructif n’a été exécuté sur des données de production.
