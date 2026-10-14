# Diagnostic et déblocage de la migration 080 — ERP LCA

Date : 13 octobre 2026  
Base examinée : `lca_recette` — MySQL 8.4  
Mode d’examen : requêtes SQL de lecture uniquement

## 1. Cause exacte

La divergence signalée est un faux positif du gestionnaire de migrations, pas une divergence du schéma MySQL.

La migration 080 contient six instructions. L’étape 3 est :

```sql
ALTER TABLE document_mark_snapshots
 MODIFY document_context VARCHAR(50) NOT NULL;
```

Le vérificateur `ddlState()` savait reconnaître les objets ajoutés par `ADD COLUMN`, `ADD INDEX` et `ADD CONSTRAINT`, mais ne savait pas prouver l’état d’un `MODIFY COLUMN`. Il renvoyait systématiquement `AMBIGUOUS`.

Au premier passage, MySQL a exécuté l’instruction et l’étape a été journalisée `APPLIED`. Lors du contrôle postérieur ou du redémarrage, le gestionnaire a relu cette étape `APPLIED`, a reçu `AMBIGUOUS`, puis a produit :

`MIGRATION_SCHEMA_DIVERGED: 080_document_mark_policies.sql étape 3`

La migration globale n’a donc jamais été enregistrée dans `schema_migrations`, bien que ses six DDL aient abouti.

## 2. État réel du schéma actuel

Constats effectués en lecture seule :

- `schema_migrations` contient le baseline 071 et les migrations 072 à 079 ; aucune ligne 080.
- `schema_migration_steps` contient les six étapes 080 en état `APPLIED`.
- étape 1 : catégorie de cachets créée et journalisée ;
- étape 2 : `service_stamps.category_id`, index, FK et `document_context VARCHAR(50)` présents ;
- étape 3 : `document_mark_snapshots.document_context` est réellement `VARCHAR(50) NOT NULL` ;
- étape 4 : table d’autorisations cachet–rôle présente ;
- étape 5 : table des politiques documentaires présente ;
- étape 6 : `document_mark_snapshots.policy_id` et sa FK sont présents.

Les index et contraintes nommés de la migration existent. Les cinq tables concernées (`service_stamps` comprise) ne contenaient aucune ligne au moment de l’inspection. Aucune donnée existante n’est donc impliquée dans le blocage actuel.

## 3. Structure attendue et structure observée à l’étape 3

| Attribut | Attendu | Observé |
|---|---|---|
| Table | `document_mark_snapshots` | conforme |
| Colonne | `document_context` | conforme |
| Type | `varchar(50)` | conforme |
| Nullabilité | `NOT NULL` | conforme |
| Jeu de caractères | `utf8mb4` | conforme |
| Collation | `utf8mb4_unicode_ci` | conforme |
| Journal étape | `APPLIED` | conforme |
| Journal migration globale | version 080 | absent |

La seule différence est donc l’absence normale de la ligne globale 080, conséquence de l’échec du contrôle postconditionnel.

## 4. Correction effectuée

Le fichier SQL 080 n’a pas été modifié. Les checksums des étapes existantes restent valides.

Le gestionnaire reconnaît maintenant un `ALTER TABLE ... MODIFY [COLUMN]` simple et compare dans `information_schema.columns` :

- le nom de colonne ;
- le `COLUMN_TYPE` normalisé ;
- la nullabilité.

`BOOLEAN` est normalisé en `TINYINT(1)`, conformément à la représentation MySQL. La lecture accepte également la casse réelle des noms de champs retournés par MySQL 8.4 (`COLUMN_TYPE`, `IS_NULLABLE`).

Résultat :

- définition exacte : `SATISFIED` ;
- colonne absente : `ABSENT` ;
- type ou nullabilité différents : `AMBIGUOUS`, donc divergence toujours bloquée ;
- instruction combinant `MODIFY` et `ADD` : tous les éléments doivent être conformes.

Les contrôles de divergence ne sont ni désactivés ni contournés.

## 5. Fichiers modifiés ou créés

