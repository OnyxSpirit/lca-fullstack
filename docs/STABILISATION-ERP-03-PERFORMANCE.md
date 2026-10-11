# STABILISATION-ERP-03 — Performance

Conditions : Docker local, MySQL 8.4.11, 5 prospects REC03, 3 clients REC03, 62 appels instrumentés incluant authentification et 24 listes de répétition.

| Mesure | Valeur |
|---|---:|
| Moyenne | 86,90 ms |
| Médiane | 6,75 ms |
| p95 | 314,67 ms |
| Maximum | 2 640,12 ms |
| Erreurs 5xx | 0 |

Le maximum est dominé par l'authentification/hachage. Les listes/recherches à cette faible volumétrie sont rapides. Ce test n'est ni un test de charge ni une preuve d'absence de lag en production. Le navigateur a chargé les pages CRM et 360 sans lenteur perceptible, mais sans mesure Web Vitals dédiée.

