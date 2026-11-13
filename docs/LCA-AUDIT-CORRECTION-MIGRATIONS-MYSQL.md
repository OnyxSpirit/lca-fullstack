# Audit et correction des migrations MySQL — ERP LCA

Date de validation finale : 13 novembre 2026  
Moteur validé : MySQL 8.4.11  
Niveau officiel du dépôt : 124 (`124_accounting_automation_control_repair.sql`)

## Verdict

**VALIDÉ** — le mécanisme a été exécuté avec succès sur une base vierge, une base existante 121, une dérive historique réelle, une migration nouvelle, une migration invalide puis corrigée et deux exécutions concurrentes. Aucune base de production n'a été utilisée.

## Problème initial et causes

L'échec observé au Lot 5 était d'abord un défaut de configuration d'accès : le script local ciblait `127.0.0.1:3307`, tandis que le conteneur de recette publiait MySQL sur `127.0.0.1:33321`. Dans le réseau Docker, MySQL reste accessible sur son port interne `3306`. Le port hôte ne doit donc pas être recopié aveuglément dans les conteneurs.

L'audit a confirmé que la découverte des fichiers, leur tri numérique, la table `schema_migrations`, les checksums et le verrou MySQL `GET_LOCK` étaient déjà en place. La faiblesse durable concernait la reprise des DDL : toute erreur était classée `FAILED_PARTIAL`, y compris lorsque la postcondition prouvait qu'aucun objet n'avait été créé. Une faute SQL corrigible bloquait alors définitivement la migration, alors même que le schéma était resté intact.

Une dette de test a aussi été corrigée : le test d'intégration attendait encore le niveau 117 au lieu du niveau officiel 123.

Le second audit a identifié la cause exacte du blocage 121. Le checksum enregistré est `bfd4803c…e8cc`, tandis que le fichier courant vaut `98af2310…0553`. Les empreintes par instruction montrent que quatre DDL et deux DML historiques sont inchangés, mais que deux instructions ont ensuite été insérées en positions 2 et 3 : création et initialisation de `accounting_automation_control`. La base Docker possédait les quatre autres tables de 121, mais pas cette table. Il s'agissait donc d'une dérive significative, pas d'un simple reformatage.

## Correctifs réalisés

- `backend-node/src/scripts/mysql-migration-runner.ts`
  - ajout du statut journalisé `FAILED_SAFE` ;
  - mise à niveau automatique et non destructive de l'énumération de `schema_migration_steps` ;
  - contrôle de la postcondition après une erreur DDL ;
  - reprise autorisée uniquement si l'objet visé est toujours prouvé absent ;
  - changement de checksum autorisé uniquement pour cette étape sûre corrigée ;
  - maintien du blocage strict `FAILED_PARTIAL` si un effet partiel existe ou ne peut être prouvé ;
  - actualisation explicite du nom, du checksum et du type d'étape lors d'une reprise sûre ;
  - validation structurelle des tables historiques : colonnes et types, nullabilité, index nommés et contraintes nommées ;
  - classification des dérives historiques compatibles sans réexécution.
- `backend-node/src/scripts/database-bootstrap.ts`
  - un checksum historique différent produit désormais `MIGRATION_CHECKSUM_WARNING` ;
  - le checksum enregistré reste intact et la migration historique n'est jamais rejouée ;
  - les migrations additives en attente peuvent réparer un objet absent ;
  - les postconditions historiques sont revérifiées après ces migrations et une incompatibilité restante produit `MIGRATION_SCHEMA_INCOMPATIBLE`.
- `backend-node/src/scripts/database-migration-status.ts`
  - diagnostic en lecture seule de la connexion, des migrations appliquées/en attente, des étapes incomplètes et des dérives de checksum ;
  - états `UNVERSIONED`, `READY`, `PENDING`, `WARNING`, `FAILED_SAFE`, `FAILED_PARTIAL` et `BLOCKED` ;
  - code de sortie 2 uniquement pour les états exigeant une intervention.
- `backend-node/database/migrations/124_accounting_automation_control_repair.sql`
  - création additive et idempotente du contrôle absent sur les anciennes bases ;
  - initialisation idempotente du singleton, sans modification de 121.
- `backend-node/package.json`
  - commande `db:migrations:status`.
- `backend-node/test/mysql-migration-runner.test.ts`
  - test réel de l'échec DDL sans effet puis reprise après correction ;
  - niveau attendu actualisé à 124 ;
  - contrôle automatisé d'une dérive compatible et d'une modification historique significative.

