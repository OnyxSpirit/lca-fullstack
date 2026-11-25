# Baseline 071 et migration 094

La baseline 071 contenait cinq colonnes, deux index et deux FK appartenant à 094. Ils ont été retirés de la baseline; 094 reste l'unique introduction de `actor_type`, `actor_user_id`, snapshots et contexte agence. Aucune base persistante n'a subi de suppression.

L'installation fraîche exécute maintenant la baseline sans ces objets, puis 094 les ajoute. Les scénarios 094 contrôlent conservation de la notification historique, snapshots immuables, reconnaissance d'un état conforme et détection d'un type divergent.
