# Migrations et intégrité

Deux installations fraîches ont été observées. La première a révélé une incompatibilité du baseline avec les migrations historiques ; elle a été conservée comme trace de diagnostic. La base finale `lca_qualification_finale_v2` a ensuite réussi l'installation complète et une seconde exécution idempotente.

État final : version 132, 62 migrations enregistrées, 429 étapes `APPLIED`, 0 étape en échec, 0 scope interdit persisté. La réduction finale des scopes est portée par les migrations 131/132 ; aucune migration historique n'a été réécrite.
