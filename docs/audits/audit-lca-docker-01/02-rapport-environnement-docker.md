# Environnement Docker

- Docker Engine client/serveur : 29.10.0.
- Docker Compose : v5.8.0.
- Contexte : `default`.
- MySQL : image 8.4, serveur 8.4.11.
- Backend : Node 22 Bookworm slim.
- Frontend : build Node 22, runtime nginx 1.27 Alpine.
- Hôte Codex : Node 24.11.1 et npm 11.7.0.

Le daemon fonctionne : les inspections privilégiées réussissent et MySQL est sain. L’accès direct de Codex au socket échoue. Dans le bac à sable, l’utilisateur n’est pas membre du groupe Docker effectif ; les métadonnées du socket sont en outre remappées selon le contexte. L’accès fonctionne seulement via l’escalade contrôlée. Cela explique la différence avec un terminal utilisateur disposant du groupe Docker ou d’un contexte moins restreint.

Empreinte observée : 45 images, 76 conteneurs, 28 volumes, 2 250 entrées de cache de build et environ 25 Gio de cache. Les multiples projets de qualification ont produit une forte dispersion des réseaux, ports, volumes et conteneurs arrêtés. Aucun conflit sur le port HTTP 80 n’a été constaté au moment de l’audit.

Aucune ressource n’a été arrêtée, redémarrée, recréée ou supprimée pendant l’audit.

