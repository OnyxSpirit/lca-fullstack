# STABILISATION-ERP-02 — Anomalies

## STAB02-ENV-001 — Ports inaccessibles avec réseau Compose exclusivement interne

- Gravité : majeure pour la recette ; environnement : `lca-recette`.
- Reproduction : démarrer les services avec seulement `recette_private: internal: true`, puis appeler `127.0.0.1:4176` ou `:3004` ; connexion refusée et ports effectifs absents.
- Attendu : services accessibles seulement depuis l'hôte local.
- Cause : un réseau exclusivement interne neutralise l'exposition utile vers l'hôte dans cette configuration Docker.
- Fichier : `docker-compose.recette.yml`.
- Correction : ajout du réseau non interne `recette_host`, conservation du réseau privé et bindings `127.0.0.1`.
- Résultat : frontend/API/MySQL accessibles localement, services sains.
- Statut : **VALIDÉE APRÈS CORRECTION**.

## STAB02-ORG-001 — Absence de workflow de création de concession

- Gravité : réserve de couverture ; scénario : isolation inter-concessions.
- Observé : API/interface permettent de modifier la concession courante et de gérer ses agences, pas de créer une seconde concession.
- Correction : aucune, décision de modèle/produit requise ; aucun contournement SQL.
- Statut : **BLOQUÉE — DÉCISION MÉTIER REQUISE**.

## STAB02-CONC-001 — Écritures concurrentes sans contrôle de version

- Gravité : faible à modérée.
- Observé : deux modifications simultanées d'un même rôle retournent 200 ; verrou SQL et transaction évitent doublons/corruption, mais la dernière écriture gagne sans conflit explicite.
- Correction : non appliquée, car l'ajout d'optimistic locking modifierait le contrat.
- Statut : **OUVERTE — DÉCISION PRODUIT REQUISE**.

