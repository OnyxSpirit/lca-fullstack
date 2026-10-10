# CORR-ERP-02E — Changements

## Base et backend

- Migration 079 : `scheduled_at`, `duration_minutes` et index de planning par véhicule/commercial.
- Paramètre `showroom.test_drive.default_duration_minutes`, défaut 30.
- Calcul d'intervalles semi-ouverts et traitement conservateur des essais actifs historiques sans créneau.
- Création immédiate ou future dans une transaction avec retry borné des deadlocks.
- `PATCH /showroom/test-drives/:id/schedule` pour reprogrammer un essai `planned`.
- `PATCH /showroom/test-drives/:id/start` pour démarrer un essai arrivé à son créneau.
- Annulation étendue aux essais planifiés.
- Rendez-vous CRM confrontés aux intervalles d'essais planifiés et actifs.

## Frontend

- Date, heure et durée dans les formulaires CRM et Showroom.
- Durée initialisée depuis la configuration d'essai.
- Affichage des essais planifiés dans le détail Showroom.
- Reprogrammation et annulation depuis ce détail.
- Paramètre distinct dans Paramètres concession.

## Tests

- Contrats 02E du schéma, des intervalles, du workflow et des Settings.
- Intégration MySQL 8.4 concurrente des créneaux futurs et adjacents.
- Contrats historiques VALID et Settings actualisés sans diminution de couverture.
