# Modifications techniques

- Schéma : aucune nouvelle migration ; la migration 138 reste immuable.
- API catalogue : résolution/création transactionnelle des marques et modèles, normalisation et reprise de course d'unicité, refus des inactifs, commandes paginées, détail et réception transactionnelle/idempotente.
- API véhicules : présence physique/commandée, commande d'origine et KPI corrigés.
- Frontend : champs créables avec recherche et confirmation explicite, réinitialisation des dépendances, page opérationnelle, modales de commande/réception/détail, filtres et six KPI aux libellés exacts.
- Temps réel : événement `vehicle-orders:changed` limité à l'agence.
- Tests : contrats ciblés backend/frontend, scénario MySQL/HTTP KPI et références libres, suite globale, 107 intégrations conditionnelles rapprochées et banc WSS/TLS.
- Qualification : partitionnement optionnel du lanceur conditionnel, canonicalisation du répertoire de preuve GED ; comportement par défaut et inventaire 107 inchangés.
