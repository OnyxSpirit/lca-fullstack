# Diagnostic production — Fiches Clients 360°

## Runtime confirmé

Le service Docker `backend` construit `backend-node/Dockerfile` avec le contexte `./backend-node`.
L'image finale exécute `node dist/server.js`, expose le port interne `3001` et utilise la route
`GET /api/customers/:id/360` de `backend-node/src/modules/customers/customer.routes.ts`.
L'ancien NestJS `backend/` n'est pas le runtime ; il fournit seulement le schéma et les migrations.

## Sous-requêtes SQL réelles

| Sous-requête | Tables / jointures | Colonnes critiques | Portée / ordre |
|---|---|---|---|
| client accessible | `customers`, `agencies`, `users`, agrégats `sales`/`invoices` | code, agence, responsable, créateur, total, solde | client + RBAC agence/commercial |
| contacts | `customer_contacts` | `customer_id`, identité, coordonnées, `is_primary`, date | client ; principal puis nom |
| opportunités | `opportunities`, sous-requête `leads` | les deux `customer_id`, `lead_id`, étape, valeur, probabilité, motif, dates | client direct ou prospect converti |
| véhicules | `vehicles` → `versions` → `models` → `brands`, `sale_items`/`sales`, `repair_orders` | client, agence, référentiels, VIN, immatriculation, statut | agence + vente/OR relié |
| ventes | `sales`, `sale_items`, véhicule et référentiels | client, agence, numéro, statut, `total`, `balance_due`, date | client + agence |
| OR | `repair_orders`, véhicule et référentiels | client, agence, véhicule, numéro, plainte, `actual_total`, date | client + agence |
| factures | `invoices` | client, agence, numéro, dates, `total`, `amount_paid`, `balance_due`, type | client + agence |
| timeline | onze branches `UNION ALL` : client, opportunité, activité, vente, livraison, OR, facture, paiement, showroom et document | identifiants client, libellés métier et dates | date décroissante, limite 200 |

Chaque sous-requête journalise `route`, `customerId`, `subquery`, `code` et `message`. Les détails
MySQL restent dans les logs serveur ; le navigateur reçoit toujours un message HTTP 500 générique.

## Matrice de dérive

| Dépendance | Schéma consolidé | Migration | Requise par `/360` |
|---|---:|---:|---:|
| `customer_contacts` + index/FK | oui | 019 | oui |
| `opportunities.customer_id` + index/FK | oui | 019 | oui |
| `activities.customer_id` + index/FK | oui | 019 | timeline |
| `leads.customer_id` | oui | CRM antérieure | oui |
| `sales.balance_due` | oui | ventes/billing antérieure | oui |
| `repair_orders.customer_id`, `actual_total` | oui | atelier antérieure | oui |
| `documents.entity_type`, `entity_id`, `is_archived` | oui | GED antérieure | timeline |
| `showroom_visits.customer_id` | oui | 006 | timeline |
| `deliveries.customer_id` | oui | livraisons antérieure | timeline |
| `invoices`/`payments` et soldes | oui | 018 + schéma | oui |

Le migrateur Node ajoute les trois écarts couverts par 019, puis vérifie exhaustivement les autres
tables/colonnes. Une migration historique manquante produit une erreur explicite, jamais un faux
tableau vide.

## Diagnostic VPS non destructif

```bash
cd /opt/lca/lca-fullstack
docker compose logs --tail=200 backend
# Ouvrir une fiche 360° dans le navigateur.
docker compose logs --tail=100 backend
```

Contrôler ensuite le schéma, la version et le mode SQL :

```bash
docker compose exec mysql sh -lc '
mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" -e "
SELECT VERSION(); SELECT @@sql_mode;
SHOW TABLES LIKE '\''customer_contacts'\'';
SHOW COLUMNS FROM customer_contacts;
SHOW COLUMNS FROM opportunities LIKE '\''customer_id'\'';
SHOW COLUMNS FROM activities LIKE '\''customer_id'\'';
SHOW COLUMNS FROM leads LIKE '\''customer_id'\'';
SHOW COLUMNS FROM sales LIKE '\''balance_due'\'';
SHOW COLUMNS FROM repair_orders LIKE '\''actual_total'\'';
SHOW COLUMNS FROM documents LIKE '\''entity_type'\'';
SHOW COLUMNS FROM documents LIKE '\''entity_id'\'';
SHOW COLUMNS FROM documents LIKE '\''is_archived'\'';
SHOW COLUMNS FROM showroom_visits LIKE '\''customer_id'\'';
SHOW COLUMNS FROM deliveries LIKE '\''customer_id'\'';
SHOW COLUMNS FROM invoices LIKE '\''balance_due'\'';
SHOW COLUMNS FROM payments LIKE '\''customer_id'\'';
SHOW INDEX FROM customer_contacts;
SHOW INDEX FROM opportunities WHERE Key_name='\''idx_opportunity_customer'\'';
SHOW INDEX FROM activities WHERE Key_name='\''idx_activity_customer'\'';
"
'
```

La première ligne de log contextualisée donne la cause exacte, par exemple `contacts` avec
`ER_NO_SUCH_TABLE`, ou `opportunities`/`timeline` avec `ER_BAD_FIELD_ERROR`.

## Sauvegarde et migration explicite

```bash
cd /opt/lca/lca-fullstack
mkdir -p backups
docker compose exec -T mysql sh -lc \
  'mysqldump -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" --single-transaction --routines --triggers "$MYSQL_DATABASE"' \
  > "backups/lca-before-customers360-$(date +%Y%m%d-%H%M%S).sql"

git pull
docker compose build backend frontend
docker compose up -d mysql
docker compose run --rm backend npm run db:migrate:customers360
docker compose up -d backend frontend
docker compose logs --tail=100 backend
```

Le runtime Docker contient le JavaScript compilé et `npm`; la commande exécute donc
`node dist/scripts/migrate-customers-360.js`. Elle est relançable et ne contient aucun `DROP`,
`TRUNCATE` ou `DELETE`.

## Pourquoi un rebuild ne migre pas le volume

`/docker-entrypoint-initdb.d` n'est traité que lors de l'initialisation d'un répertoire MySQL vide.
Le volume nommé `lca_mysql_data` conserve l'ancien schéma entre les builds. Une base locale créée
depuis le schéma consolidé récent fonctionne donc, tandis qu'une production persistante peut
échouer sur sa première table ou colonne absente.

## Validation après migration

Tester un particulier vide, une entreprise vide, un client avec historique, un identifiant absent
(404) et un client hors agence (404 sans fuite). Un client vide doit répondre HTTP 200 avec
`contacts`, `opportunities`, `vehicles`, `sales`, `repairOrders`, `invoices` et `timeline` vides.

La cause exacte ne peut pas être choisie honnêtement sans les logs ou `information_schema` du VPS.
Après diagnostic, reporter : sous-requête, code/message MySQL, table et colonne concernées.
