# STABILISATION-ERP-04 — Anomalies

## STAB04-API-001 — INSERT véhicule invalide

- Gravité : critique ; statut : **VALIDÉE APRÈS CORRECTION**.
- Observé : toute création répondait 500, MySQL `ER_WRONG_VALUE_COUNT_ON_ROW`.
- Cause : 34 colonnes, 4 constantes SQL, mais 29 placeholders au lieu de 30.
- Correction : ajout du placeholder manquant dans `vehicle.routes.ts`.
- Non-régression : `vehicle-create-insert-shape.test.ts`, 2/2 réussis avec le scénario sans image.

## STAB04-API-002 — Véhicule sans photo refusé

- Gravité : majeure ; statut : **VALIDÉE APRÈS CORRECTION**.
- Observé : `images: []` produisait 400 alors que la photo est facultative.
- Cause : l'orchestrateur de staging imposait une image même pendant la création.
- Correction : exécution directe de la transaction pour une liste vide ; la route d'ajout garde explicitement sa validation non vide.

## STAB04-RBAC-001 — Scope OWN incompatible avec le stock collectif

- Gravité : majeure pour le profil Commercial ; statut : **DÉCISION MÉTIER REQUISE**.
- Observé : menu visible, mais API 403 et page « Stock indisponible ».
- Cause : ERP-02 a attribué `vehicles.view` en OWN alors que le backend refuse explicitement OWN pour Stock.
- Correction non appliquée : arbitrer AGENCY ou CONCESSION puis modifier le rôle par l'API officielle.

## STAB04-ORG-001 — Inter-concessions

Seconde concession non créable officiellement ; scénario **BLOQUÉ** sans contournement SQL.

