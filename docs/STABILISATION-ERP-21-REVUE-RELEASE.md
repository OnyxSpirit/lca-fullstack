# STABILISATION-ERP-21 — Revue de préparation de release

Date : 12 octobre 2026

Version proposée : `ERP-LCA-v1.0.0-rc1`

Verdict : **VERSION CANDIDATE NON PRÊTE**

## Synthèse

Le code applicatif au commit `5f9c25c` (`STABILISATION-ERP-20`) compile, les contrôles ciblés réussissent et les environnements sont sains. Le nom `ERP-LCA-v1.0.0-rc1` n'entre en collision avec aucun tag local existant.

La phase 2 a retiré de l'index courant les données et artefacts incompatibles avec une livraison, sans supprimer leurs copies physiques. Le contenu du futur commit est assaini. La candidate reste néanmoins non prête à distribuer tant que la rotation des accès exposés n'est pas confirmée et que le mode de remise à NOVA ne garantit pas l'absence de l'historique Git sensible.

## État Git et worktree

### État initial ERP-21

- Branche : `main`.
- HEAD : `5f9c25c`, aligné sur `origin/main` au moment du contrôle.
- Worktree initial : propre.
- Modifications applicatives initiales : aucune.
- Fichier supprimé ou renommé : aucun.
- Tag `ERP-LCA-v1.0.0-rc1` : absent.

### État produit par ERP-21 Phase 2

Les chemins `frontend/src/services/accesDemo.txt`, `ll/`, `backend-node/dist/`, `tmp/` et `frontend/bun.lock` sont retirés du suivi avec `git rm --cached`. **946 fichiers** sont ainsi proposés à la suppression du futur commit, mais toutes les copies physiques sont conservées. `.gitignore` et quatre rapports ERP-21 sont ajoutés/modifiés. Aucun code applicatif, test, SQL, Compose ou dépendance n'est modifié. Aucun commit, tag, push ou déploiement n'est effectué.

## Anomalies de contenu de release

### RC21-SEC-01 — fichier d'accès de démonstration suivi

`frontend/src/services/accesDemo.txt` contenait des identifiants ainsi que des valeurs de type mot de passe. Les valeurs n'ont pas été reproduites dans cet audit. Le fichier n'est pas référencé par le code applicatif trouvé. Il est maintenant absent de l'index courant, ignoré et toujours présent localement.

**Impact restant : bloquant tant que la rotation n'est pas confirmée.** Le propriétaire doit vérifier si ces accès ont déjà été utilisés puis les révoquer ou les renouveler. Comme le fichier existe dans l'historique Git, son retrait du dernier commit ne remplace pas la rotation. Si le dépôt doit être transmis intégralement, une stratégie de purge d'historique doit être décidée avec tous les détenteurs de clones ; aucune réécriture n'a été faite par ERP-21.

### RC21-DATA-01 — miroir historique et archive de données suivis

Le répertoire `ll/` contenait **884 fichiers suivis** et représente une copie ancienne du projet, différente du code racine. Il contient `ll/lca-v1.zip`, archive d'environ 4,1 Mio et 1 978 entrées. Son inventaire révèle notamment des fichiers GED PDF et de nombreuses images dans `backend-node/uploads/`. `ll/` est maintenant absent de l'index courant, ignoré et conservé physiquement.

**Impact restant : bloquant pour une remise du dépôt avec son historique.** L'archive peut contenir des données de recette ou personnelles. Un export du seul arbre assaini n'inclura plus `ll/`, mais un clone Git donne toujours accès aux anciens commits. Le propriétaire doit isoler l'archive, effectuer une revue de données et décider du traitement de l'historique avant toute remise du dépôt complet. Aucun contenu GED ou image n'a été ouvert pendant ERP-21.

### RC21-PKG-01 — artefacts générés suivis

- `backend-node/dist/` : 20 anciens fichiers suivis alors que le répertoire de build est ignoré et que Docker recompile depuis `src/`.
- `tmp/` : 40 fichiers suivis, dont scripts de recette et rendus PDF/PNG ERP-16/17.
- `frontend/bun.lock` : ancien lock Bun conservé alors que Docker et les procédures utilisent `npm ci` avec `package-lock.json` ; il n'a pas évolué depuis le premier commit.

