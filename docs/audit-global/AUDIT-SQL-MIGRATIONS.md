# Annexe — Audit SQL et migrations

## Inventaire

- 57 fichiers de migration sont présents; la séquence actuelle atteint `090_two_factor_trusted_devices.sql`.
- Les migrations couvrent le socle, CRM, véhicules, ventes, facturation, atelier, pièces, livraisons, GED, RH, trésorerie, RBAC, contexte territorial, 2FA et appareils de confiance.
- 452 déclarations `CREATE TABLE`, `ALTER TABLE`, `CREATE INDEX` ou `FOREIGN KEY` ont été détectées dans les migrations.
- Le backend utilise `mysql2/promise`, des transactions explicites et de nombreux `SELECT ... FOR UPDATE` dans les workflows financiers, ventes, atelier, livraisons et retours.

## Contrôles statiques

| Domaine | Structures/requêtes examinées | Conclusion |
|---|---|---|
| 2FA | `user_two_factor_auth`, politiques, codes, appareils, paramètres | Migration 090 et services cohérents; jetons hashés, expiration absolue et rotation transactionnelle |
| Trésorerie | comptes, mouvements, réservations, rapprochements, couvertures | Transactions et contrôles territoriaux présents; contrats de tests frontend encore en échec |
| Facturation | factures, paiements, avoirs, remboursements | Verrous et recalculs présents dans les workflows sensibles |
| Retours véhicule | retour, événements, déductions, résolutions, remboursements | Workflow séquentiel et transactionnel présent |
| Atelier/pièces | OR, interventions, sessions, réservations, stocks, commandes | Contrôles de statut et verrous largement présents |
| RH | employés, contrats, congés, primes, rémunérations, budgets, dépenses, stock | Modèle riche; plusieurs suites de contrats échouent et requièrent requalification |
| GED | documents, versions, empreintes, rattachements | Validation et contrôle d'accès présents; suites GED frontend en échec |

## Limites de preuve

- Le schéma MySQL en cours d'exécution n'a pas été interrogé : l'isolation de l'environnement n'était pas explicitement établie et la mission interdit toute modification de la base métier.
- L'état réel de `schema_migrations`, des index, clés étrangères, volumes de données et dérives éventuelles est donc `NON VÉRIFIÉ` sur l'instance courante.
- Aucune migration n'a été exécutée. Aucun scénario de reprise partielle n'a été rejoué.
- La cohérence indiquée ci-dessus signifie « cohérence entre code et fichiers de migrations », non conformité de la base active.

## Risques

1. Une divergence entre schéma actif et migrations peut seulement être exclue par requêtes `information_schema` en lecture seule sur une instance explicitement autorisée.
2. Les tests backend globaux n'ayant pas terminé, tous les scénarios transactionnels ne disposent pas d'une preuve automatisée fraîche.
3. Les échecs de tests trésorerie/RH/GED rendent nécessaire une campagne isolée avant toute qualification de livraison.
