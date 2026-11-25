# Politique technique permanente

Le nouveau `AGENTS.md` racine inscrit les 24 protections demandées : runner unique et stable, immuabilité, correction additive, checksums/journaux intangibles, postconditions, préservation historique, qualifications fraîche/historique MySQL 8.4, démarrage complet, Node 22, identification Docker, aucune suppression, aucun commit/push/déploiement/production, conservation du travail existant et scopes `OWN`/`AGENCY` uniquement.

La politique détaillée est `docs/architecture/politique-migrations-mysql.md`. Le contrôle permanent est `npm run db:migrations:verify` avec commit de référence et exception 135 identifiée.
