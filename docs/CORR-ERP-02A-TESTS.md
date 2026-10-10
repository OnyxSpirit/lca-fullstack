# CORR-ERP-02A — Tests

Environnement : Node v24.11.1, npm 11.7.0.

## Ciblés validés

Commande :

`node --import tsx --test test/crm-stage-transition-matrix.test.ts test/customer-360-timeline-scope.test.ts test/crm-dynamic-rbac.test.ts test/crm-negotiation-regression.test.ts test/customers-dynamic-rbac.test.ts test/delivery-dynamic-rbac.test.ts`

Résultat : **6 fichiers réussis, 0 échec, 0 ignoré**, durée 1,829 s.

Couverture ajoutée : 81 couples CRM, transitions identiques, terminaux, position de la garde avant effets secondaires, présence et ordre des scopes Livraison/Showroom/GED.

## Backend

- `npm run lint` : réussi.
- `npm run build` : réussi.
- `npm test` global : 209 fichiers/tests de premier niveau, 168 réussis, 41 échoués, 0 ignoré, durée 118,706 s.

Les deux nouveaux tests réussissent dans la campagne globale. Le nombre d'échecs reste 41, identique à la campagne globale précédente (207 total, 166 réussis, 41 échoués), mais cette comparaison n'est pas utilisée seule comme preuve : les deux nouveaux contrôles et la compilation passent explicitement.

Les échecs globaux existants touchent notamment anciens tests endpoint/fixtures, GED, Showroom, notifications et autres modules. Plusieurs suites Supertest échouent au niveau fichier dans cet environnement ; les échecs textuels GED/commercial observés directement sont antérieurs et hors des deux changements.

## Frontend

- Tests ciblés CRM historiques : échecs connus d'assertions textuelles obsolètes dans `crm-negotiation-regression` et `crm-stabilization` ; aucun code frontend n'a été modifié.
- `npm run lint` : réussi.
- `npm run build` : réussi.
- Campagne globale équivalente sans IPC : `node --import tsx --test test/**/*.test.ts` : 150 tests, 127 réussis, 23 échoués, 0 ignoré, durée 43,051 s. Ce résultat est identique en volumes à la campagne précédente (les durées diffèrent) et aucun échec nouveau n'est attribuable aux deux fichiers backend modifiés.

## Base et sessions

Aucune base persistante ni volume Docker n'a été modifié. Les fixtures JWT persistées n'ont pas été contournées. Aucune migration n'a été créée ou modifiée.
