# ERP-12 — Anomalies

1. Aucun défaut fonctionnel critique reproduit dans le parcours réel.
2. Tests backend historiques décalés : attentes textuelles sur l’ancien calcul TVA et présence SQL directe de `is_system`, alors que le résolveur RBAC central fait autorité.
3. Le test `notifications-traceability-rbac` modifie le RBAC simulé sous le même utilisateur sans invalider le cache et attend ensuite une élévation immédiate.
4. La politique de concurrence Settings est dernière écriture gagnante, sans verrou optimiste visible côté client.
