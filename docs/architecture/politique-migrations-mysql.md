# Politique permanente des migrations MySQL

## Architecture réellement utilisée

Le backend conserve un seul système de migration. `database-bootstrap.ts` ouvre une connexion MySQL, acquiert un verrou nommé propre à la base, classe la base (`EMPTY`, `VERSIONED` ou `AMBIGUOUS`), applique si nécessaire la baseline consolidée 071 et son seed système, puis découvre les fichiers `NNN_*.sql` de `backend-node/database/migrations`. `mysql-migration-runner.ts` découpe chaque fichier en instructions, calcule les empreintes SHA-256, exécute et contrôle les étapes. Le serveur est lancé seulement après réussite du bootstrap par la commande Docker existante `node dist/scripts/database-bootstrap.js && node dist/server.js`.

Il n'existe ni second runner, ni journal parallèle, ni service de migration distinct. Les migrations 001 à 033 restent archivées dans `legacy-migrations`; la baseline fraîche absorbe 001 à 071 et les migrations 072 et suivantes sont appliquées dans l'ordre numérique.

## Journaux, checksums et verrouillage

- `schema_migrations` atteste une migration entière : version, nom, checksum du fichier et date d'application.
- `schema_migration_steps` atteste chaque instruction : numéro d'étape, checksum de l'instruction, nature DDL/DML, état et erreur éventuelle.
- Les états sont `RUNNING`, `APPLIED`, `FAILED_SAFE` et `FAILED_PARTIAL`.
- Le checksum est SHA-256 sur le texte exact traité. Une divergence n'est jamais corrigée par écriture arbitraire dans le journal.
- `GET_LOCK(lca:migrations:<empreinte-base>)` sérialise les runners concurrents; le verrou est libéré en `finally`.
- Une migration complète déjà enregistrée n'est pas rejouée. Une dérive historique est seulement tolérée si les postconditions DDL actuelles sont démontrées compatibles; sinon le bootstrap bloque.

## Création d'une migration

1. Inspecter le dernier numéro, les conventions, le schéma réel, les contraintes, les index, les données et les permissions.
2. Choisir le prochain numéro unique et un nom descriptif `NNN_description.sql`.
3. Préférer des opérations additives. Prévoir l'état initial, les postconditions, la reprise après interruption et la conservation des historiques.
4. Utiliser du SQL MySQL 8.4 et les mécanismes existants, sans syntaxe propriétaire ni modification ordinaire du runner.
5. Pour un objet potentiellement présent, faire en sorte que sa définition attendue soit vérifiable : type, nullabilité, défaut, colonnes et ordre d'index, cible et règles de FK.
6. Pour les permissions, utiliser les codes existants, des insertions idempotentes et exclusivement les scopes `OWN` ou `AGENCY`.
7. Qualifier sur installation fraîche, version précédente, copie historique, rejeu, interruption pertinente, concurrence, données et démarrage complet.

## Préconditions, postconditions et idempotence

Le runner inspecte `information_schema` avant d'adopter un DDL déjà satisfait. Une table simplement homonyme n'est pas suffisante : les colonnes, types, nullabilités, index nommés et contraintes nommées attendus sont comparés. Un objet absent est créé; un objet conforme est reconnu; un objet incompatible produit un diagnostic bloquant.

Les DML sont exécutés dans une transaction avec leur journal d'étape. Ils doivent utiliser des clés naturelles ou techniques et `INSERT IGNORE`/`ON DUPLICATE KEY UPDATE` lorsque la sémantique le permet. Une précondition renvoyant `migration_conflict_type` et un nombre positif provoque `MIGRATION_PREFLIGHT_CONFLICT` avant modification.

## DDL, interruption et reprise

MySQL peut valider implicitement un DDL. Le runner inscrit donc `RUNNING` avant le SQL, puis contrôle l'état réel :

- absence de postcondition après erreur : `FAILED_SAFE`, SQL corrigeable et reprise autorisée;
- postcondition complète après interruption avant journal : adoption contrôlée en `APPLIED`;
- état partiel ou ambigu : `FAILED_PARTIAL`, blocage et analyse obligatoire;
- étape `APPLIED` dont la postcondition a disparu : `MIGRATION_SCHEMA_DIVERGED`.

