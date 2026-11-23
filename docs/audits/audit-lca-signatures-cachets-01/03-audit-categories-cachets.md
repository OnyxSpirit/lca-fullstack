# Audit des catégories et cachets

## Catégories

`service_stamp_categories` est rattachée à la concession, pas à une agence. La route de lecture résout la concession de l’agence active : les catégories sont partagées entre agences d’une même concession. Création et modification exigent `stamp.manage` avec scope `AGENCY`. Une catégorie utilisée est signalée par `is_used`; la désactivation est possible, la suppression n’est pas exposée.

## Cachets

- propriétaire : `service_stamps.agency_id`, dérivé exclusivement de l’agence active ;
- agences utilisatrices : `service_stamp_agencies` ; le propriétaire est toujours inclus ;
- documents éligibles : `service_stamp_document_types` ;
- image : `service_stamp_versions`, une seule version active ;
- rôles autorisés : `service_stamp_role_authorizations` ;
- historique : suppression physique refusée si une dépendance officielle existe.

La modification des documents remplace transactionnellement les lignes d’affectation et maintient `service_stamps.document_context` comme compatibilité historique avec le premier type.

## Conclusion centrale

Sélectionner un document lors de la création autorise le cachet à être candidat pour ce document. L’application dépend ensuite soit du moteur de politiques, soit d’un workflow explicite comme la livraison. Cette sélection ne crée aucune obligation.
