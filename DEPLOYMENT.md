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
Le Compose actuel exige également `ADMIN_EMAIL` et `ADMIN_PASSWORD` dès la
résolution, même si le service `seed-admin` appartient au profil `tools`. Les
valeurs `replace_with...` de `.env.example` sont volontairement invalides et
refusées par le provisioning.

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
migrations `034+` absentes. Le provisioning initial exige une adresse valide
explicitement fournie et un mot de passe d’au moins 12 caractères qui ne soit
ni trivial, ni une valeur d’exemple/défaut, ni identique à l’adresse ou à sa
partie locale. Après création, retirez `ADMIN_PASSWORD` du fichier `.env`.

Le seed est transactionnel. Un rerun normal avec le même `ADMIN_EMAIL` vérifie
que le compte est déjà relié au véritable rôle `SUPER_ADMIN` système, puis ne
modifie ni son hash, ni son identité, ni son état. Une adresse appartenant à un
utilisateur ordinaire est refusée et n’est jamais promue. Si un autre Super
Admin système existe déjà, la création d’un second compte est refusée.

Une rotation via cet outil reste possible uniquement avec le signal exact
`ADMIN_ROTATE_PASSWORD=true` et un nouveau mot de passe conforme :

```bash
ADMIN_ROTATE_PASSWORD=true docker compose --profile tools run --rm seed-admin
```

Toute autre valeur que `true` ou `false` est rejetée. Sans ce signal, y compris
si `ADMIN_PASSWORD` change, le hash existant reste inchangé. La rotation révoque
les jetons de rafraîchissement actifs sans modifier l’identité du compte.

Ne publiez pas les ports 3001 et 3306 sur Internet.

### Proxy et limitation des authentifications

Le backend n'est accessible que par le réseau Docker privé. `TRUST_PROXY_HOPS`
doit décrire exactement le chemin vers Express : `1` avec le seul Nginx du
conteneur frontend, `2` lorsqu'un Nginx hôte tel que
`deploy/nginx-host.conf.example` se trouve devant lui, et `0` en développement
local sans proxy. N'utilisez jamais une confiance proxy globale. Chaque Nginx
ajoute l'adresse observée à `X-Forwarded-For`; Express sélectionne ainsi
l'adresse du client à la distance configurée, sans accepter comme clé une
valeur placée arbitrairement à gauche par le client. Le port backend ne doit
jamais être publié directement.

`POST /api/auth/login` est limité par couple adresse IP + e-mail normalisé et
haché, avec un plafond IP plus large pour bloquer la rotation d'identifiants
sans pénaliser trop vite un réseau NAT. `POST /api/auth/refresh` possède un
quota IP séparé. Les fenêtres et plafonds sont réglables avec les variables
`AUTH_*_RATE_LIMIT_*`; une réponse bloquée vaut `429`, expose les en-têtes
standards `RateLimit`/`Retry-After` et ne journalise ni mot de passe, ni jeton,
ni e-mail brut.

Le stockage des compteurs est volontairement en mémoire : il est propre à
chaque processus et remis à zéro lors d'un redémarrage. Avant tout déploiement
horizontal, remplacez-le par un store partagé compatible (par exemple Redis),
sans quoi chaque instance appliquera son propre quota.

### Révocation des sessions JWT

Chaque connexion possède un `sid` UUID correspondant à la clé primaire de sa
ligne `refresh_tokens`. L'access token et le refresh token portent ce `sid` ;
le `jti` du refresh change à chaque rotation. Le middleware vérifie dans sa
requête utilisateur existante que cette session est active. Un logout révoque
uniquement ce `sid`, de sorte que les autres appareils du même utilisateur
restent connectés. La désactivation, le changement d'adresse ou de mot de passe
continuent à révoquer toutes les sessions concernées.

Le déploiement refuse volontairement les anciens access tokens dépourvus de
`sid`. Un client possédant encore un refresh token actif récupère une session
compatible par le mécanisme single-flight normal ; sinon il doit se reconnecter.
Cette évolution ne nécessite aucune migration : la table et ses index existent
déjà. Elle n'ajoute pas de requête SQL par appel authentifié, mais ajoute une
jointure par clé primaire à la vérification utilisateur existante.

Une nouvelle connexion Socket.IO vérifie également la session. Le frontend
coopératif ferme sa socket lors du logout. Une socket déjà établie par un client
malveillant n'est toutefois pas réévaluée en continu ; une révocation temps réel
par socket/session demanderait un registre de rooms par `sid` ou une validation
périodique distincte.

### Cohérence des images véhicule

La création catalogue et l'ajout de photos utilisent un protocole compensé,
pas une prétendue transaction distribuée MySQL/filesystem : validation des
magic bytes, écriture dans `/app/uploads/vehicles/.staging`, transaction SQL,
insertion des métadonnées, création atomique des destinations par hard-link,
puis commit. Staging et destinations appartiennent donc au même volume
`lca_uploads_data`. Une erreur SQL, une finalisation incomplète ou un échec de
commit déclenche la suppression des fichiers appartenant au lot et le rollback
SQL. Les noms finaux sont des UUID générés par le serveur et une destination
existante n'est jamais écrasée.

Les opérations concurrentes sur les images d'un même véhicule prennent un
verrou sur sa ligne. Une suppression valide d'abord et commit la DB, puis tente
la suppression physique : une panne laisse ainsi au pire un fichier orphelin,
jamais une nouvelle référence vers un fichier absent. Cet incident est
journalisé avec l'identifiant véhicule/image et doit être repris manuellement.
Les fichiers de staging abandonnés par un arrêt brutal sont nettoyés au
démarrage après 24 heures. Aucun fichier historique ni orphelin final n'est
supprimé automatiquement ; leur inventaire relève d'un audit séparé en lecture
seule.

### Identité client

L’identité d’un client est propre à une agence : l’e-mail normalisé et le
téléphone normalisé sont chacun uniques par `agency_id`. E-mail et téléphone
restent individuellement optionnels (`NULL` est conservé). Le téléphone perd
uniquement ses caractères de présentation ; aucune conversion automatique
entre forme nationale et internationale n’est effectuée. MySQL est l’autorité
finale. La conversion d’un prospect réutilise un client non ambigu de la même
agence et refuse le cas où l’e-mail et le téléphone désignent deux clients.

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

Le bootstrap lit `schema_migrations` et exécute les migrations SQL `034+`
absentes dans l’ordre numérique. Un verrou MySQL dédié empêche deux instances
de migrer simultanément. Les instructions DDL sont journalisées séparément car
MySQL les valide implicitement : le runner ne prétend pas qu’un `ROLLBACK`
annule un DDL. Les instructions DML restent exécutées avec leur mise à jour de
journal dans une transaction.

Après une interruption, une étape DDL restée `RUNNING` est reprise uniquement
si ses objets structurels prouvent que l’instruction atomique MySQL est déjà
terminée ; elle est alors marquée `RECOVERED`. Une étape incohérente ou un DDL
échoué devient `FAILED_PARTIAL` et bloque les migrations suivantes. Dans ce
cas, sauvegardez la base, inspectez `schema_migration_steps` et le schéma réel,
puis faites valider la réparation avant toute modification du journal. Ne
marquez jamais manuellement une migration comme appliquée sans postconditions
vérifiées. Ne lancez pas les migrateurs historiques ciblés lors d’une mise à
jour normale.

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
