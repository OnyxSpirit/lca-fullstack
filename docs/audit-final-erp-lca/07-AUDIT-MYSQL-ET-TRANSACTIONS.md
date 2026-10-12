# Audit MySQL et transactions

## Périmètre

48 SQL actifs (baseline, 46 migrations, seed), 34 migrations legacy et une fixture ont été distingués. Environ 1 004 appels SQL, 249 usages transactionnels et 347 `FOR UPDATE` ont été repérés dans le code courant. Les contraintes, indexes, FK, montants décimaux, transitions, stocks, réservations et journaux ont été inspectés sans connexion à une base.

## Anomalies

- **AUD-LCA-001** : divergence de contrainte `user_roles` entre baseline et historique, puis résolution `LIMIT 1`.
- **AUD-LCA-005** : état CRM lu hors transaction sans verrouillage/version.
- **AUD-LCA-010** : état GED et audit non atomiques.
- **AUD-LCA-011** : budgets concession filtrés sur la mauvaise dimension.
- **AUD-LCA-013** : file du pool illimitée et délais non bornés.
- **AUD-LCA-021** : émission de session de login en plusieurs écritures non atomiques.

## Intégrité et finance

Les parcours ventes, factures, encaissements, livraisons, réservations véhicules/pièces, sessions atelier et garantie contiennent les mécanismes transactionnels/verrous introduits lors des stabilisations ERP-16 à ERP-20. Aucune nouvelle preuve de double encaissement, double facture, stock négatif ou erreur d'arrondi n'a été établie. AUD-LCA-011 est le seul défaut financier courant identifié : il porte sur l'exhaustivité du reporting, non sur l'écriture comptable.

## Performance SQL

L'absence d'`EXPLAIN` et de volumétrie interdit de déclarer un index manquant ou un scan complet réel. Les risques démontrables portent sur l'ordre filtre/limite d'AUD-LCA-009 et la file de connexions d'AUD-LCA-013. Les rapports et dashboards sont les consommateurs les plus sensibles à valider avec des données représentatives.

## Verdict

Schéma et transactions sont globalement défensifs, mais **la divergence RBAC, la course CRM et l'atomicité GED doivent être corrigées avant qualification finale**. Aucun SQL ni index n'a été modifié.
