# Idempotence, concurrence et reprise

Les tests couvrent : avant étape, après DDL avant journal, avant journal global, DDL absent après erreur (`FAILED_SAFE`), DDL satisfait non journalisé, reprise de la FK après DROP, reprise après modification des colonnes, `FAILED_PARTIAL` historique, rejeu complet et deux bootstraps concurrents sous `GET_LOCK`.

Un bootstrap répété au niveau 137 n'exécute aucune migration. Une FK homonyme incompatible provoque `FAILED_PARTIAL` avec `MIGRATION_FOREIGN_KEY_INCOMPATIBLE`. Les contrôles de checksum restent bloquants au niveau étape et les dérives globales ne sont tolérées qu'avec postconditions compatibles.
