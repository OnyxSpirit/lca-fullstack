# Déploiement LCA sur un VPS Ubuntu

La pile officielle contient MySQL 8.4, `backend-node/` compilé et le frontend
React servi par Nginx. Seul Nginx publie un port ; `/api`, `/uploads` et
`/socket.io` sont relayés vers Express sur le réseau Docker privé.

## 1. Préparer l’environnement

```bash
git clone URL_DU_DEPOT lca
cd lca
cp .env.example .env
chmod 600 .env
```

Remplacez toutes les valeurs `replace_with...`. Utilisez deux secrets JWT
distincts et un compte MySQL applicatif non-root. `MYSQL_DATABASE` peut être
configuré, mais une installation existante doit conserver son nom réel.
`FRONTEND_URL` doit être l’origine publique exacte, sans chemin `/api`.

```bash
openssl rand -base64 48
docker compose config --quiet
```

Cette validation échoue volontairement si une variable obligatoire n’est pas
renseignée. `MYSQL_DATABASE requis`, `MYSQL_PASSWORD requis`,
`JWT_ACCESS_SECRET requis` ou `FRONTEND_URL requis` signalent un `.env`
incomplet, pas nécessairement une panne de Docker Compose.
Le Compose actuel exige également `ADMIN_PASSWORD` dès la résolution, même si
le service `seed-admin` appartient au profil `tools`.

Le fichier `.env` racine alimente Docker. `backend-node/.env` et
`frontend/.env` servent uniquement aux exécutions locales hors Docker.

## 2. Nouvelle installation

```bash
docker compose build
docker compose up -d
docker compose ps
docker compose logs --tail=100 mysql backend frontend
curl --fail http://127.0.0.1/healthz
curl --fail http://127.0.0.1/api/health
docker compose --profile tools run --rm seed-admin
```

Sur un volume MySQL vide, l’image MySQL applique le baseline et le seed. Au
démarrage, le backend exécute aussi son bootstrap idempotent et applique les
migrations `034+` absentes. Après le seed administrateur, retirez
`ADMIN_PASSWORD` du fichier `.env` ou remplacez-le par une valeur inutilisée.
Le mot de passe doit contenir au moins 12 caractères. Le seed est
transactionnel et idempotent pour l’e-mail demandé : il crée ou réutilise la
structure initiale, remplace le hash, réactive le compte et rattache le rôle
système persistant `SUPER_ADMIN`.

Ne publiez pas les ports 3001 et 3306 sur Internet.

## 3. Mise à jour d’une production versionnée

```bash
./scripts/backup.sh
git pull --ff-only
docker compose config --quiet
docker compose build --pull
docker compose up -d --remove-orphans
docker compose ps
docker compose logs --tail=200 backend
curl --fail http://127.0.0.1/api/health
```

Le bootstrap lit `schema_migrations` et exécute transactionnellement les
migrations SQL `034+` absentes dans l’ordre numérique. Ne lancez pas les
migrateurs historiques ciblés lors d’une mise à jour normale.

Si une ancienne production est non vide mais ne possède pas
`schema_migrations`, le backend s’arrête sans écrire. Sauvegardez, comparez le
schéma réel au baseline, puis marquez manuellement le niveau 033 uniquement
après contre-audit. N’inventez pas cette ligne et ne rejouez pas le baseline.

Le runner refuse une base versionnée sous 033 avec
`DATABASE_VERSION_UNSUPPORTED` et une base non vide sans historique avec
`DATABASE_AMBIGUOUS`. Dans les deux cas, il n’effectue aucune reconstruction
automatique.

Chaque nouvelle évolution porte un nom tel que
`backend-node/database/migrations/034_description.sql`, puis 035, 036, sans
trou ni doublon. Elle doit être additive ou accompagnée d’une procédure de
rollback et testée sur une copie récente de production.

## 4. Sauvegarde et restauration

```bash
chmod +x scripts/backup.sh scripts/restore.sh
./scripts/backup.sh
```

La sauvegarde contient `mysql.sql`, `uploads.tar.gz`, `ged.tar.gz` et leurs
empreintes `SHA256SUMS`. Copiez le dossier résultant hors du VPS.

La restauration remplace les données courantes :

```bash
./scripts/backup.sh
./scripts/restore.sh /chemin/vers/la/sauvegarde --confirm
docker compose ps
docker compose logs --tail=100 backend
curl --fail http://127.0.0.1/api/health
```

Le script vérifie les empreintes, arrête frontend/backend, restaure MySQL et
les deux volumes de fichiers, puis relance les services. Testez régulièrement
cette procédure sur une infrastructure isolée.

## 5. GED et médias

Les volumes nommés sont :

- `lca_mysql_data` : base ;
- `lca_uploads_data` : images et médias accessibles via `/uploads` ;
- `lca_ged_data` : fichiers GED servis uniquement par les routes autorisées.

`docker compose down` les conserve. N’exécutez jamais `docker compose down -v`
sur une installation à préserver.

## 6. DNS et HTTPS

Créez l’enregistrement DNS du domaine vers le VPS. Pour placer un Nginx hôte
devant la pile :

```env
FRONTEND_URL=https://erp.domaine-client.tld
HTTP_BIND_ADDRESS=127.0.0.1
HTTP_PORT=8080
```

```bash
docker compose up -d
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
sudo cp deploy/nginx-host.conf.example /etc/nginx/sites-available/lca
sudo editor /etc/nginx/sites-available/lca
sudo ln -s /etc/nginx/sites-available/lca /etc/nginx/sites-enabled/lca
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d erp.domaine-client.tld
sudo certbot renew --dry-run
```

L’exemple hôte relaie toute la connexion vers le Nginx Docker. Celui-ci gère
le fallback SPA et les proxies internes. Le path Engine.IO est `/socket.io` et
le namespace applicatif `/realtime` :

```bash
curl -i 'https://erp.domaine-client.tld/socket.io/?EIO=4&transport=polling'
docker compose logs --tail=200 frontend backend
```

Le handshake du namespace exige ensuite un JWT dans `auth.token`. Les en-têtes
`Upgrade` et `Connection` doivent traverser les deux proxies.

## 7. Exploitation et rollback

```bash
docker compose ps
docker compose logs -f --tail=200 backend
docker compose restart backend
docker system df
```

Avant une mise à jour, notez `git rev-parse HEAD`. Pour revenir au code
précédent, replacez le checkout sur le commit validé puis reconstruisez. Un
rollback de code ne rétrograde jamais la base : restaurez la sauvegarde
correspondante si une migration incompatible doit être annulée.

Les ports publics recommandés sont 80/443 uniquement. Les logs Docker sont
tournants (5 fichiers de 10 Mo par service). Vérifiez espace disque,
healthchecks, expiration TLS, sauvegardes externes et restauration testée.
