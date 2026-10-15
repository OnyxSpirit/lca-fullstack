# Rapport de validation de la migration 085 — ERP LCA

## 1. Schéma avant migration

`treasury_accounts` possède avant 085 : `concession_id NOT NULL`, `agency_id NULL`, le type de compte, la devise, le statut, les clés étrangères vers concession/agence/utilisateur, l’unicité `(concession_id, code)` et l’index territorial `(concession_id, agency_id, is_active)`. L’absence d’agence ne porte aucune sémantique explicite.

## 2. Analyse de la migration 085

La migration contient trois étapes officielles :

1. DDL : ajout nullable de `attachment_type ENUM('AGENCY','CONCESSION')` et de l’index `(concession_id, attachment_type, agency_id, is_active)` ;
2. DML transactionnelle : qualification `AGENCY` des seules lignes dont `agency_id IS NOT NULL` ;
3. DDL : contrainte imposant agence non nulle pour `AGENCY`, agence nulle pour `CONCESSION`, tout en autorisant `NULL` pour les données historiques ambiguës.

Elle est additive et n’altère aucune écriture financière. Le runner officiel sait reconnaître l’état des deux objets ajoutés à l’étape 1 et la contrainte de l’étape 3. Les DDL MySQL peuvent persister après une interruption ; le journal par étape est donc indispensable.

## 3. Environnement de test

Inventaire Docker en lecture seule :

- `lca-mysql-1` : MySQL 8.4 actif, base métier, exclu ;
- `lca-recette-mysql-1` : MySQL 8.4 actif avec environnement de recette existant, exclu car non prouvé jetable et déjà porteur de données ;
- anciennes instances qualification/requalification/restauration : arrêtées (`Exited 127`) ; leur démarrage est interdit par la mission ;
- aucune autre instance MySQL locale accessible n’a été identifiée.

Aucun conteneur n’a été démarré, arrêté, redémarré ou modifié. Aucun schéma n’a été créé sur les instances actives.

## 4. Résultat d’exécution SQL

La migration 085 **n’a pas été exécutée réellement** sur MySQL 8.4 faute d’instance isolée active et explicitement jetable. Le test d’intégration dédié a été préparé dans `backend-node/test/migration-085-mysql.integration.test.ts` ; il est protégé par `MIGRATION_085_MYSQL_TEST=1` et apparaît explicitement `SKIP` dans l’environnement actuel.

Par conséquent, aucune validation SQL réelle n’est revendiquée.

## 5. Contraintes vérifiées statiquement

- cohérence `AGENCY` ↔ `agency_id IS NOT NULL` ;
- cohérence `CONCESSION` ↔ `agency_id IS NULL` ;
- maintien de `attachment_type NULL` pour l’historique ambigu ;
- index territorial complémentaire, sans suppression de l’index antérieur ;
- aucune clé étrangère supprimée ou modifiée ;
- absence de version 085 concurrente dans le dossier de migrations ;
- prise en charge par le runner résilient et son journal d’étapes.

Le test préparé vérifiera réellement la colonne, l’index, la contrainte CHECK, le journal `schema_migrations`, une table témoin inchangée et les deux créations valides.

## 6. Comptes historiques

- Cas A, agence présente : l’UPDATE cible la ligne et positionne `AGENCY`.
- Cas B, agence absente : aucune mise à jour ; la valeur reste `NULL`.
- Cas C, ambigu : le backend refuse désormais réservation, transfert et tout nouveau mouvement via un message de qualification métier. Il n’assimile jamais `NULL` à `CONCESSION`.

Cette dernière protection a été renforcée pendant l’audit. Le backend rejette également une agence absente pour `AGENCY` et une agence fournie pour `CONCESSION`.

## 7. Comptes d’agence et de concession

Validations statiques et TypeScript réussies : rattachement obligatoire, agence obligatoire pour `AGENCY`, appartenance agence/concession contrôlée, `CONCESSION` réservé aux scopes `CONCESSION` et `GLOBAL`, concession hors scope refusée. Les essais SQL/API réels restent non exécutés.

## 8. Réservations et compatibilité financière

Le code impose : compte qualifié actif `CASH/BANK`, même concession, même devise, agence identique pour `AGENCY`, extension aux agences de la concession pour `CONCESSION`, dépense approuvée, reste réservable et liquidité disponibles. La séparation demandeur/approbateur et l’idempotence existantes sont conservées. Aucun essai transactionnel MySQL réel n’a été effectué dans cette mission.

## 9. Transferts

Le backend refuse les comptes non qualifiés, l’inter-concession, l’inter-devise et le dépassement de `solde comptable - réservations actives`. Les comptes sont verrouillés avant contrôle. Les scénarios concurrents réels restent à exécuter sur la future base isolée.

## 10. Journal et KPI

La classification s’appuie sur `transfer_id`, non sur un libellé. Les flux externes utilisent `transfer_id IS NULL`; les transferts internes additionnent uniquement la jambe `OUT`; les résultats sont groupés par devise. Aucun mouvement historique n’est modifié.

## 11. RBAC

Les services utilisent les permissions dynamiques et scopes `AGENCY`, `CONCESSION`, `GLOBAL`; `OWN` est refusé pour les ressources collectives. Aucun rôle n’est codé en dur. La recette API réelle des quatre scopes reste non exécutée.

## 12. Tests techniques

- lint/TypeScript backend : réussi ;
- build backend : réussi ;
- tests ciblés backend et runner : réussis au niveau fichier ;
- test MySQL 085 : **1 test ignoré**, environnement non activé ;
- lint/TypeScript frontend : réussi ;
- build frontend : réussi ;
- tests ciblés frontend : 3 fichiers sur 3 réussis ;
- tests financiers historiques : les échecs statiques obsolètes déjà consignés dans le rapport précédent restent distincts ;
- aucune preuve SQL réelle ni test de concurrence MySQL n’a été produit.

## 13. Procédure de reprise

MySQL effectue des commits implicites autour des DDL. Une interruption ne doit donc jamais être traitée par un simple rollback applicatif.

Procédure sûre :

1. arrêter le démarrage applicatif sans relancer aveuglément ;
2. sauvegarder le schéma et les données de `treasury_accounts` ;
3. lire `schema_migration_steps` pour la version 85 ;
4. comparer `information_schema.columns`, `statistics` et `table_constraints` avec les trois étapes ;
5. si l’état est intégralement conforme, réparer uniquement le journal selon la procédure d’exploitation approuvée ;
6. si l’état est partiel ou divergent, ne pas forcer la migration : restaurer la sauvegarde ou appliquer un plan SQL expert validé ;
7. ne retirer `chk_treasury_account_attachment`, l’index et la colonne que dans le cadre d’une restauration planifiée. La suppression de la colonne perdrait les qualifications saisies après migration.

## 14. Risques

- durée et verrouillage de l’ALTER sur une table volumineuse non mesurés ;
- comportement MySQL 8.4 réel du CHECK et du runner non observé ici ;
- comptes historiques `NULL` nécessitant une décision métier ;
- tests d’intégration API, concurrence et RBAC non exécutés ;
- déploiement du code avant migration provoquerait des erreurs de colonne absente.

## 15. Verdict

**BLOQUÉ PAR L’ENVIRONNEMENT**.

La migration est cohérente statiquement et les protections applicatives ont été renforcées, mais elle ne peut pas être déclarée validée tant qu’elle n’a pas réellement été exécutée via le runner officiel sur une instance MySQL 8.4 isolée et jetable.