**Impact : majeur mais secondaire aux deux blocages de données.** Définir une seule autorité de dépendances (`package-lock.json`), retirer les sorties générées du manifeste de release et conserver les preuves de recette dans un stockage documentaire séparé si elles doivent être archivées. Aucun fichier suspect n'a été supprimé automatiquement.

**Phase 2 : traité dans l'index courant.** Les 20 fichiers `backend-node/dist`, les 40 fichiers `tmp` et `frontend/bun.lock` sont retirés du suivi et ignorés. Les builds recréent correctement `dist`; npm et `package-lock.json` sont l'autorité de dépendances.

## Cohérence du code, contrats et RBAC

- Les corrections ERP-19/20 sont intégrées au HEAD.
- Les opérations Pièces utilisent les permissions spécialisées de réservation ; aucune dépendance à un rôle métier n'a été introduite.
- Les scopes OWN/AGENCY/CONCESSION/GLOBAL et la protection du Super Administrateur restent couverts par les suites ciblées.
- Aucun changement de route, contrat API ou transaction n'est présent dans le worktree ERP-21.
- Le risque inter-concessions d'ERP-20 reste une limite de couverture, non une nouvelle anomalie de code.

## Sécurité

### Réussites

- `.env`, `.env.recette`, `backend-node/.env` et `frontend/.env` sont ignorés et non suivis.
- Les Dockerfiles excluent `.env`, tests, uploads, GED, logs et sorties locales au moyen des `.dockerignore`.
- Compose exige les secrets de production par variables d'environnement ; aucune valeur opérationnelle n'a été affichée.
- Backend exécuté sous l'utilisateur non privilégié `node`; frontend sous Nginx, healthchecks présents.
- L'API de santé est volontairement publique et ne retourne qu'un état/service.
- Les six empreintes extraites du fichier d'accès ne sont retrouvées dans aucun fichier restant suivi.
- Aucun chemin `.env` réel, backup, upload, GED, `tmp`, `dist`, `ll` ou archive sensible n'est encore présent dans l'index courant.

### Échecs / réserves

- RC21-SEC-01 empêche une déclaration distribuable tant que la rotation n'est pas confirmée.
- RC21-DATA-01 empêche la remise d'un clone avec historique ; seul un export de l'arbre assaini pourrait être envisagé après rotation et revue.
- Les scripts historiques de recette contiennent des identifiants de test ou des références d'environnement ; ils ne doivent pas constituer le paquet d'exploitation NOVA.
- Une rotation des accès exposés est recommandée même si les comptes sont supposés être de démonstration.

## Dépendances, TypeScript, builds et tests

Les deux `package-lock.json` sont au format npm lockfile v3. `npm ls --depth=0` réussit dans les deux projets. Docker utilise Node 22 Bookworm et `npm ci`; les versions installées sont cohérentes avec les contraintes verrouillées.

| Contrôle ERP-21 | Résultat |
|---|---|
| Backend `npm run lint` | réussi |
| Backend `npm run build` | réussi |
| Frontend `npm run lint` | réussi |
| Frontend `npm run build` | réussi, 2 488 modules |
| Backend RBAC/Pièces/GED ciblé | 5/5 fichiers réussis |
| Frontend SAV/RBAC/Pièces ciblé | 33/33 tests réussis |
| Résolution des dépendances installées | réussie dans les deux projets |

Aucune mise à jour de dépendance et aucun audit réseau de vulnérabilités n'ont été effectués. Une analyse SCA de l'artefact nettoyé reste une action CI avant production.

## Base de données et migrations

- Baseline : `backend-node/database/baseline/001_initial_schema.sql`.
- Seed système : `backend-node/database/seeds/001_system_seed.sql`.
- Migrations courantes : 034 à 079, séquence continue, sans trou constaté.
- Le bootstrap utilise un verrou MySQL, refuse une base ambiguë/non versionnée, vérifie les checksums et journalise les étapes DDL/DML.
- Les migrations DDL partiellement appliquées bloquent la suite au lieu de prétendre à un rollback MySQL.
- MySQL 8.4 est la version Compose et runtime constatée.

Aucune migration n'a été exécutée sur les bases existantes. La reproductibilité complète sur une restauration isolée reste l'objectif ERP-22.

## Docker et Nginx

Les six conteneurs `lca` et `lca-recette` étaient `healthy` lors du contrôle. Aucun redémarrage, rebuild ou remplacement n'a été exécuté.