- modifié : `backend-node/src/scripts/mysql-migration-runner.ts` ;
- créé : `backend-node/test/migration-080-recovery.test.ts` ;
- créé : `backend-node/test/migration-080-mysql.integration.test.ts` ;
- créé : `docs/DIAGNOSTIC-MIGRATION-080-LCA.md`.

## 6. Tests exécutés

### Tests TypeScript et unitaires

- compilation backend : réussie ;
- test de découpage et du gestionnaire historique : réussi ;
- identification de l’étape 3 : réussie ;
- `VARCHAR(50) NOT NULL` reconnu : réussi ;
- `VARCHAR(40)` refusé : réussi ;
- `VARCHAR(50) NULL` refusé : réussi.

### MySQL 8.4 isolé

Un conteneur `mysql:8.4` temporaire a été lancé avec `/var/lib/mysql` en `tmpfs`, sans volume persistant et sans connexion à la base de recette. Il a été arrêté et supprimé après les tests.

Scénarios réussis :

1. schéma conforme au niveau 079 puis application complète de 080 ;
2. interruption simulée après l’exécution MySQL de l’étape 3, avant sa journalisation, puis reprise `RECOVERED` ;
3. six structures déjà présentes, étapes `APPLIED`, ligne globale 080 absente : reprise sans duplication et inscription normale de la migration ;
4. divergence réelle forcée en `VARCHAR(40) NOT NULL` : `MIGRATION_SCHEMA_DIVERGED` maintenu ;
5. contrôle des six étapes, de quatre clés étrangères représentatives, du type et de la nullabilité ;
6. conservation d’un cachet historique créé avant 080 : identité et contexte conservés, `category_id` ajouté à `NULL` ;
7. absence de duplication des structures lors des reprises.

Le bootstrap complet a atteint la version 080 dans les scénarios conformes. Le démarrage HTTP complet du backend n’a pas été exécuté contre la base actuelle, car il inscrirait la ligne 080 et constituerait une écriture non autorisée.

## 7. État de la migration 080

### Base actuelle

- structures : conformes ;
- étapes 1 à 6 : `APPLIED` ;
- ligne globale `schema_migrations.version=80` : absente ;
- état opérationnel : en attente d’un redémarrage avec le gestionnaire corrigé.

### Code corrigé

Au prochain bootstrap autorisé, le gestionnaire relira chaque étape. L’étape 3 sera désormais prouvée `SATISFIED`, les autres étapes resteront validées, puis le gestionnaire inscrira lui-même la ligne 080 avec le checksum du fichier. Il ne rejouera aucun DDL et ne modifiera aucune donnée métier.

## 8. Procédure sûre de redémarrage Docker

Après validation explicite de l’intervention sur la base actuelle :

```bash
cd /home/silva/Documents/Codex/2026-08-31/ch/outputs/lca-fullstack
docker compose build backend
docker compose up -d --no-deps backend
docker compose logs --no-color --tail=200 backend
docker compose ps backend mysql
```

Contrôles attendus dans les logs :

- `Migration 080_document_mark_policies.sql: PENDING` ;
- absence de `MIGRATION_SCHEMA_DIVERGED` ;
- `Migration 080_document_mark_policies.sql: APPLIED` ;
- démarrage normal du serveur.

Contrôle SQL de lecture après démarrage :

```sql
SELECT version,name,checksum
FROM schema_migrations
WHERE version=80;

SELECT step_no,status,error_message
FROM schema_migration_steps
WHERE version=80
ORDER BY step_no;
```

Résultat attendu : une ligne globale 080 et six étapes `APPLIED`.

## 9. Intervention SQL nécessaire

Aucune intervention SQL manuelle n’est nécessaire ni recommandée.

Il ne faut pas :

- insérer manuellement la ligne 080 ;
- modifier `schema_migration_steps` ;
- rejouer directement le fichier SQL ;
- supprimer ou recréer une table ;
- supprimer la base ou un volume.

La seule écriture attendue est celle du gestionnaire corrigé dans `schema_migrations` lors du prochain bootstrap autorisé.

## 10. Protection de la livraison

L’archive officielle n’a pas été modifiée. Aucun commit, push, reset, restore, stash, clean, changement de branche ou déploiement n’a été effectué.
