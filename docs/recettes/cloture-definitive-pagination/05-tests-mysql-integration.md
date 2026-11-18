# Tests MySQL d'intégration

## Environnement

- MySQL recette local : port 33321 vérifié.
- Schéma créé exclusivement pour la mission : `lca_pagination_isolated`.
- Baseline consolidée et migrations jusqu'au niveau 132 : réussite, zéro avertissement.
- La base persistante `lca_recette` n'a été ni réinitialisée ni purgée.

## Méthode

Le premier essai via `npm test` était invalide car le script remplaçait `DB_HOST`, `DB_USER`, `DB_PASSWORD` et `DB_NAME` par des valeurs factices. La campagne a donc été relancée directement avec Node, les drapeaux conditionnels, une concurrence de 1, un timeout par test et `--test-force-exit`.

## Résultat

Le journal `/tmp/lca-pagination-conditional-isolated.out` contient **44 assertions réussies** avant le blocage du lot documentaire. Des échecs réels ont été observés dans l'administration agence, l'annulation de règlement, la clôture CRM Client Stock et plusieurs scénarios LOT13 (archives, réémission, désactivation de marque et scopes). Le LOT13 a ensuite atteint son timeout de 120 secondes et retenu le runner ; l'arrêt contrôlé a marqué les fichiers suivants comme promesses en attente, et ceux-ci ne sont comptés ni comme succès ni comme échecs fonctionnels.

La campagne prouve donc que les tests conditionnels sont exécutables sur MySQL 8.4, mais elle ne transforme pas les 104 tests historiquement ignorés en 104 validations. Une exécution isolée fichier par fichier est requise après correction du lot qui conserve ses handles.

