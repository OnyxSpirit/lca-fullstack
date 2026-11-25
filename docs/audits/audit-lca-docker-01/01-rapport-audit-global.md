# Rapport d’audit global

## Verdict

La panne principale est confirmée : le backend quitte avec le code 1 avant d’ouvrir le port 3001, parce que le bootstrap MySQL refuse de reprendre la migration 135. Le journal d’étapes contient un checksum différent pour l’étape 2 et une étape 7 en état `FAILED_PARTIAL`. Le conteneur redémarre ensuite indéfiniment sous `restart: unless-stopped`.

Le healthcheck n’est pas la cause : aucun serveur HTTP n’est lancé. Le frontend principal reste à l’état `Created` parce que Compose exige `backend: service_healthy`.

La migration 136 n’est pas exécutée et n’est donc pas la cause immédiate. Ses tables et permissions sont absentes de la base principale.

## Chaîne causale

1. MySQL 8.4.11 devient sain.
2. Le backend lance `database-bootstrap.js`.
3. La migration 135 est encore PENDING.
4. Le runner compare l’étape 2 au journal appliqué et détecte un checksum différent.
5. Il quitte avec le code 1 avant `server.js`.
6. Docker relance le conteneur.
7. Aucun healthcheck HTTP ne peut réussir.
8. Le frontend, dépendant d’un backend sain, n’est pas démarré.

## Risque données

Aucune suppression ou corruption de lignes n’a été observée. En revanche, le schéma est partiellement migré : étapes 1 à 6 de la migration 135 appliquées, étape 7 en `FAILED_PARTIAL`, étapes suivantes et migration 136 absentes. Toute correction doit commencer par une sauvegarde cohérente et une réconciliation explicite du journal et du schéma.

