# ERP-06 — Workflows

## Chaîne validée

`ready_for_delivery` → livraison `planned` → `preparing` → `quality_control` → `ready` → signature → `delivered`.

Le démarrage crée un snapshot immuable de 4 catégories et 10 contrôles obligatoires. Le passage à `ready` refuse une checklist incomplète. Un document obligatoire non remis bloque la signature finale. Le statut `delivered` ne peut pas être forcé par la route générique : la signature dédiée est obligatoire.

La signature finale exécute atomiquement : validation financière, contrôle checklist/documents, signature unique, vente livrée, véhicule livré, kilométrage, historique, audit, consommation éventuelle de la dérogation et archivage GED du PV.

## Cas limites

- Vente annulée : planification refusée (409).
- Responsable absent : requête refusée (400).
- Double planification concurrente : une création, un conflit ; une seule livraison active.
- Signature invalide : 400.
- Rejeu de signature : réponse idempotente, aucune signature ou archive supplémentaire.
- Report : date et motif historisés ; vente et facture inchangées.
