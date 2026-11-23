# Audit frontend, backend et MySQL

## Frontend

Les requêtes React Query utilisent des clés communes `['document-marks', ...]`; une sauvegarde invalide le préfixe complet. Les formulaires de politique utilisent `defaultChecked/defaultValue` et une clé calculée depuis la politique : l’hydratation est correcte si la politique est effectivement renvoyée. Le défaut de lecture backend provoque le retour aux valeurs par défaut.

## Backend

Les écritures critiques passent par `withCurrentAgencyAuthorization` et des transactions. Les validations de cachet couvrent concession, agence partagée, document, statut et révocation. Le moteur automatique ajoute en plus l’autorisation de rôle et les permissions de l’acteur.

## MySQL

| Table | Rôle |
|---|---|
| `user_signature_versions` | versions de signature personnelle |
| `service_stamp_categories` | catégories concession |
| `service_stamps` | identité et propriétaire du cachet |
| `service_stamp_versions` | images versionnées |
| `service_stamp_agencies` | agences utilisatrices |
| `service_stamp_document_types` | documents éligibles |
| `service_stamp_role_authorizations` | rôles habilités |
| `document_mark_policies` | obligations et comportement d’absence |
| `document_mark_snapshots` | preuve figée dans l’archive |

Migrations structurantes : `069`, `080`, `082`, `092`, `133`. Les FK sont restrictives sur l’historique et les index uniques empêchent plusieurs versions actives et plusieurs politiques pour le même contexte.
