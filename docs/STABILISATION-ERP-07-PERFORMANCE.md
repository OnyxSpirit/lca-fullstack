# ERP-07 — Performance

Conditions : boucle locale, backend production Docker, MySQL 8.4 isolé, 45 appels de la passe idempotente finale.

| Mesure | Valeur |
|---|---:|
| moyenne | 98,90 ms |
| médiane | 7,82 ms |
| p95 | 534,17 ms |
| maximum | 1 111,83 ms |
| réponses 5xx | 0 |

Les appels les plus lents sont les authentifications (hachage du mot de passe), dont un pic isolé à 1 111,83 ms. Les lectures facture/paiements et PDF sont restées autour de quelques millisecondes lors de la passe finale. Aucune optimisation arbitraire n'a été appliquée.
