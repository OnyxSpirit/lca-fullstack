# VALID-ERP-02 — Migration 077

## Environnement

Instance jetable sans volume `mysql:8.4`, version serveur **8.4.11**, publiée uniquement sur `127.0.0.1:33316`. Deux bases isolées ont été utilisées : `valid_fresh` et `valid_upgrade`.

## Scénario A — installation fraîche

Le mécanisme normal `dist/scripts/database-bootstrap.js` a posé la baseline 071 puis les migrations 072 à 077. Le registre contient 071 à 077. Vérifications :

- `leads.lead_type enum('individual','company') NULL` ;
- `activities.created_by bigint unsigned NULL` avec clé étrangère ;
- `follow_ups.duration_minutes` et colonnes d'audit de dérogation présentes ;
- index `idx_follow_ups_assignee_schedule(assigned_user_id, scheduled_at, status)` ;
- permission `crm.appointment.override_conflict` présente ;
- affectation SUPER_ADMIN/GLOBAL ajoutée par la migration ;
- aucun réglage matérialisé pour la durée : la valeur initiale 30 provient volontairement du fallback applicatif.

Résultat : **VALIDÉ**.

## Scénario B — installation existante

Une racine de migration temporaire limitée à 076 a construit un état pré-077 par le mécanisme normal. Des fixtures concession, agence, utilisateur, client, prospect, opportunité, activité et rendez-vous ont été insérées. Le runner normal du workspace a ensuite appliqué 077.

Après migration :

- prospect, client, opportunité et affectation conservés ;
- prospect historique : `lead_type = NULL` ;
- activité historique : responsable conservé, `created_by = NULL` ;
- rendez-vous historique : `duration_minutes = NULL`, audit de dérogation nul ;
- la compatibilité est assurée par `COALESCE(duration_minutes, 30)` ;
- nouvelles contraintes, index et permission présents ;
- aucune perte sur les fixtures.

Résultat : **VALIDÉ**.

## Scénario C — réexécution

Une seconde exécution du runner a indiqué que la base était versionnée à un niveau supérieur ou égal à 077. Le SQL 077 n'a pas été rejoué. L'idempotence attendue est celle du registre de migrations, pas celle d'une exécution manuelle du fichier SQL.

Résultat : **VALIDÉ**.

## Réserve

La migration attribue automatiquement la nouvelle permission à `SUPER_ADMIN` avec scope GLOBAL. Le runtime ne teste jamais le nom du rôle et ne s'en sert pas comme passe-droit ; néanmoins cette attribution automatique est une décision de gouvernance à confirmer. La migration historique n'a pas été altérée.
