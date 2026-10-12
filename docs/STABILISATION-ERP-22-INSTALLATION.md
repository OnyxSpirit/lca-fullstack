# STABILISATION-ERP-22 — Installation propre

Date de qualification : 12 octobre 2026  
Source de l'installation : archive ERP-21 uniquement  
Projet Docker : `lca-qualification`

## Source contrôlée

- Archive : `/tmp/erp21-rc1-export.6D532o/ERP-LCA-v1.0.0-rc1-source.tar.gz`
- Manifeste : `/tmp/erp21-rc1-export.6D532o/ERP-LCA-v1.0.0-rc1-source.MANIFEST.txt`
- SHA-256 calculé : `c18616d603d0067e1c43b3dc813897b122dc53113b5010be749875e97f55a773`
- SHA-256 attendu : identique.
- Nombre de fichiers : 786, conforme à l'attendu.
- Contrôle préalable : aucun chemin absolu, aucune traversée `..`, aucun lien symbolique et aucun répertoire `.git`.
- Extraction : `/tmp/lca-qualification.2ure8Z/source`.

Le workspace de développement n'a servi ni à compléter l'archive ni à construire les images. Le fichier Compose et le fichier d'environnement propres à cette recette ont été créés dans le répertoire temporaire d'extraction et ne sont pas des composants de l'archive qualifiée.

## Configuration isolée

| Élément | Valeur de qualification |
|---|---|
| Frontend | `127.0.0.1:4301` vers le port 80 du conteneur |
| Backend | `127.0.0.1:4302` vers le port 3001 du conteneur |
| MySQL | `127.0.0.1:43306` vers le port 3306 du conteneur |
| Base | `lca_qualification` |
| Réseaux | `lca-qualification_qualification_private`, `lca-qualification_qualification_host` |
| Volume MySQL | `lca_qualification_mysql_data` |
| Volume uploads | `lca_qualification_uploads_data` |
| Volume GED | `lca_qualification_ged_data` |

Les ports ont été contrôlés libres avant le démarrage. Les secrets MySQL, JWT et administrateur ont été générés exclusivement pour cette installation, stockés dans un fichier temporaire de mode 0600 et ne sont ni reproduits ici ni enregistrés dans Git. Aucun service externe réel n'a été configuré.

## Construction

Les opérations ont été réalisées depuis les sources extraites :

- `npm ci` backend : réussi ;
- lint TypeScript backend : réussi ;
- build backend : réussi ;
- `npm ci` frontend : réussi ;
- lint TypeScript frontend : réussi ;
- build frontend : réussi, 2 488 modules transformés ;
- validation `docker compose config` : réussie ;
- construction ciblée des images backend et frontend : réussie.

Images produites :

- backend : manifeste `sha256:e6cddf605f71221026530b362e61b7fef06d2cfe6c2ce02820718b19130d7abc` ;
- frontend : manifeste `sha256:aa7545012293c34218febd01fecafce485c9e4fe006404af1a8d6d8b8cf90bca`.

## Démarrage et base fraîche

Seul le projet `lca-qualification` a été ciblé. MySQL 8.4.11 a initialisé un volume vide avec le baseline et le seed système, puis le backend a appliqué les migrations 72 à 79.

État mesuré après initialisation :

- 9 entrées dans `schema_migrations` : baseline 71 puis migrations 72 à 79 ;
- version maximale : 79 ;
- 152 tables ;
- 1 162 entrées d'index ;
- 525 contraintes de clé étrangère ;
- aucune erreur SQL ou de migration dans les journaux ;
- backend, frontend et MySQL sains, avec zéro redémarrage.

Le provisionnement a d'abord refusé l'adresse `qualification.admin@example.test`, car la validation livrée interdit toute adresse contenant le mot `example`. La configuration temporaire a été remplacée par une adresse réservée sous `.invalid`, sans modification du code ni de l'archive. Le Super Admin a ensuite été créé correctement. Avant les tests RBAC, le seul rôle présent était bien le rôle système `SUPER_ADMIN`.

## Isolation constatée

Identifiants courts observés avant et après l'installation :

| Conteneur protégé | Identifiant | État final |
|---|---:|---|
| `lca-frontend-1` | `8ba5b4b9792a` | healthy, 0 redémarrage |
| `lca-backend-1` | `4a51ed2e0913` | healthy, 0 redémarrage |
| `lca-mysql-1` | `9b37c86b3190` | healthy, 0 redémarrage |
| `lca-recette-frontend-1` | `c80eae9753b5` | healthy, 0 redémarrage |
| `lca-recette-backend-1` | `288107bcdb0f` | healthy, 0 redémarrage |
| `lca-recette-mysql-1` | `5e7de0bab86f` | healthy, 0 redémarrage |

Les identifiants sont inchangés. Aucun volume, réseau, port, conteneur ou contenu SQL de `lca` et `lca-recette` n'a été modifié.

## Observabilité

Les journaux applicatifs ne contiennent ni erreur backend/frontend ni erreur de migration. Les avertissements MySQL sont ceux du démarrage standard de l'image : phase `initialize-insecure` temporaire de l'entrypoint, certificat autosigné et emplacement du fichier PID. Le mot de passe root est ensuite configuré par l'entrypoint ; le port hôte reste lié à `127.0.0.1`.

L'environnement `lca-qualification` est volontairement laissé en fonctionnement pour la revue et la Phase 2. Aucune commande `down`, aucun nettoyage de volume et aucun déploiement n'ont été exécutés.