- Historique : frontend publié sur `3001`; backend et MySQL sur réseau privé.
- Recette : frontend `4176`, backend `3004`, MySQL `33321` en loopback.
- La dérive connue reste confirmée : le MySQL recette a été créé à partir de `docker-compose.yml` et `docker-compose.recette.yml`, contrairement au backend/frontend recette.
- La pile de production documentée ne publie que le Nginx frontend et garde backend/MySQL sur le réseau privé.

Cette dérive n'est pas corrigée pendant ERP-21. Le paquet final doit utiliser `docker-compose.yml` comme définition de production, jamais la topologie fusionnée de recette.

## GED

L'application nettoie le fichier lorsqu'une insertion contrôlée échoue et assure l'idempotence des archives métier. Elle ne possède pas de commande automatique démontrée de réconciliation après crash brutal entre écriture physique et commit SQL.

Procédure non destructive proposée :

1. Sauvegarder MySQL et le volume GED, puis vérifier les empreintes.
2. Exporter en lecture seule les `documents.file_url` commençant par `ged:` ainsi que `file_hash`, agence et identifiant.
3. Inventorier les fichiers du volume GED monté en lecture seule.
4. Normaliser les clés relatives et produire trois listes : référencés présents, métadonnées sans fichier, fichiers sans métadonnée.
5. Vérifier le SHA-256 uniquement pour les fichiers référencés, sans déplacer ni supprimer.
6. Faire valider chaque écart par un responsable métier/sécurité ; mettre les orphelins en quarantaine dans une copie isolée, jamais directement dans le volume actif.
7. Conserver rapport, date, hash et décision. Toute suppression nécessite une autorisation séparée et une sauvegarde restaurable.

## Sauvegardes et restauration

`scripts/backup.sh` couvre MySQL, uploads, GED et empreintes. `scripts/restore.sh` vérifie les empreintes, mais remplace les données des volumes nommés `lca_*` et arrête/redémarre frontend/backend : il est destructif par conception et n'a pas été exécuté.

Les sauvegardes ERP-17 couvrent MySQL, GED, uploads, images, Compose et environnement avec manifeste. La sauvegarde ERP-19 contient MySQL et configuration mais pas un jeu autonome complet GED/uploads. Les secrets sauvegardés doivent rester hors du paquet NOVA, chiffrés et à accès restreint.

ERP-22 doit tester la restauration dans un nouveau projet, sur des volumes et ports différents. Le script actuel ne doit pas être lancé tel quel pour ce test tant que ses noms de volumes/projet ne sont pas paramétrables ou qu'une procédure isolée équivalente n'est pas revue.

## Manifeste proposé de la candidate

À inclure après revue du nettoyage :

- `backend-node/src`, `assets`, `database`, `package.json`, `package-lock.json`, `tsconfig.json`, `Dockerfile`, `.dockerignore` ;
- `frontend/src`, fichiers de configuration, `nginx`, `package.json`, `package-lock.json`, `Dockerfile`, `.dockerignore` ;
- `docker-compose.yml`, `.env.example`, `deploy/`, `scripts/backup.sh`, `scripts/restore.sh` après validation ;
- `README.md`, `DEPLOYMENT.md` et dossier NOVA ;
- tests et rapports uniquement dans un paquet source interne si NOVA en a besoin.

À exclure impérativement :

- `ll/`, `frontend/src/services/accesDemo.txt`, `tmp/`, `backend-node/dist/` ;
- `.env*` réels, `backups/`, volumes, dumps, GED, uploads, images de recette ;
- `node_modules/`, `frontend/dist/`, logs et caches ;
- `frontend/bun.lock`, npm étant confirmé comme gestionnaire officiel.

## Corrections ERP-21

Aucune correction applicative. L'index est assaini au moyen de retraits `--cached` et de règles d'exclusion ; aucune donnée physique n'est supprimée. La rotation des accès et toute décision de réécriture d'historique restent au propriétaire.

## Verdict

**VERSION CANDIDATE NON PRÊTE.**

Le contenu du futur commit est assaini et les qualités fonctionnelles sont compatibles avec une RC mono-concession. La mission interdit cependant de déclarer la release distribuable sans confirmation de rotation et tant que l'historique sensible serait accessible au destinataire. La candidate pourra devenir **PRÉPARÉE SOUS RÉSERVES** après rotation confirmée, revue propriétaire du diff, choix d'un mode de distribution sans historique sensible et validation ERP-22 de restauration isolée.
