# Performance

- Les grandes listes déjà serveur continuent de ne charger qu'une page.
- Les factures fournisseur ne chargent plus toute la collection : `LIMIT/OFFSET` et total séparé.
- Les changements de taille réutilisent les clés React Query et ne déclenchent pas de requête métier depuis le composant visuel.
- Le plafond proposé à l'utilisateur est 100.
- Les agrégats, widgets, lignes de document et petits référentiels ne reçoivent pas une pagination artificielle.
- Les exports restent indépendants de la page affichée.

Une mesure SQL sur données de volumétrie production reste recommandée pour les endpoints à filtres complexes ; aucune donnée de production n'a été utilisée pendant cette mission.
