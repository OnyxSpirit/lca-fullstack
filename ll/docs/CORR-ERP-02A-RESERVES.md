# CORR-ERP-02A — Réserves

## Décisions métier encore nécessaires

- Définir si une réouverture future de `won` ou `lost` doit exister, avec permission dédiée, motif et audit. En l'absence de décision, elle reste interdite.
- Confirmer si d'autres retours arrière non terminaux doivent être admis. La correction ne conserve que les transitions réellement encodées par les parcours existants.

## Limites de preuve

- La matrice 9×9 est testée directement et la position de la garde est vérifiée. Les scénarios API Supertest exhaustifs par persona restent affectés par les limitations d'ouverture de socket de l'environnement dans plusieurs fichiers historiques.
- Les scopes SQL sont couverts structurellement et par les tests dynamiques existants des modules. Une campagne MySQL 8.4 dédiée avec données croisées multi-agences/multi-concessions reste recommandée avant livraison.
- Les anciennes suites GED comportent des assertions décalées par rapport au code GED courant, indépendamment de la timeline 360°.

## Hors périmètre maintenu

Les P2/P3 restent ouvertes : doublons prospects, limite Kanban, collision de rendez-vous, auteur d'activité, recherche par identifiant et accessibilité clavier.

## Risques résiduels

- Une donnée historique portant un statut hors des neuf valeurs est refusée par défaut.
- Toute évolution du scope Showroom doit être répercutée dans le prédicat de timeline ; une extraction future vers un helper partagé réduirait ce risque, mais constituerait un refactoring hors de cette mission.
- Le prédicat GED dépend du modèle d'intersection GED/permission métier existant ; ses anciennes anomalies éventuelles restent hors de CORR-ERP-02A.
