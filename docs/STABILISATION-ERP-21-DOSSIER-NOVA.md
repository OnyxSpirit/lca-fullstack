# Dossier technique NOVA — ERP LCA v1.0.0-rc1 proposée

Statut : **dossier préparatoire — version non encore figée ni validée pour production**

Périmètre qualifié : exploitation mono-concession, multi-agences.

## 1. Présentation et périmètre fonctionnel

LCA est un ERP/CRM automobile couvrant CRM/prospection, clients 360, stock VN/VO, ventes, livraisons, facturation/encaissements, SAV/Atelier, Pièces, Showroom, RH/administration, notifications, paramètres, GED, reporting et utilisateurs/RBAC.

La candidate envisagée capitalise sur ERP-01 à ERP-20. Son arbre courant est assaini des copies, archives, accès et artefacts identifiés, mais elle n'est pas encore le livrable final : rotation des accès et mode de distribution excluant l'historique sensible doivent être confirmés avant création du tag.

## 2. Architecture technique

- Frontend : React 19, Vite, TypeScript, TanStack Query et Socket.IO Client, servi par Nginx.
- Backend : Node.js 22, Express 5, TypeScript, JWT et Socket.IO.
- Données : MySQL 8.4.
- Stockages persistants : MySQL, uploads et GED dans trois volumes séparés.
- Réseau : seul Nginx publie le port HTTP ; backend et MySQL restent privés.
- Autorisations : permissions dynamiques avec scopes OWN, AGENCY, CONCESSION et GLOBAL.

## 3. Prérequis serveur

- Linux supporté par Docker Engine et le plugin Docker Compose v2.
- DNS et certificats TLS pour la production.
- Stockage dimensionné pour MySQL, GED, uploads, images Docker et sauvegardes hors hôte.
- Synchronisation horaire, supervision disque/CPU/RAM, rotation des logs et alertes healthcheck.
- Accès restreint au fichier d'environnement et aux sauvegardes.
- Ports publics 80/443 uniquement ; ni 3001 ni 3306 exposés sur Internet.

## 4. Variables d'environnement

Partir de `.env.example`, ne jamais réutiliser un `.env` de recette. Les catégories requises sont :

- identité Compose et base : `COMPOSE_PROJECT_NAME`, `MYSQL_DATABASE`, `MYSQL_USER`, mots de passe MySQL ;
- sécurité : secrets JWT distincts, durées de jetons et paramètres de limitation d'authentification ;
- origine/proxy : `FRONTEND_URL`, adresse/port HTTP et nombre exact de proxies ;
- provisioning initial : e-mail et mot de passe administrateur, à retirer après utilisation ;
- capacité : taille du pool DB.

Les valeurs sont fournies par le coffre de secrets NOVA. Elles ne doivent apparaître ni dans Git, ni dans une image, ni dans le dossier de livraison.

## 5. Installation initiale

À exécuter uniquement depuis le commit/tag nettoyé et approuvé :

```bash
cp .env.example .env
chmod 600 .env
# Renseigner les valeurs depuis le coffre de secrets.
docker compose config --quiet
docker compose build
docker compose up -d
docker compose ps
docker compose logs --tail=100 mysql backend frontend
curl --fail http://127.0.0.1/healthz
curl --fail http://127.0.0.1/api/health
docker compose --profile tools run --rm seed-admin
```

Après provisioning, retirer `ADMIN_PASSWORD` de `.env`. Ne jamais rejouer le baseline sur une base existante non vide.

## 6. Déploiement d'une mise à jour

1. Identifier le commit/tag déployé et vérifier la candidate signée.
2. Réaliser une sauvegarde complète et externalisée.
3. Vérifier `docker compose config --quiet`.
4. Construire les images depuis le tag, idéalement dans la CI, et conserver leurs digests.
5. Appliquer la mise à jour pendant une fenêtre approuvée.
6. Observer le bootstrap de migrations ; arrêter immédiatement sur `DATABASE_AMBIGUOUS`, `MIGRATION_CHECKSUM_MISMATCH` ou `MIGRATION_FAILED_PARTIAL`.
7. Exécuter les contrôles post-déploiement.

La procédure actuelle de référence est dans `DEPLOYMENT.md`. La configuration fusionnée de `lca-recette` n'est pas un modèle de production.

## 7. Sauvegarde

La sauvegarde doit réunir un même point de reprise :

- dump MySQL transactionnel avec routines, triggers et événements ;
- archives des volumes GED et uploads ;
- empreintes SHA-256 ;
- version Git et digests des images ;
- Compose, Nginx et liste des noms de variables nécessaires ;
- secrets exportés séparément depuis le coffre, jamais dans le paquet courant.

Commande existante :

```bash
./scripts/backup.sh /chemin/externe/horodate
```

Copier le résultat hors du serveur, chiffrer et tester périodiquement la restauration.

## 8. Restauration

