# Client 360° — exploitation et diagnostic

La fiche Client 360° est servie par l’unique backend
`backend-node/src/modules/customers/customer.routes.ts` via
`GET /api/customers/:id/360`.

## Relations attendues

La vue agrège le client, ses contacts, opportunités, véhicules, ventes, ordres
de réparation, factures et timeline. Les rapprochements reposent sur les clés
`customer_id` et les relations métier ; aucun rapprochement par nom ne doit
être utilisé. Le RBAC et le périmètre agence/commercial sont appliqués avant la
lecture des agrégats.

Les tables et colonnes requises font partie du baseline canonique 001–033. Les
anciennes migrations Client 360° sont archivées dans
`backend-node/database/legacy-migrations/` et ne doivent pas être rejouées sur
une base actuelle.

## Diagnostic non destructif

```bash
docker compose logs --tail=200 backend
docker compose exec -T mysql sh -c 'MYSQL_PWD="$MYSQL_PASSWORD" mysql -u"$MYSQL_USER" "$MYSQL_DATABASE" -e "SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 10"'
curl --fail http://127.0.0.1/api/health
```

Les erreurs des sous-requêtes `/360` consignent côté serveur la route,
`customerId`, la sous-requête et le code MySQL. Le client reçoit une erreur
HTTP explicite sans détails SQL sensibles.

Une base non vide dépourvue de `schema_migrations` ne doit pas être corrigée en
lançant un ancien migrateur à l’aveugle. Sauvegardez-la, comparez son schéma au
baseline puis suivez la procédure d’adoption de
`backend-node/database/README.md`.

## Validation fonctionnelle

Après une mise à jour, vérifiez avec des comptes et agences contrôlés :

- client particulier et entreprise sans historique : HTTP 200 et collections vides ;
- client avec contacts, véhicule, vente, OR, facture et activité : agrégats reliés par identifiant ;
- identifiant absent : 404 ;
- client hors scope : refus/404 sans fuite de données ;
- actualisation directe de la page : données persistantes identiques.

La commande historique `npm run db:migrate:customers360` reste disponible pour
le diagnostic d’une très ancienne installation, mais n’est pas la procédure de
mise à niveau courante. Le bootstrap et les migrations `034+` constituent le
flux canonique.
