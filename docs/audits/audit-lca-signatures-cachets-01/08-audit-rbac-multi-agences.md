# Audit RBAC et multi-agences

Permissions observées : `signature.view.self`, `signature.manage.self`, `document.signature.apply`, `stamp.view`, `stamp.manage`, `stamp.use`, `stamp.assign_agencies`.

- `stamp.view/manage/use` exigent en pratique `AGENCY`; `OWN` est explicitement refusé pour les cachets.
- le partage donne consultation/utilisation, pas modification : les routes de gestion emploient le mode propriétaire et filtrent `st.agency_id` ;
- le partage inter-agences exige `stamp.assign_agencies` ;
- les agences doivent appartenir à la même concession et être actives ;
- aucun nouveau scope autre que `OWN` et `AGENCY` n’est utilisé.

Incohérences :

1. le GET des politiques ne filtre pas par `p.agency_id` mais par une relation de cachet sans rapport ;
2. la signature automatique compare l’agence primaire `users.agency_id` à l’agence du document, au lieu de l’affectation active ;
3. le workflow livraison vérifie partage/document/département mais pas `service_stamp_role_authorizations`, contrairement au moteur automatique.
