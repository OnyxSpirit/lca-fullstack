# ERP-06 — Performance

Conditions : appels séquentiels locaux vers l'API Docker sur `127.0.0.1:3004`, hors réseau externe. Validation finale : 27 appels, moyenne 88,84 ms, médiane 12,19 ms, p95 376,47 ms, maximum 524,13 ms, zéro 5xx.

Lors du parcours initial complet (60 appels), la moyenne était 148,78 ms et le maximum 2 436,36 ms. Le maximum correspond à la première finalisation avec génération et archivage transactionnel du PV. La seconde finalisation a pris environ 767 ms ; les lectures courantes étaient majoritairement sous 40 ms.

Aucune optimisation arbitraire n'a été appliquée. La génération documentaire est l'opération la plus coûteuse, sans lenteur bloquante observée dans l'UI locale.
