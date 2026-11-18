# Matrice des anomalies

| ID | Module | Gravité | Reproduction/cause | Correction | Tests | État |
|---|---|---|---|---|---|---|
| QGP-RBAC-001 | RBAC multi-agences | Critique | Une valeur DB autre que `OWN` était convertie en `AGENCY` par une branche ternaire | Validation stricte centralisée `persistedPermissionScope` dans les deux résolveurs | RBAC ciblés + TypeScript | Corrigé |
| QGP-INFRA-001 | Qualification Docker | Majeure | Nginx isolé résolvait le service historique `backend` | Proxy dédié vers `backend-qualification` | healthcheck HTTP | Corrigé |
| QGP-UI-001 | Achats directs | Majeure | Liste complète et état vide absent | Pagination partagée et états explicites | TypeScript/build/frontend | Corrigé frontend, serveur réservé |
| QGP-UI-002 | Fiscalité | Majeure | Liste complète | Pagination partagée | TypeScript/build/frontend | Corrigé frontend, serveur réservé |
