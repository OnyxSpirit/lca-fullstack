# Intégration MySQL et temps réel

La base isolée `lca_qualification_finale_v2` a été initialisée depuis zéro puis réinitialisée de façon idempotente : niveau 132, 62 migrations, 429 étapes appliquées et aucune étape en échec.

Les suites historiques couvrent les événements Socket.IO, l'invalidation RBAC, les notifications et les transactions. Les scénarios MySQL lourds marqués historiquement comme conditionnels restent distingués dans le bilan backend ; ils ne sont pas présentés comme exécutés lorsqu'ils sont ignorés par leur propre précondition.
