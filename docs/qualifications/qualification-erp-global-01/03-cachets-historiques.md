# Inventaire des cachets historiques

## Résultat disponible

Base MySQL 8.4 de qualification uniquement : 10 cachets, 10 avec propriétaire, 0 sans propriétaire, 10 affectations couvrant 10 cachets, 2 inactifs, 2 révoqués, 3 cachets à plusieurs versions et 26 snapshots documentaires référant un cachet ou une version. Il n'existe aucun propriétaire non affecté, cachet sans propriétaire mais affecté, doublon, orphelin ou partage inter-concessions.

Ces nombres sont issus des données fictives de test et ne prouvent rien sur la production.

## Requête de lecture seule à exécuter en production

```sql
START TRANSACTION READ ONLY;

SELECT COUNT(*) AS total_cachets,
       SUM(agency_id IS NOT NULL) AS avec_proprietaire,
       SUM(agency_id IS NULL) AS sans_proprietaire,
       SUM(is_active = FALSE) AS inactifs,
       SUM(revoked_at IS NOT NULL) AS revoques
FROM service_stamps;

SELECT COUNT(*) AS affectations,
       COUNT(DISTINCT stamp_id) AS cachets_affectes
FROM service_stamp_agencies;

SELECT s.id, s.name, s.agency_id, s.is_active, s.revoked_at,
       COUNT(DISTINCT v.id) AS versions,
       COUNT(DISTINCT dms.document_id) AS documents_historiques,
       COUNT(DISTINCT sa.agency_id) AS agences_autorisees
FROM service_stamps s
LEFT JOIN service_stamp_versions v ON v.stamp_id = s.id
LEFT JOIN document_mark_snapshots dms ON dms.stamp_id = s.id
   OR dms.stamp_version_id = v.id
LEFT JOIN service_stamp_agencies sa ON sa.stamp_id = s.id
WHERE s.agency_id IS NULL
GROUP BY s.id, s.name, s.agency_id, s.is_active, s.revoked_at
ORDER BY s.id;

SELECT s.id, s.agency_id,
       SUM(sa.agency_id = s.agency_id) AS affectation_proprietaire,
       COUNT(sa.agency_id) AS affectations
FROM service_stamps s
LEFT JOIN service_stamp_agencies sa ON sa.stamp_id = s.id
GROUP BY s.id, s.agency_id
HAVING (s.agency_id IS NOT NULL AND affectation_proprietaire = 0)
    OR (s.agency_id IS NULL AND affectations > 0);

COMMIT;
```

## Régularisation

Chaque ligne sans propriétaire doit être rapprochée d'une preuve métier fiable : document source, agence émettrice, audit et responsable habilité. La décision doit être approuvée et tracée, puis appliquée par une migration additive dédiée. Aucune attribution automatique ou suppression n'est autorisée.

## Statut

Inventaire production non réalisé faute d'accès autorisé en lecture seule. La réserve production reste ouverte.
