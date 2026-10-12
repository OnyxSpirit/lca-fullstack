# Paquet de livraison ERP / CRM LCA

Identifiant technique : **LCA-ERP-PKG-20261012**. Cet identifiant décrit le paquet préparé le 12 octobre 2026 ; il ne constitue ni une version Git, ni un tag, ni une autorisation de déploiement.

## Statut

La référence applicative est **B — QUALIFIÉ AVEC RÉSERVES NON BLOQUANTES**. Le paquet est prêt pour une **remise contrôlée avec réserves documentées**, mais sa présence ne vaut ni autorisation de distribution ni autorisation de mise en production.

## Organisation

- `application/` : arborescence native installable, sources frontend/backend, SQL runtime, Compose, Nginx interne et scripts d'exploitation ;
- `infrastructure/` : copies de lecture des configurations Docker et Nginx et registre des images vérifiées ;
- `base-de-donnees/` : miroir de revue de la baseline, du seed système et des migrations ;
- `configuration/exemples/` : modèles uniquement, sans secret réel ;
- `documentation/guides/` : guides fonctionnels et d'exploitation historiques ;
- `documentation/references/` : preuves de correction et qualification ;
- `manifestes/` : inventaire et empreintes du paquet.

## Démarrage contrôlé

Pré requis : hôte Linux dédié, Docker Engine et Compose v2, DNS/TLS préparés, capacité minimale documentée dans `documentation/guides/03-PREREQUIS-TECHNIQUES.md`, sauvegardes externes chiffrées et accès administratifs nominatifs.

1. Vérifier `manifestes/SHA256SUMS.txt` depuis la racine extraite :

   ```bash
   sha256sum -c manifestes/SHA256SUMS.txt
   ```

2. Travailler dans `application/`, copier `../configuration/exemples/lca.env.example` vers `.env`, puis remplacer chaque valeur factice par un secret généré et stocké dans le coffre de l'exploitant. Ne jamais renvoyer ce `.env` dans le paquet ni dans Git.
3. Avant toute commande, prouver que les volumes `lca_mysql_data`, `lca_uploads_data` et `lca_ged_data` n'existent pas sur l'hôte cible, ou faire approuver une topologie dédiée. Les noms sont fixes et les scripts de sauvegarde/restauration les ciblent explicitement.
4. Valider la résolution Compose sans démarrer de service :

   ```bash
   docker compose --env-file .env -f docker-compose.yml -f docker-compose.livraison.yml config --quiet
   ```

5. Après autorisation formelle seulement, construire et démarrer avec les deux fichiers, toujours dans cet ordre :

   ```bash
   docker compose --env-file .env -f docker-compose.yml -f docker-compose.livraison.yml build
   docker compose --env-file .env -f docker-compose.yml -f docker-compose.livraison.yml up -d
   docker compose --env-file .env -f docker-compose.yml -f docker-compose.livraison.yml ps
   ```

Le premier démarrage sur une base vide charge la baseline consolidée 071 et le seed système, puis le backend applique 072 à 079. Le Super Administrateur est créé séparément après création de la concession :

```bash
docker compose --env-file .env -f docker-compose.yml -f docker-compose.livraison.yml --profile tools run --rm seed-admin
```

## HTTPS, API et Socket.IO

`application/frontend/nginx/default.conf` route `/api/`, `/uploads/` et `/socket.io/` vers le backend. `infrastructure/nginx/nginx-host.conf.example` est le modèle de terminaison TLS validé localement : remplacer le domaine fictif, monter les certificats réels en lecture seule, forcer la redirection HTTP→HTTPS, tester TLS 1.2/1.3, HSTS, WebSocket et l'adresse client transmise. Aucun certificat n'est livré. La validation avec l'infrastructure de production reste à faire.

## Persistance, sauvegarde et restauration

Les données persistantes sont MySQL, les uploads et la GED. Le script `application/scripts/backup.sh` sauvegarde les trois ensembles et produit des SHA-256. Utiliser `COMPOSE_FILE=docker-compose.yml:docker-compose.livraison.yml` si nécessaire. Le script `restore.sh` est destructif, cible les volumes `lca_*`, arrête temporairement l'application et ne doit être exécuté que sur une cible vide ou explicitement approuvée, après contrôle des empreintes. La restauration avec volumétrie représentative et les RPO/RTO restent à qualifier.

## Contrôles après installation

- tous les services sont `healthy` ;
- `/healthz` et `/api/health` répondent ;
- connexion Super Administrateur et rotation du mot de passe initial ;
- accès API, téléchargement GED/PDF et révocation de session ;
- WebSocket à travers le proxy TLS ;
- journal `schema_migrations` terminé à 079 ;
- sauvegarde externalisée, puis exercice de restauration sur cible isolée ;
- vérification des rôles, scopes, concessions/agences et logs d'audit.

## Sécurité et maintenance

Conserver les secrets hors fichiers versionnés, limiter les ports exposés, filtrer l'administration, superviser capacité, healthchecks, logs, certificats et sauvegardes, appliquer les mises à jour par campagne contrôlée et requalifier toute modification d'image, de migration, de proxy ou de workflow. Les images Node, MySQL et Nginx du profil de livraison sont épinglées ; l'image utilitaire `alpine:3.21` des scripts de sauvegarde reste une référence par tag et doit être revue selon la politique de l'exploitant.

## Réserves à ne pas masquer

- AUD-LCA-013 : pas de timeout SQL métier généralisé par requête ;
- AUD-LCA-014 : téléversements GED encore bufferisés en mémoire ;
- AUD-LCA-024 : traitée dans ce paquet pour Node/MySQL/Nginx par digests vérifiés, sans SBOM ni signature d'éditeur du paquet ;
- TLS/DNS/certificats réels, volumétrie de restauration, multi-concession et profils réels à valider sur l'infrastructure cible ;
- scripts backup/restore et volumes nommés liés à la topologie `lca_*` ;
- aucun secret, certificat privé, dump, sauvegarde réelle, `.git`, `node_modules` ou cache n'est volontairement inclus.

Les responsabilités détaillées, conditions de transfert et réserves sont dans les guides 03 à 12. En cas d'écart, arrêter l'installation, préserver les preuves et faire arbitrer par les responsables sécurité, exploitation et métier.
