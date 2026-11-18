# Performances

Les nouvelles routes bornent les lignes SQL par LIMIT/OFFSET et évitent le chargement complet pour les historiques corrigés. Les tailles 10/20/50/100 sont contrôlées.

Aucune mesure fiable de latence, taille JSON ou EXPLAIN sur jeu volumétrique isolé n’a été obtenue; aucune valeur n’est inventée. Les collections encore marquées « chargement complet possible » dans la matrice constituent la réserve de performance principale.

