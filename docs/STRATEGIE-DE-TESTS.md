# Stratégie de tests de l’ERP LCA

Référence actualisée le 17 octobre 2026 pour le lot B.2.

## Principes

- Les suites frontend et backend s’exécutent avec une concurrence inter-fichiers de `1`. Plusieurs fichiers remplacent volontairement `fetch`, le DOM ou le pool SQL ; une exécution parallèle dans un même processus rendait leur résultat dépendant de l’ordre.
- Un test désactivé faute de prérequis est déclaré `SKIP` et ne doit jamais être présenté comme exécuté.
- Les tests MySQL avec écriture doivent viser une instance MySQL 8.4 jetable, sans volume ni réseau partagé avec une base métier.
- Les contrôles de source utilisent `test/helpers/source-contract.ts` afin de tolérer le formatage sans affaiblir l’invariant recherché. Les parcours HTTP restent privilégiés dès qu’une fixture isolée est disponible.

## Commandes de base

Frontend :

```bash
cd frontend
npm run lint
npm test
npm run build
```

Backend :

```bash
cd backend-node
npm run lint
npm test
npm run build
```

La commande `npm test` produit le résumé TAP final et un code de sortie non nul au premier bilan contenant un échec.

## Tests MySQL opt-in

Les fichiers `*-mysql.integration.test.ts` sont protégés par un drapeau propre au scénario. Les variables communes sont :

```text
MIGRATION_DB_HOST=127.0.0.1
MIGRATION_DB_PORT=<port local non public>
MIGRATION_DB_USER=<administrateur de la base jetable>
MIGRATION_DB_PASSWORD=<secret de test non versionné>
```

Exemple qualifié :

```bash
MIGRATION_080_MYSQL_TEST=1 \
MIGRATION_DB_HOST=127.0.0.1 MIGRATION_DB_PORT=3307 \
MIGRATION_DB_USER=root MIGRATION_DB_PASSWORD='<secret-test>' \
npx tsx --test --test-concurrency=1 test/migration-080-mysql.integration.test.ts
```

Ce test crée ses propres schémas, valide la reprise partielle et la divergence réelle, puis supprime seulement ces schémas temporaires.

## Familles

- frontend : composants, hooks, RBAC visuel, navigation et contrats UI ;
- backend : unités, services, contrats SQL et PDF ;
- HTTP : Supertest sur `createApp`, JWT et sessions de test ;
- sécurité : JWT, sessions, 2FA, step-up, appareils de confiance, RBAC et scopes ;
- MySQL : migrations, contraintes, concurrence et transactions, uniquement avec les drapeaux opt-in ;
- Socket.IO : contrats de rooms/événements dans la suite standard, parcours multiutilisateur réel lorsqu’un environnement applicatif isolé est disponible.

## Critère de qualification

Un lot est qualifiable lorsque lint, build, suites actives, tests ciblés concernés et `git diff --check` réussissent. Les scénarios opt-in non exécutés et les parcours navigateur non réalisés sont consignés comme réserves ; ils ne sont ni assimilés à des succès ni masqués.
