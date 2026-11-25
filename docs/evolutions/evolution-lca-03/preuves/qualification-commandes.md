# Preuves de qualification — 25 novembre 2026

- Stack isolé : `evolution-lca-03-final`, trois services sains ; backend sous Node.js 22.23.2, MySQL 8.4, frontend HTTP 200 sur 38083.
- Bootstrap frais : migrations 001 à 137, 67 journaux `APPLIED`, 0 autre état, 0 scope RBAC interdit, démarrage backend sans avertissement historique.
- Immuabilité : `npm run db:migrations:verify` réussi ; 104 migrations vérifiées, migrations 135–137 et runner inchangés.
- Builds : backend réussi ; frontend Docker réussi, 2 556 modules transformés ; lint TypeScript frontend réussi.
- Tests backend complets : 365, 337 réussis, 28 réserves historiques hors périmètre. Les quatre fichiers RH/stock/contrats LCA-03 sont verts.
- Tests frontend ciblés : 4/4 réussis (`evolution-lca-03-finalization.test.ts`).
- E2E HTTP/MySQL : `expected=true` ; rémunération 325 000 XAF, snapshots 2 primes/4 cotisations/1 absence, rejeu 0, stock 15/13/2/1 et 6 900 000 XAF, coût inconnu signalé, doublon comptable 409, contrats snapshot 12 puis 18 mois et CDI configuré.
- HTTP : `/`, `/healthz`, `/api/health` répondent 200.
- Docker : aucune suppression, aucun arrêt, aucun redémarrage des ressources existantes.
- Navigateur : accès local explicitement indisponible pour ce chat ; aucune preuve visuelle n'est revendiquée.

