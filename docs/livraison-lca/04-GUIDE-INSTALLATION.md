# Guide d'installation indépendante

## Avant de commencer

Utiliser exclusivement l'archive approuvée, sans historique Git. À la date du dossier, RC2 est techniquement qualifiée mais sa distribution n'est pas autorisée. Les commandes ci-dessous s'appliquent après levée des réserves et remise autorisée.

## Contrôle du paquet

```bash
sha256sum ERP-LCA-v1.0.0-rc2-source.tar.gz
# attendu : 31e3f8cd13a8826c1eca756e16674e6830b17b8f063c548ac6d05d9ea8b177a6
tar -tzf ERP-LCA-v1.0.0-rc2-source.tar.gz | less
mkdir ERP-LCA-v1.0.0-rc2
tar -xzf ERP-LCA-v1.0.0-rc2-source.tar.gz -C ERP-LCA-v1.0.0-rc2 --strip-components=1
cd ERP-LCA-v1.0.0-rc2
```

Arrêter si l'empreinte diffère, si un chemin absolu/traversant apparaît ou si le paquet contient `.git`, `.env`, données, GED, uploads ou sauvegardes.

## Configuration et démarrage

```bash
cp .env.example .env
chmod 600 .env
# Renseigner les valeurs via le coffre, sans les mettre dans l'historique shell.
docker compose config --quiet
docker compose build
docker compose up -d
docker compose ps
docker compose logs --tail=100 mysql backend frontend
curl --fail http://127.0.0.1/healthz
curl --fail http://127.0.0.1/api/health
docker compose --profile tools run --rm seed-admin
```

Le premier démarrage sur volume vide initialise MySQL, applique baseline/seed/migrations, puis démarre Express et Nginx. Après le seed, retirer `ADMIN_PASSWORD` du fichier d'environnement selon la procédure d'exploitation, sans casser les variables exigées lors d'une future résolution Compose.

## Validation minimale

Vérifier trois services `healthy`, niveau de migration 79, connexion du Super Administrateur, changement/rotation contrôlée du secret initial, création d'un rôle limité, refus 403 attendu, consultation des modules autorisés, dépôt/téléchargement GED fictif, Socket.IO et journaux sans erreur répétée.

## Diagnostic

- `MYSQL_* requis` ou `JWT_* requis` : `.env` incomplet ;
- `DATABASE_AMBIGUOUS` : base non vide sans journal, ne rien forcer ;
- `MIGRATION_CHECKSUM_MISMATCH` ou `FAILED_PARTIAL` : arrêter et contre-auditer ;
- backend non sain : vérifier MySQL, variables, migrations et permissions volumes ;
- frontend sain mais API inaccessible : vérifier Nginx, réseau privé et origine ;
- Socket.IO en échec : vérifier upgrade WebSocket, path `/socket.io` et proxy.

Ne jamais utiliser `docker compose down -v` sur une installation à préserver.

