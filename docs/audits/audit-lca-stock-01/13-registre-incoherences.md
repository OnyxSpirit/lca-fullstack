# Registre des incohérences

| ID | Criticité | Incohérence | Cause / preuve |
|---|---|---|---|
| STK-01 | élevée | Quantité « réceptionnée » = tout statut différent de `ordered`, pas historique des réceptions | `orderSelect`, ligne 21; modification manuelle possible |
| STK-02 | moyenne | Historique persisté mais inaccessible | table `vehicle_order_receipts`, aucun endpoint GET/UI |
| STK-03 | moyenne | Aucune navigation commande → véhicules | `vehicle_order_id` non mappé par `mapVehicle` |
| STK-04 | moyenne | Droit manage seul accepté en lecture backend mais onglet caché frontend | `catalogRead` vs `VehiclesListPage:81` |
| STK-05 | moyenne | Création profil dépend de `vehicles.view` ou `vehicles.create` pour charger les versions | `/vehicle-references` |
| STK-06 | faible | Route historique ne sélectionne pas l'onglet | redirect `/vehicles/catalog` → `/vehicles` |
| STK-07 | moyenne | Aucun fournisseur, référence externe, échéance, prix négocié ou annulation | modèle de données/routes absents |
| STK-08 | moyenne | Réception sans saisie VIN/emplacement et sans ciblage des unités | premiers IDs `ordered` |
| STK-09 | faible | Idempotence réception renvoie liste d'IDs vide lors d'un replay | branche duplicate |
| STK-10 | moyenne | Aucune notification temps réel explicite de commande/réception | routes sans `emitToAgency` |
| STK-11 | faible | Catalogue chargé en totalité et filtré client | `useCommercialModelsQuery` + `useMemo` |
| STK-12 | moyenne | Tests UI absents; tests statiques sur motifs | fichiers tests EVOLUTION-LCA-01 |

Aucune anomalie n'a été corrigée.

