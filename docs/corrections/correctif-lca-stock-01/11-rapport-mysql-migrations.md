# MySQL et migrations

La migration historique `138_vehicle_order_operational_tracking.sql` n'a pas été modifiée. Les références libres réutilisent le schéma et les contraintes existants : aucune migration 139 n'est nécessaire. Des installations fraîches jusqu'au niveau 138, des rejeux et les scénarios du runner MySQL 8.4 ont réussi, sans `FAILED_PARTIAL`; la partition contenant le runner a notamment validé fresh, reprise, checksum, conservation et concurrence.
