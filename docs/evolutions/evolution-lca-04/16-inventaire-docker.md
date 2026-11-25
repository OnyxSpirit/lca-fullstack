# Inventaire Docker

L'environnement principal n'a pas été utilisé pour les données fictives, migré, reconstruit ou redémarré. Aucune commande Docker destructive (`down`, `stop`, `rm`, `prune`) n'a été exécutée.

La qualification documentaire locale utilise les bibliothèques déjà installées et Poppler. L'inventaire final, effectué uniquement avec `docker ps` et `docker compose ps`, constate les trois ressources principales actives : `lca-mysql-1` sous MySQL 8.4 est sain, `lca-backend-1` est sain et `lca-frontend-1` est sain. La pile isolée `evolution-lca-03-final-*` est également saine.

Trois anciennes piles de recette hors périmètre présentent des backends déjà en redémarrage (`lca-reporting-ged-hr`, `lca-financial-e2e`, `lca-recette`). Elles n'ont été ni utilisées ni modifiées par LCA-04. Aucun arrêt, redémarrage, recréation, migration ou nettoyage Docker n'a été lancé pendant cette mission.
