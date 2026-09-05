# Déploiement LCA sur un VPS Ubuntu

## Architecture

La pile de production utilise `frontend` (Nginx + React compilé), `backend` (Express compilé), et MySQL 8.4. Seul le frontend publie un port. Il reverse-proxy `/api`, `/uploads` et `/socket.io` vers Express. MySQL et Express restent sur un réseau Docker interne.

Le dossier historique `backend/` n'est jamais construit. Ses fichiers SQL restent la source du schéma initial et des migrations existantes.

## 1. Installation et clonage

Docker et Compose étant déjà installés :

```bash
git clone URL_DU_DEPOT lca
cd lca
cp .env.example .env
chmod 600 .env
```

## 2. Secrets et environnement

Générez des valeurs distinctes :

```bash
openssl rand -base64 48
openssl rand -base64 48
openssl rand -base64 36
openssl rand -base64 36
```

Renseignez `.env` sans conserver les valeurs `replace_with...`. Gardez obligatoirement `MYSQL_DATABASE=concession_erp`, car le schéma historique sélectionne explicitement cette base. Utilisez un compte applicatif non-root dans `MYSQL_USER`. Pour le premier essai par IP, affectez `FRONTEND_URL=http://IP_DU_VPS`, sans écrire cette IP dans le code.

Vérifiez avant lancement :

```bash
docker compose config --quiet
```

## 3. Première installation

Les scripts montés dans `/docker-entrypoint-initdb.d` ne s'exécutent que lorsque `lca_mysql_data` est vide. Le schéma consolidé intègre les migrations 003 à 016, mais pas la table de jetons 001, la normalisation globale 002 ni la configuration 017 ; celles-ci sont appliquées dans cet ordre, avant la migration Sales Express. `schema.sql` est destructif s'il est rejoué manuellement : ne l'exécutez jamais sur une base existante.

```bash
docker compose build
docker compose up -d
docker compose ps
docker compose logs --tail=100 mysql backend frontend
curl -i http://127.0.0.1/healthz
curl -i http://127.0.0.1/api/health
```

Créez ensuite l'administrateur initial :

```bash
docker compose --profile tools run --rm seed-admin
```

Après cette commande, retirez `ADMIN_PASSWORD` de `.env` ou remplacez-le par une valeur aléatoire non utilisée.

Depuis un autre poste, testez `http://IP_DU_VPS`. Le pare-feu doit autoriser temporairement 80, puis 443. Ne publiez jamais 3001 ou 3306.

## 4. Commandes courantes

```bash
docker compose ps
docker compose logs -f --tail=200 backend
docker compose restart backend
docker compose stop
docker compose up -d
docker compose down
```

`docker compose down` conserve les volumes. N'utilisez jamais `docker compose down -v` sur un serveur contenant des données.

## 5. Mise à jour depuis GitHub

Sauvegardez avant chaque mise à jour :

```bash
./scripts/backup.sh
git pull --ff-only
docker compose config --quiet
docker compose build --pull
docker compose up -d --remove-orphans
docker compose ps
curl --fail http://127.0.0.1/api/health
```

Les fichiers SQL d'initialisation ne migrent pas un volume existant. Pour une nouvelle migration, examinez le fichier, sauvegardez, puis appliquez uniquement la migration concernée :

```bash
docker compose exec -T mysql sh -c 'MYSQL_PWD="$MYSQL_PASSWORD" mysql -u"$MYSQL_USER" "$MYSQL_DATABASE"' < chemin/migration.sql
```

Ne rejouez ni `schema.sql`, ni `all_migrations.sql` sur une base déjà initialisée.

## 6. Sauvegarde et restauration

Sauvegarde cohérente MySQL + fichiers :

```bash
chmod +x scripts/backup.sh scripts/restore.sh
./scripts/backup.sh
```

Copiez régulièrement `backups/` vers un stockage hors VPS. Une sauvegarde laissée sur le même disque ne protège pas d'une panne du serveur.

La restauration est volontairement manuelle et destructive :

```bash
./scripts/backup.sh
./scripts/restore.sh /chemin/vers/backups/AAAAmmjjTHHMMSSZ --confirm
docker compose ps
docker compose logs --tail=100 backend
```

## 7. DNS et HTTPS

Créez un enregistrement DNS A (et AAAA si utilisé) de `erp.domaine-client.tld` vers le VPS. Installez ensuite Nginx et Certbot sur l'hôte :

```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
```

Modifiez `.env` :

```env
FRONTEND_URL=https://erp.domaine-client.tld
HTTP_BIND_ADDRESS=127.0.0.1
HTTP_PORT=8080
```

Relancez la pile, copiez l'exemple puis remplacez le domaine :

```bash
docker compose up -d
sudo cp deploy/nginx-host.conf.example /etc/nginx/sites-available/lca
sudo editor /etc/nginx/sites-available/lca
sudo ln -s /etc/nginx/sites-available/lca /etc/nginx/sites-enabled/lca
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d erp.domaine-client.tld
```

Certbot modifie la configuration de l'hôte et installe les vrais certificats hors Git. Vérifiez le renouvellement avec `sudo certbot renew --dry-run`.

## 8. Diagnostic Socket.IO

Le path Engine.IO réel est `/socket.io` et le namespace applicatif est `/realtime`. Vérifiez d'abord le transport HTTP :

```bash
curl -i 'https://erp.domaine-client.tld/socket.io/?EIO=4&transport=polling'
docker compose logs --tail=200 frontend backend
```

Une réponse Engine.IO confirme le proxy initial. La connexion au namespace nécessite ensuite un JWT valide dans `auth.token`. Le proxy Nginx transmet `Upgrade`, `Connection` et utilise HTTP/1.1.

## 9. Pare-feu

Avec SSH déjà autorisé :

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw status
```

Les ports 3001 et 3306 ne doivent pas apparaître dans les règles publiques. Contrôlez aussi avec `docker compose ps` et `ss -ltnp`.

## 10. Rollback

Avant mise à jour, notez le commit courant : `git rev-parse HEAD`. En cas d'échec :

```bash
git checkout COMMIT_PRECEDENT
docker compose build
docker compose up -d --remove-orphans
```

Un rollback de code ne rétrograde pas automatiquement la base. Si une migration incompatible a été appliquée, restaurez explicitement la sauvegarde correspondante après analyse. N'utilisez pas `git reset --hard` pour cette procédure.

## 11. Contrôles de production

```bash
docker compose config --quiet
docker compose ps
docker inspect --format '{{json .State.Health}}' lca-backend-1
curl --fail https://erp.domaine-client.tld/healthz
curl --fail https://erp.domaine-client.tld/api/health
docker system df
```

Les logs utilisent une rotation `json-file` (5 fichiers de 10 Mo par service). Les limites mémoire sont adaptées au VPS 4 Go : MySQL 1,5 Go, backend 768 Mo et frontend 128 Mo.
