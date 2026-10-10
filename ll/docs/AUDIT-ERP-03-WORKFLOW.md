# AUDIT-ERP-03 — Workflow réel des ventes

## Machine d’états

| État courant | Transition | État suivant | Garde notable |
|---|---|---|---|
| création | automatique | `reserved` | véhicule disponible, agence/client cohérents, transaction et réservation |
| `draft` | confirmation | `reserved` | statut historique encore accepté par le domaine |
| `reserved` | confirmation | `ordered` | `sales.confirm` |
| `ordered` | confirmation | `confirmed` | confirmation commerciale; véhicule passe vendu; bon archivé |
| `confirmed` | confirmation | `preparation` | facture véhicule active requise par la garde financière |
| `preparation` | confirmation | `ready_for_delivery` | garde financière satisfaite ou autorisation valable |
| `ready_for_delivery` | module Livraisons | `delivered` | checklist, signature, documents et permission `delivery.complete` |
| état non terminal admissible | annulation | `cancelled` | motif, aucune somme confirmée, aucune livraison engagée |

`cancelled` et `delivered` sont terminaux. Le service interdit explicitement l’annulation de `ready_for_delivery` et `delivered`.

## Effets transactionnels

- Création : vente, ligne véhicule, réservation, changement du stock, historique et audit dans une transaction.
- Confirmation : historique, changement éventuel du véhicule et archive du bon.
- Annulation : verrou vente/véhicule/factures; annulation des factures non payées et réservations; libération du véhicule uniquement s’il est encore réservé/vendu; audit et motif.
- Livraison : la vente n’est marquée livrée que par le module Livraisons.

## Sémantique métier constatée

La confirmation commerciale (`ordered -> confirmed`) est distincte de la facturation. En revanche, commencer la préparation et déclarer la vente prête impose la garde financière. Cette séparation est cohérente et déjà matérialisée dans le code; aucune nouvelle règle financière n’a été inventée.
