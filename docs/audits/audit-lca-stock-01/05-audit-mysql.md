# MySQL et persistance

## Tables principales

- `commercial_models` : PK `id`, FK unique `version_id`, profil technique global, prix/devise, disponibilité, révision, créateur/modificateur, timestamps. Migration 103 puis enrichissement 104.
- `commercial_model_images` : PK, FK modèle en cascade, chemins, MIME, taille, ordre, principale, téléverseur, date.
- `vehicle_orders` (migration 134) : PK; `order_number` unique nullable; FK modèle/agence/créateur; `quantity_ordered INT UNSIGNED`; UUID client; dates; unique `(created_by,client_request_id)`; index agence/date; CHECK quantité >0.
- `vehicles` : ajout `vehicle_order_id` nullable, FK RESTRICT et index `(vehicle_order_id,status,id)`; VIN nullable; les commandes créent stock_number, version/agence, prix, statut, origine commerciale.
- `vehicle_order_receipts` : PK; FK commande/utilisateur; quantité positive; JSON `vehicle_ids`; UUID; date; unique `(received_by,client_request_id)`; index commande/date.
- `vehicle_status_history` et `audit_logs` : transitions unitaires et événements commande.

`quantity_received` et le reliquat ne sont pas stockés dans `vehicle_orders`. La liste calcule reçu par `SUM(x.status <> 'ordered')` et restant par `quantity_ordered - reçu`. L'historique exact des réceptions est, lui, stocké dans `vehicle_order_receipts`.

Migration 134 introduit exclusivement ces deux tables, la FK dans `vehicles` et la valeur `demo` de l'ENUM. Elle n'introduit ni fournisseur, échéance, statut de commande stocké, prix de commande, ni VIN fictif.

Risques de cohérence : aucune contrainte SQL n'impose que le nombre de véhicules liés égale `quantity_ordered`; aucun CHECK ne compare reçus/reliquat; la cohérence est assurée par la transaction applicative. Le calcul `status <> ordered` considère `demo`, `preparation`, `available`, etc. comme réceptionnés, même si la transition a été manuelle.

