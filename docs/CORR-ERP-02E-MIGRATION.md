# CORR-ERP-02E — Migration 079

Fichier : `backend-node/database/migrations/079_test_drive_scheduling.sql`.

La migration ajoute à `showroom_test_drives` :

- `scheduled_at DATETIME NULL` ;
- `duration_minutes SMALLINT UNSIGNED NULL` ;
- `idx_test_drive_vehicle_schedule(vehicle_id,status,scheduled_at)` ;
- `idx_test_drive_advisor_schedule(advisor_id,status,scheduled_at)`.

Les colonnes sont nullables afin de ne pas inventer d'horaires pour l'historique. Aucun backfill métier n'est exécuté. Un essai historique `in_progress` incomplet bloque prudemment la ressource jusqu'à sa clôture ; un historique `completed` ou `cancelled` ne bloque pas.

Preuve MySQL 8.4.11 : baseline 071 puis migrations 072 à 079 appliquées dans une base jetable. Une seconde exécution retourne `Database VERSIONED; niveau >= 79`. Les colonnes et les six segments d'index ont été relus dans `INFORMATION_SCHEMA`/`SHOW`.

Les migrations 077 et 078 n'ont pas été modifiées.
