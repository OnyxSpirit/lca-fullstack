# Rapport MySQL et migrations

La migration 134 crée `vehicle_orders`, la relation nullable `vehicles.vehicle_order_id`, `vehicle_order_receipts` et ajoute `demo` à l'énumération de statut. Le bootstrap complet sur MySQL 8.4 a appliqué les migrations jusqu'à 134 avec succès. Les données d'intégration ont ensuite confirmé les contraintes, relations et écritures transactionnelles. Un scénario autonome de montée 133→134 n'a pas été exécuté ; cette réserve interdit de qualifier ce sous-point comme démontré.
