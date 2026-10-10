# CORR-ERP-02E — Rapport

## Verdict

La planification des essais automobiles est implémentée : créneaux futurs, durée configurable, durée individuelle, collisions véhicule/commercial/rendez-vous, reprogrammation d'un essai planifié et annulation logique. Les essais historiques restent inchangés.

La concurrence a été validée sur MySQL 8.4.11. Les intervalles sont semi-ouverts : `startA < endB AND endA > startB`, ce qui autorise les bornes adjacentes.

Le CRM peut être proposé comme **fonctionnellement validé pour le périmètre essais/rendez-vous**, sous les réserves de recette navigateur et les échecs historiques globaux documentés. Aucun verdict de mise en production de l'ERP complet n'est formulé.

## Fonctionnalités

- valeur par défaut de 30 minutes, persistée dans le module Settings et distincte de celle des rendez-vous ;
- snapshot de la durée dans chaque nouvel essai ;
- statut `planned` pour le futur, `in_progress` pour un démarrage immédiat ;
- reprogrammation limitée à `planned` ;
- démarrage explicite d'un essai planifié lorsque son créneau commence ;
- annulation de `planned` ou `in_progress`, sans suppression ;
- conflits contrôlés dans les deux sens avec les rendez-vous.

## Sécurité

Les permissions existantes `showroom.view`, `showroom.visitor.update`, `showroom.status.update` et `crm.test_drive.create` restent autoritaires. Les scopes OWN, AGENCY, CONCESSION et GLOBAL continuent d'être résolus avant l'accès aux essais. Aucun bypass par nom de rôle n'a été ajouté.
