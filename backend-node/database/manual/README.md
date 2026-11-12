# Opérations SQL contrôlées

Ce répertoire contient des opérations qui ne sont **jamais** exécutées par le
runner automatique de migrations. Elles exigent une matrice approuvée, une base
jetable de validation et une autorisation explicite de l'environnement cible.

`rbac_scope_normalization.sql` prépare, applique ou restaure un lot de
normalisation des anciennes portées RBAC. Son mode par défaut est l'inventaire ;
aucune attribution n'est modifiée sans ligne approuvée dans la table de plan.
