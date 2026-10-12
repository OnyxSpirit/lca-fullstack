# Guide de configuration

## Variables de production

| Groupe | Variables principales | Règle |
|---|---|---|
| Compose/Base | `COMPOSE_PROJECT_NAME`, `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD`, `DB_POOL_SIZE` | valeurs propres à l'installation |
| JWT | `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_TTL`, `JWT_REFRESH_TTL` | secrets distincts, jamais dans Git |
| Proxy | `FRONTEND_URL`, `HTTP_BIND_ADDRESS`, `HTTP_PORT`, `TRUST_PROXY_HOPS` | refléter la chaîne réseau réelle |
| Limitation | `AUTH_LOGIN_*`, `AUTH_REFRESH_*` | calibrer et superviser |
| Bootstrap | `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_ROTATE_PASSWORD` | usage initial/rotation contrôlée |

`.env.example` décrit les clés, pas des valeurs utilisables. Les fichiers `.env` réels restent mode 0600, hors paquet, hors image et hors sauvegarde applicative non chiffrée.

## Identité et paramètres métier

Configurer dans l'application la concession, ses agences, identité légale (raison sociale, RCCM, NIU, RIB documentaire, site), coordonnées opérationnelles, devise, taxes, séquences, tarifs atelier, catégories, moyens de paiement et paramètres de documents. Valider chaque valeur avec le métier LCA ; aucune donnée de recette ne doit être copiée.

## Proxy et HTTPS

Avec le seul Nginx Docker, `TRUST_PROXY_HOPS=1`. Avec un proxy hôte supplémentaire conforme à l'exemple fourni, la valeur est normalement 2, à confirmer par test de l'adresse client et du rate-limit. `FRONTEND_URL` est l'origine HTTPS exacte sans `/api`.

## Fichiers persistants

`lca_mysql_data`, `lca_uploads_data` et `lca_ged_data` sont indissociables pour la reprise. Définir quotas, alertes disque, sauvegarde et politique de conservation. La GED est privée ; seuls les médias explicitement publics passent sous `/uploads`.