Le script actuel remplace les données et les volumes `lca_*`. Il ne doit être lancé qu'après sauvegarde, validation du chemin et fenêtre d'incident :

```bash
./scripts/restore.sh /chemin/vers/sauvegarde --confirm
docker compose ps
docker compose logs --tail=100 backend
curl --fail http://127.0.0.1/api/health
```

Avant production, ERP-22 doit éprouver cette procédure sur une infrastructure isolée. Pour ce test, utiliser des volumes, un projet et des ports distincts ; ne jamais cibler `lca` ou `lca-recette`.

## 9. Retour arrière

- Applicatif sans migration incompatible : redéployer les digests précédents et vérifier la santé.
- Avec migration incompatible ou corruption : arrêter les écritures, conserver une sauvegarde de l'état incident, puis restaurer ensemble MySQL, GED et uploads depuis le même point.
- Ne jamais « annuler » uniquement le code lorsque le schéma exige la nouvelle version.
- Ne jamais utiliser la suppression de volumes comme procédure de rollback.

Le retour arrière doit être testé sur l'environnement ERP-22 avant approbation production.

## 10. Vérifications post-déploiement

- `docker compose ps` : trois services healthy.
- `/healthz` et `/api/health` : HTTP 200.
- Authentification et renouvellement de session.
- Permissions/scopes avec au moins un profil administrateur et des profils métier limités.
- CRM/client, stock véhicule, vente/facture/paiement/livraison.
- OR Atelier et file Pièces, y compris refus sans permission.
- Création/aperçu/téléchargement GED et cohérence du hash.
- Notifications et handshake Socket.IO.
- `schema_migrations` au niveau attendu, aucune étape `RUNNING`/`FAILED_PARTIAL`.
- Logs sans secret ni erreur répétée ; espace disque et sauvegarde programmée.

## 11. Exploitation GED

Exécuter périodiquement un rapprochement en lecture seule entre `documents.file_url` et le volume GED. Ne jamais supprimer automatiquement un fichier sans métadonnée. En cas d'écart : sauvegarder, documenter, vérifier le hash et l'origine, puis décider en comité habilité d'une quarantaine ou d'une restauration.

## 12. Limitations et réserves acceptées

- Qualification actuelle limitée à une concession ; l'ouverture multi-concession exige une preuve isolée supplémentaire.
- Fenêtre rare possible d'orphelin GED après crash brutal.
- Le rate-limit d'authentification est en mémoire et doit devenir partagé avant déploiement horizontal.
- Une socket déjà établie n'est pas révoquée instantanément lors de la révocation d'une session.
- Restore drill et recette NOVA restent à effectuer en ERP-22.
- Les identifiants/données ont été retirés de l'index courant, mais les accès doivent être renouvelés et l'historique ne doit pas être remis sans traitement explicite.

## 13. Conditions d'exploitation

- Secrets dans un coffre, rotation documentée et accès minimal.
- Sauvegardes automatisées, chiffrées, externalisées et restaurations testées.
- Supervision des healthchecks, erreurs, capacité DB et volumes de fichiers.
- Changements de rôles/permissions exclusivement via la gouvernance dynamique.
- Aucun port MySQL/backend public.
- Procédure d'incident et propriétaires nommés pour sécurité, DB, GED et métier.

## 14. Critères d'acceptation NOVA

NOVA pourra accepter la candidate après :

1. revue et commit du nettoyage déjà préparé ;
2. rotation confirmée des accès exposés ;
3. export de l'arbre assaini ou traitement autorisé de l'historique avant remise ;
4. commit/tag reproductible créés par le propriétaire ;
5. images construites depuis ce tag avec digests conservés ;
6. restauration ERP-22 réussie en isolation ;
7. recette post-déploiement et acceptation explicite des réserves.

Ce dossier ne constitue ni un déploiement, ni une validation de production.

## 15. Mode de remise source sécurisé

La remise ne doit pas prendre la forme d'un clone, bundle ou miroir Git tant que l'historique sensible n'a pas fait l'objet d'une décision autorisée. ERP-21 Phase 3 prépare à la place une archive de l'arbre assaini :

- nom : `ERP-LCA-v1.0.0-rc1-source.tar.gz` ;
- source : index Git assaini non commité et liste blanche contrôlée ;
- contenu : 786 fichiers, sans `.git` ;
- accompagnement : manifeste externe indiquant SHA-256, référence source, contrôles et réserves.

Le destinataire doit recalculer SHA-256 avant ouverture. Cette empreinte détecte une altération accidentelle ou un fichier différent, mais ne prouve pas l'identité de l'émetteur. Une signature numérique doit être produite séparément par une identité NOVA/propriétaire autorisée si la chaîne de livraison l'exige.

La présence d'une archive techniquement qualifiée ne vaut pas autorisation de distribution. La rotation/révocation des accès historiquement exposés et l'approbation du propriétaire restent obligatoires.
