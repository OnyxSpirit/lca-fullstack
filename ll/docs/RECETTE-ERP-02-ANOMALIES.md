# RECETTE-ERP-02 — Anomalies

## Corrigée

### REC-CRM-TEST-01 — Fixture MySQL d'essai obsolète (P2)

- Symptôme : `ER_NO_DEFAULT_FOR_FIELD` sur `driver_name`, puis `mileage_out`.
- Cause : le test insérait directement un essai sans les colonnes obligatoires du schéma courant.
- Correction : ajout de valeurs de fixture explicites ; aucune règle métier ni migration modifiée.
- Preuve : test MySQL 8.4 final 1/1 réussi.

## Ouvertes / à qualifier

### REC-CRM-GLOBAL-01 — Tests backend CRM historiques en échec (P2)

`crm-appointment-endpoint`, `crm-assignment-endpoint` et `crm-reassignment-endpoint` échouent dans la suite globale alors que les tests ciblés de fiabilité, matrice de transition et RBAC passent. Les sorties globales ne détaillent que l'échec au niveau fichier ; il faut isoler et moderniser leurs fixtures avant de conclure à une régression produit.

### REC-CRM-GLOBAL-02 — Tests frontend CRM/commercial historiques en échec (P2)

Échecs observés notamment sur COM-RM-01, COM-03/05, COM-09, permissions commerciales, saisie numérique CRM et CRM-TEAM-04/05. Plusieurs sont des assertions statiques fortement couplées au code source. Aucun de ces échecs n'a été masqué ou ignoré.

### REC-CRM-E2E-01 — Couverture navigateur incomplète (P2)

Conversion Client 360, rendez-vous et cycle complet d'essai non exécutés de bout en bout dans cette session. Il s'agit d'une lacune de preuve, pas d'une anomalie produit démontrée.

### REC-CRM-PROD-01 — Production non testée (P2)

Conforme aux interdictions de mission : aucun VPS, déploiement ou compte réel n'a été utilisé.
