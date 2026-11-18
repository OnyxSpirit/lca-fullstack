# Risques de performance, cohérence et RBAC

## Sécurité

Aucune anomalie critique ni fuite interagence directement démontrée dans le code audité. Les principaux endpoints paginés appliquent les guards et scopes avant la pagination. Le risque futur majeur serait de calculer `total` avant le prédicat `OWN`/`AGENCY` ou de conserver une page/cache d'une ancienne agence.

Exigences non négociables : aucun retour de `CONCESSION`/`GLOBAL`, `COUNT` et `SELECT` avec le même prédicat, recherche paramétrée, liste blanche de tri, clé de cache contextualisée, remise à la page 1 lors d'un changement d'agence.

## Performance

- Les collections financières et historiques non bornées peuvent augmenter le temps SQL, le poids JSON, la mémoire React et le coût de rendu.
- Les modales qui chargent tous les clients, ventes, véhicules ou pièces pénalisent le chargement initial et dupliquent les caches.
- Les rapports détaillés mélangent parfois affichage interactif et export exhaustif.
- Les listes clientes chargent tout avant `slice`; elles n'apportent aucun gain réseau.

## Cohérence fonctionnelle

- Kanban : le total d'une étape peut excéder les cartes consultables.
- Limites fixes comptables : des éléments peuvent être inaccessibles sans indication.
- Sous-listes 360/détail : chaque collection doit conserver sa propre page ; partager une page entre deux tableaux produit des sauts incohérents.
- Après suppression ou filtre, une page devenue vide doit être recalée vers la dernière page valide.
- Recherche/tri locaux sur une page serveur donnent des résultats incomplets ; ils doivent être serveur ou explicitement limités au petit référentiel.

## Tests requis

Pour chaque correction : première/dernière page, page hors borne, filtre avant `COUNT`, recherche sur un élément hors première page, tri stable, changement de taille, suppression du dernier élément, changement d'agence, OWN contre AGENCY, paramètres hostiles `agencyId`, absence de fuite dans le total et invalidation temps réel.
