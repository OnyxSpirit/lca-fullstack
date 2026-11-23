# Migration et données

## Migration 133

La migration additive `133_service_stamp_agency_assignments.sql` crée :

- une clé primaire `(stamp_id, agency_id)` ;
- l'index `(agency_id, stamp_id)` ;
- trois clés étrangères `ON DELETE RESTRICT` vers cachet, agence et créateur ;
- la permission `stamp.assign_agencies` et son attribution initiale au Super Admin système.

## Reprise

Les cachets existants avec `agency_id` reçoivent exactement cette affectation. Les cachets avec propriétaire `NULL` restent inchangés et sans affectation : ils sont donc préservés et inaccessibles, en attente d'une décision humaine traçable. Aucun `UPDATE` arbitraire ni suppression n'est exécuté.

## Validation isolée

La migration a été appliquée sur MySQL 8.4 dans le projet Docker `lca-codex-qualification`, base `lca_codex_qualification`. Le registre confirme la version 133 et son checksum `79f55e60c42c435f5245b7e3ee860b23e85b41b49df2c864219698994c205809`. La table créée expose les contraintes attendues et la permission est active en `AGENCY`.

## Déploiement

Appliquer la migration avant le nouveau backend, puis le frontend. Avant migration, inventorier `service_stamps` par `agency_id`, sauvegarder la base et signaler toute ligne `NULL` aux responsables métier. Ne jamais exécuter le seed complet sur une base existante.
