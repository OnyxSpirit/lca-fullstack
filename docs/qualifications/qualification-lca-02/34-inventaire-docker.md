# Inventaire Docker

Ressources nouvelles : images backend/frontend, volumes MySQL/uploads/GED et trois conteneurs préfixés `lca-qualification-02`. Réseaux réutilisés : `lca-recette_recette_private` et `lca-recette_recette_host`. Port utilisateur : `127.0.0.1:38080`. Aucune ressource existante supprimée, arrêtée ou recréée.

Ressources complémentaires conservées : runners `lca-qualification-02-*runner*`, runners finaux backend/frontend, proxy `lca-qualification-02-wss-proxy` sur `127.0.0.1:38443`, et schémas d’intégration isolés datés. Aucun `--rm`, `down`, `stop`, `prune`, retrait de volume, réseau ou image n’a été utilisé.