## Fonctionnement corrigé

Le bootstrap lit automatiquement les fichiers `.sql` de `database/migrations`, extrait leur préfixe numérique, refuse les doublons et les exécute dans l'ordre. Une version présente dans `schema_migrations` n'est jamais rejouée. Si son checksum diffère, le runner évalue les postconditions DDL du fichier courant, signale la dérive et conserve l'historique. Les migrations additives en attente sont ensuite exécutées ; la compatibilité historique est revérifiée avant la réussite globale.

Chaque étape est journalisée dans `schema_migration_steps`. Le DML est transactionnel. Pour le DDL MySQL, qui peut provoquer un commit implicite, le runner vérifie l'état réel dans `information_schema` :

- `APPLIED` : postcondition satisfaite ;
- `RUNNING` : interruption possible, état réévalué avant reprise ;
- `FAILED_SAFE` : échec prouvé sans effet, fichier corrigeable puis rejouable ;
- `FAILED_PARTIAL` : effet possible, reprise automatique interdite.

Un verrou nommé propre à la base (`GET_LOCK`) sérialise les runners. Le `finally` libère le verrou et ferme toujours la connexion.

Le délai d'attente du verrou est de 300 secondes par défaut et peut être ajusté avec `MIGRATION_LOCK_TIMEOUT_SECONDS`. L'ancienne valeur fixe de 30 secondes était insuffisante pour un bootstrap complet depuis une base vide : le second runner pouvait expirer alors que le premier fonctionnait normalement.

## Commandes et paramètres

Depuis `backend-node`, après `npm run build` :

```bash
npm run db:bootstrap
npm run db:migrations:status
```

Variables communes : `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`; `DATABASE_ROOT` est optionnelle pour une racine isolée de validation.

- depuis l'hôte de recette validé ici : `DB_HOST=127.0.0.1`, `DB_PORT=33321` ;
- depuis un conteneur du même réseau : nom DNS du service MySQL, `DB_PORT=3306` ;
- ne jamais déduire le port d'un environnement depuis celui d'un autre.

La commande de statut est en lecture seule. Elle retourne un résumé et les listes `pending`, `failed`, `warnings` et `blocked`.

## Preuves MySQL 8.4

### Base vierge

La base jetable `lca_lot6_validation_20261112` a été construite du baseline jusqu'à 123. Les tables critiques, contraintes et index bancaires ont été contrôlés. Une nouvelle exécution a retourné directement `Database VERSIONED; niveau >= 123`. Le diagnostic final est `READY`, avec `pending=[]`, `failed=[]` et `checksumDrift=[]`.

### Base existante 121 vers 124 et dérive réelle

La base jetable `lca_lot6_upgrade_121` a été arrêtée au niveau 121, puis enrichie de marqueurs fictifs représentant concession, agence, utilisateur, client, compte bancaire et mouvement Treasury de montant 12 345,67. Le bootstrap normal a appliqué 122 puis 123. Une seconde exécution n'a rien rejoué.

Contrôle final : version 123, zéro étape incomplète, client marqueur présent et mouvement marqueur présent. Aucune table métier n'a été supprimée ou recréée.

Une seconde base jetable, `lca_checksum_policy_20261112`, a été construite avec l'ancienne forme de 121, sans `accounting_automation_control`. Avec la racine courante, le diagnostic a retourné `PENDING`, trois migrations en attente et l'étape historique 2 absente. Le bootstrap a émis un avertissement, n'a pas rejoué 121, puis a appliqué 122, 123 et la réparation additive 124. Après relance : état `WARNING`, aucune migration en attente, aucune étape incomplète, donnée témoin préservée, singleton présent et checksum 121 original inchangé.

### Nouvelle migration et concurrence

Une racine temporaire hors du répertoire officiel a reçu les versions de test 124 à 126. La 124 a été découverte automatiquement, appliquée une fois et enregistrée une fois. Les migrations temporaires n'ont pas été conservées dans `database/migrations`.

### Échec et reprise

La version temporaire 125 contenait un DDL volontairement invalide. Le processus s'est arrêté avec `MIGRATION_FAILED_SAFE`; aucune ligne 125 n'a été inscrite dans `schema_migrations`, l'objet visé était absent et l'erreur SQL était conservée dans le journal. Après correction du fichier, l'étape est passée à `APPLIED` et la version a été inscrite une seule fois.

Le même comportement est couvert par le test automatisé `Runner MySQL 8.4 : un DDL échoué sans effet est corrigeable et reprenable`.

### Concurrence

