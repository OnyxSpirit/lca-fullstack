# Modifications techniques

- Schéma : migration additive 138.
- API catalogue : référentiels, commandes paginées, détail, création simplifiée, réception transactionnelle/idempotente.
- API véhicules : présence physique/commandée, commande d'origine et KPI corrigés.
- Frontend : page opérationnelle, modales de commande/réception/détail, filtres et six KPI.
- Temps réel : événement `vehicle-orders:changed` limité à l'agence.
- Tests : contrats ciblés backend/frontend et intégration MySQL/HTTP mise à jour.
