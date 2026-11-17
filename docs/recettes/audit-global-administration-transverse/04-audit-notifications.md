# 04 — Audit du Centre de notifications

## Preuves

- UI réelle : route chargée, compteur `0 non lue`, filtres portée/statut/11 catégories, pagination, bouton de lecture globale désactivé à juste titre, état vide explicite.
- Base : `notifications=0` au moment de l'audit.
- Tests frontend : présentation, catégories, fiabilité, contexte historique, RBAC et navigation réussis.
- Tests backend : scopes, endpoints, traçabilité, historique, migration et fiabilité réussis.
- Socket.IO : logique couverte statiquement et par tests backend non-MySQL ; scénario réel MySQL/Socket identifié mais non exécuté.

## Limites

L'absence de fixture de notification pour le compte audité empêche la preuve UI de lecture, archivage, suppression et arrivée temps réel. Introduire des données aurait été possible uniquement via le test d'intégration existant, mais ce test refuse le nom de base actuel avant toute exécution.

Verdict : **incomplet**. Aucune anomalie fonctionnelle confirmée, mais preuve de bout en bout insuffisante.

