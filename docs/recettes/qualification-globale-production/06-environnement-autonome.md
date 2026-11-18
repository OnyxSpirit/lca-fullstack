# Environnement autonome

Fichiers : `docker-compose.codex-qualification.yml`, `.env.codex-qualification.example` et `frontend/nginx/qualification.conf`.

Copier l'exemple vers un fichier local non suivi, générer tous les secrets (les deux clés de chiffrement sont des clés de 32 octets encodées en Base64), puis lancer :

```bash
docker compose -p lca-codex-qualification --env-file .env.codex-qualification -f docker-compose.codex-qualification.yml up -d --build
```

Interface : `http://127.0.0.1:38080`; MySQL local optionnel : `127.0.0.1:33306`. Les volumes MySQL, GED et uploads sont dédiés. Le compte administrateur est créé par `seed-admin` et exige l'enrôlement 2FA normal.

Le paramètre `-p lca-codex-qualification` est obligatoire : le `.env` historique du dépôt définit `COMPOSE_PROJECT_NAME` et peut sinon rattacher par erreur ces services au projet usuel. La recette vérifiée expose trois conteneurs `healthy` préfixés `lca-codex-qualification-` et l'endpoint `/api/health` répond `200`.

Réinitialisation destructive autorisée uniquement pour cet environnement jetable : arrêter avec le même `-p`, puis supprimer ses volumes explicitement après vérification des noms. Ne jamais employer `--remove-orphans`, car le dossier peut contenir les services habituels de l'utilisateur.
