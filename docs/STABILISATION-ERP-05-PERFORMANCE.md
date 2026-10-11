# STABILISATION-ERP-05 — Performance

Conditions : localhost, backend recette 3004, MySQL 8.4 recette, 92 appels séquentiels et concurrents, faible volumétrie.

| Mesure | Valeur |
|---|---:|
| moyenne | 117,21 ms |
| médiane | 9,10 ms |
| p95 | 422,76 ms |
| maximum | 846,12 ms |
| erreurs 5xx | 0 |

Les plus fortes latences incluent génération/archivage PDF et authentifications Argon2. Les listes et détails répétés n'ont montré aucune lenteur perceptible dans le navigateur. Aucun travail d'optimisation n'est justifié par cette mesure locale.
