# Matrice des anomalies corrigées

| Anomalie | Cause racine | Correction | Tests | Verdict |
|---|---|---|---|---|
| AUD-CONCESSION-001 | `agencyId` absent du formulaire et helper rejetant `null` | propriétaire dérivé de la session ; catégorie rattachée à la concession active | contrats frontend/backend, B3.2.1 MySQL | Corrigée |
| AUD-RBAC-001 | helper central exigeant `isSuperAdmin` | permission `AGENCY` délégable et helper système séparé | `agency-authorization`, checklist, 2FA | Corrigée |
| AUD-API-001 | propriété centrale/locale contradictoire | propriétaire obligatoire pour les nouvelles lignes, table d'affectations, historique `NULL` préservé et fermé | migration 133, tests de portée/IDOR | Corrigée |
| AUD-TEST-001 | tests envoyant artificiellement `agencyId` et consacrant le Super Admin | payload réel sans propriétaire, scénarios habilité/non habilité, partage/retrait | B3.2.1, LOT13, tests de contrat | Corrigée |
| AUD-TEST-002 | message VIN attendu obsolète | assertion alignée sur la règle des 17 caractères alphanumériques | `app.test.ts` | Corrigée |

Aucune anomalie critique ou majeure connue du registre ne reste ouverte dans le périmètre implémenté.
