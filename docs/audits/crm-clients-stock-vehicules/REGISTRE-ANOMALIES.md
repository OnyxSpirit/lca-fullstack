# Registre des anomalies et réserves

| ID | Sévérité | Domaine | Statut | Constat | Critère d’acceptation |
|---|---|---|---|---|---|
| STOCK-001 | Haute | Stock | DÉFECTUEUSE | Le “transfert inter-agences” refuse toute agence destination différente. | Mutation atomique autorisée uniquement avec droits source et destination; mouvement et audit des deux côtés. |
| STOCK-002 | Moyenne | Stock | ABSENTE | Aucun filtre prix min/max. | Paramètres API validés, UI, pagination et tests limites. |
| STOCK-003 | Moyenne | Stock | ABSENTE | Aucun tri sélectionnable. | Liste blanche de tris backend, contrôle UI et ordre stable. |
| CLIENT-001 | Moyenne | Client 360 | ABSENTE | Pas d’action d’édition générale depuis la fiche. | Formulaire prérempli, permission `customers.update`, conflits d’identité gérés. |
| CLIENT-002 | Moyenne | Client 360 | À ARBITRER | Suppression physique d’un contact, sans historique. | Décider suppression physique ou archivage; si archivage, audit et restauration définis. |
| CLIENT-003 | Faible | Client 360 | PARTIELLE | Modification/suppression de contact disponibles en API mais peu exposées dans l’UI. | Actions UI protégées, confirmation et retours d’erreur. |
| CRM-001 | Faible | CRM | À ARBITRER | Aucun archivage/désactivation de prospect. | Décider besoin, effets sur pipeline, recherches, historique et reporting. |
| UI-001 | Faible | Stock | PARTIELLE | Sémantique “transfert” ambiguë pour une simple affectation interne. | Libellé corrigé ou véritable flux inter-agences implémenté. |

Toutes les autres vérifications ciblées sont conformes dans la limite des preuves consignées. Aucun correctif métier n’a été appliqué pendant l’audit.