Deux bootstraps ont été lancés simultanément sur les versions temporaires 125 et 126, cette dernière comportant une attente afin de provoquer le chevauchement. Les deux processus ont terminé avec succès : un seul a exécuté les migrations, l'autre a attendu le verrou puis constaté le niveau courant. Chaque version possède une ligne d'historique, la table témoin une seule ligne et le journal zéro étape incomplète.

Après la nouvelle politique de checksum, un test ciblé supplémentaire a lancé deux bootstraps simultanés sur une version temporaire 125 comportant trois étapes et une attente. Résultat : codes de sortie `0/0`, une seule ligne d'historique 125, une seule ligne témoin, trois étapes `APPLIED` et verrou libéré (`IS_FREE_LOCK=1`).

Un dernier test a lancé deux bootstraps simultanés depuis une base entièrement vide. Il a mis en évidence puis validé la correction du délai de verrou : codes `0/0`, niveau 124 atteint une seule fois, 54 lignes d'historique, zéro étape incomplète et verrou libéré. Le second runner a attendu la construction complète puis a reconnu la base comme déjà versionnée.

## Tests de non-régression

- build backend TypeScript : réussi ;
- test MySQL ciblé `FAILED_SAFE` : 1/1 réussi sur MySQL 8.4 réel ;
- bootstrap et statut de la base vierge : réussis, état `READY` ;
- authentification et révocation de session : 19/19 réussis avec le drapeau de mocks Node requis ;
- agences/RBAC, comptabilité lots 2 à 6, trésorerie et rapprochement bancaire : 9/9 fichiers réussis ;
- nouvelle passe agences/RBAC/comptabilité/trésorerie/statique migrations : 10/10 fichiers réussis ;
- `git diff --check` : réussi.

Le test d'intégration historique complet crée six bases et rejoue plusieurs scénarios de coupure ; son niveau attendu est 124 et sa limite a été portée à 20 minutes. Une passe a exposé le délai de verrou fixe de 30 secondes sur la sixième base ; elle n'est pas comptée comme réussie, mais a conduit au correctif. Les scénarios critiques ont ensuite été exécutés séparément jusqu'à leur résultat final : dérive 121 et réparation 122–124, `FAILED_SAFE`, dérive significative, conservation des données, concurrence courte et concurrence depuis une base vide.

## Procédure de reprise

1. Exécuter `npm run db:migrations:status` et conserver la sortie.
2. Si l'état est `FAILED_SAFE`, vérifier que l'erreur concerne bien le SQL attendu, corriger le fichier sous revue, puis relancer `npm run db:bootstrap`. Le runner revérifie l'absence de postcondition avant toute reprise.
3. Si l'état est `FAILED_PARTIAL`, ne pas modifier l'historique et ne pas relancer en force. Sauvegarder la base, inspecter `schema_migration_steps` et `information_schema`, documenter les objets réellement présents, puis préparer une réparation explicite sous autorisation.
4. Si l'état est `WARNING`, conserver l'historique et vérifier le détail ; aucune action n'est nécessaire si les postconditions sont compatibles.
5. Si l'état est `BLOCKED`, créer une nouvelle migration additive qui rétablit les objets manquants ou corrige explicitement l'incompatibilité. Ne jamais réécrire silencieusement le checksum historique.
6. Après reprise, exécuter le statut et vérifier `READY` ou `WARNING`, l'absence de migrations en attente et d'étapes incomplètes.

## Précautions de production et limites

- réaliser et vérifier une sauvegarde avant toute mise à niveau ;
- exécuter d'abord le statut, puis le bootstrap avec un compte limité à la base cible ;
- ne jamais utiliser une racine de migrations temporaire en production ;
- ne jamais marquer manuellement une version réussie pour contourner une erreur ;
- conserver un seul processus de déploiement, même si le verrou protège la concurrence accidentelle ;
- certains DDL complexes ne peuvent pas être caractérisés automatiquement : ils restent volontairement `FAILED_PARTIAL` et exigent une analyse humaine ;
- le numéro 124 dans le test d'intégration devra être relevé lors de l'ajout d'une future migration officielle ;
- le conteneur backend actif observé le 12 novembre embarque encore l'ancien build, qui contient le blocage `MIGRATION_CHECKSUM_MISMATCH`. La configuration réseau est correcte (`mysql:3306`), mais l'image doit être reconstruite selon la procédure d'exploitation avant d'exécuter le bootstrap sur `concession_erp`. Aucun rebuild ni bootstrap de cette base partagée n'a été réalisé pendant l'audit.