La correction INFRA-01 ajoute uniquement un traitement déterministe des remplacements de FK écrits sous la forme `DROP FOREIGN KEY …, …, ADD CONSTRAINT …` avec le même nom. Le runner vérifie la définition complète de la FK, exécute séparément suppression, modification des colonnes et recréation, puis revérifie. Il sait reprendre après chacune de ces phases. Une FK homonyme mais différente reste bloquante. Dans MySQL, `NO ACTION` et `RESTRICT` sont normalisés comme équivalents pour cette comparaison.

Les erreurs de syntaxe, checksums divergents et schémas incompatibles ne sont jamais réessayés aveuglément. Les erreurs transitoires doivent rester bornées et ne peuvent être rejouées qu'après contrôle de l'état réel.

## Baseline et migrations historiques

La baseline déclarée 071 doit représenter exactement le niveau 071. Elle ne doit pas contenir d'objets introduits par une migration ultérieure. Les colonnes et contraintes de contexte historique des notifications appartiennent à 094; elles ont donc été retirées de la baseline. Une base historique n'est jamais modifiée pour la faire ressembler rétroactivement à la baseline.

Une base vide reçoit baseline + seed, puis 072 jusqu'à la dernière migration. Une base versionnée applique uniquement les versions manquantes. Une base non vide sans journal est `AMBIGUOUS` et refusée.

## Immuabilité

Une migration exécutée sur un environnement persistant est immuable. La commande `npm run db:migrations:verify` vérifie l'unicité des numéros et compare les migrations 034–134 au commit de référence `a78a76d67d7b1e0b76d54fde80467b11c76f3cf2`. L'exception 135 est l'artefact historique exact retrouvé, identifié par le blob Git `d96488bb33c923ecf552c834fcefa6847f1e0fb0` et le SHA-256 `ecf1175…fc8e`. Cette exception restaure le fichier réellement exécuté; elle ne remplace aucun checksum de journal.

Les ajouts conçus après cette exécution ont été déplacés vers la migration additive 137. Une future correction doit également prendre le prochain numéro disponible. Le fichier `database/migration-immutability.json` ne doit pas être régénéré pour faire passer un contrôle; toute évolution de la référence exige une revue explicite et une preuve d'application.

## Sauvegarde et récupération historique

Avant intervention sur une base persistante :

1. identifier précisément conteneur, volume, base et montages;
2. effectuer un `mysqldump` MySQL 8.4 cohérent (`--single-transaction`, structure, données, routines, triggers et événements);
3. compresser, restreindre les permissions et calculer SHA-256;
4. restaurer réellement dans une instance MySQL 8.4 isolée;
5. comparer tables, colonnes, contraintes, journaux, nombres de lignes, agrégats financiers et relations;
6. exécuter la montée uniquement sur une copie supplémentaire;
7. conserver les preuves sans secret ni donnée personnelle.

Un `FAILED_PARTIAL` n'est réconcilié qu'après identification de l'artefact exact, validation des checksums antérieurs, contrôle des données, exécution de la correction déterministe et vérification des postconditions. L'état initial, l'action et l'état final restent visibles dans les preuves.

## Qualification obligatoire

- MySQL 8.4 et Node.js 22.
- Installation fraîche officielle, montée depuis 133 et 134, copie historique partielle, rejeu et concurrence.
- Interruption avant étape, après DDL, après SQL avant journal et avant journal global.
- Conservation des clients, factures, montants, encaissements, employés, rôles, permissions et références.
- Builds TypeScript, lints, tests unitaires/intégration/MySQL/HTTP/RBAC, images Docker, healthchecks backend et frontend.
- Aucun succès ne peut être déduit d'une simple lecture du SQL ou d'un build.

## Pratiques interdites

- Désactiver les checksums ou écrire un checksum arbitraire.
- Effacer les journaux, transformer artificiellement `FAILED_PARTIAL` en `APPLIED` ou réutiliser un numéro.
- Modifier une ancienne migration pour une fonctionnalité ou une installation fraîche.
- Désactiver globalement les FK, supprimer des données ou créer des données fictives pour contourner une contrainte.
- Modifier le runner pour une évolution métier ordinaire.
- Tester sur une base persistante principale, supprimer une ressource Docker ou présenter une CI distante comme réussie sans preuve.

## Exemple conforme

Une nouvelle colonne optionnelle est ajoutée dans une nouvelle migration numérotée. Le runner reconnaît la colonne si son type et sa nullabilité sont déjà conformes; il bloque si elle est homonyme mais incompatible. La migration est ensuite testée sur une base vide et sur une copie historique, puis le bootstrap est rejoué pour prouver qu'aucune étape n'est exécutée deux fois.
