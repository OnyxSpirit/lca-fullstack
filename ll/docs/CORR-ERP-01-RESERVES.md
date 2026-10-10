# CORR-ERP-01 — Réserves et points ouverts

## A12 — Confirmation navigateur

**Ouverte pour validation, correction implémentée.** Le port 3001 expose un bundle antérieur et son processus n'est pas visible/contrôlable depuis la session. Il faut redémarrer explicitement ce service depuis le présent workspace puis rejouer 1440, 1024, 768 et 375 px, le clavier et les états d'erreur.

## A14 — Fuseau horaire

**Non modifiée.** La concession stocke `Africa/Brazzaville` et les services de paramètres l'exposent, mais aucune preuve ne garantit que chaque session MySQL applique ce fuseau. Le Dashboard utilise `CURDATE()`/`NOW()`; les labels frontend utilisent UTC pour éviter le décalage de date lors du parsing.

Avant un changement transversal, mesurer pour chaque environnement :

- `@@global.time_zone`, `@@session.time_zone`, `NOW()` et `UTC_TIMESTAMP()`;
- timezone du processus Node;
- convention de stockage DATETIME;
- impacts Billing, Reporting, Atelier, Livraison et exports.

## Reporting historique et A04

Le Dashboard respecte désormais la date propre de l'avoir. Certains calculs Reporting existants soustraient encore les avoirs d'une facture sélectionnée par période de facture, alors que la section Finance expose aussi les avoirs par leur date propre. Les exports n'ont volontairement pas été modifiés. Une mission financière dédiée doit harmoniser ces contrats et valider les chiffres historiques avant changement.

## Tests globaux préexistants

Les suites globales restent rouges : 41 échecs backend et 23 frontend, inférieurs aux références historiques 45/38. Beaucoup sont des assertions statiques anciennes, des attentes de baseline ou des tests HTTP empêchés d'écouter dans le sandbox. Ils n'ont pas été corrigés opportunément.

## Base de données et intégration

Aucune base persistante n'a été modifiée. Aucun scénario MySQL jetable spécifique aux nouvelles requêtes Dashboard n'a été créé dans cette mission; les requêtes ont été validées par compilation et contrats source. Une recette MySQL 8.4 jetable avec factures/avoirs croisés M1/M2 reste recommandée avant revue finale.

## Absence d'actions externes

- aucun commit;
- aucun push;
- aucun déploiement;
- aucun accès VPS/production;
- aucune migration historique modifiée;
- aucun changement RBAC.
