# Preuves techniques anonymisées

- Backend principal : code de sortie 1, état Restarting, OOM=false.
- Logs : `MIGRATION_CHECKSUM_MISMATCH: 135_evolution_lca_02_foundation.sql étape 2`.
- Journal 135 : étapes 1–6 APPLIED ; étape 7 FAILED_PARTIAL, erreur de nom de FK en doublon.
- Checksum étape 2 journal : `401465…6d49b`.
- Checksum étape 2 fichier actuel : `ebeae0…f9d23`.
- MySQL : 8.4.11.
- Migration 136 : aucune entrée, objets LCA-03 absents.
- Docker : Engine 29.10.0, Compose v5.8.0, contexte default.
- Empreinte : 45 images, 76 conteneurs, 28 volumes, 2 250 caches de build.
- Permissions : accès socket refusé sans escalade dans Codex, inspection réussie avec autorisation.
- Frontend principal : état Created, dépendance backend service_healthy.
- Aucune commande destructive ou corrective exécutée.

