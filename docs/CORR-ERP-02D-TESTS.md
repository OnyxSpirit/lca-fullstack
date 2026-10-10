# CORR-ERP-02D — Tests

## Résultats ciblés

| Vérification | Résultat |
|---|---|
| Contrats verrouillage, rendez-vous, Showroom/CRM et VALID | 4/4 fichiers passent |
| Intégration MySQL 8.4.11 | 1/1 passe |
| Frontend CRM ciblé | 6/6 fichiers passent |
| Endpoint Showroom réel hors sandbox | 6/6 passe |
| Build backend / frontend | passent |
| Lint backend / frontend | passent |

Commandes principales :

```text
node --import tsx --test test/corr-erp-02d-test-drive-locking.test.ts test/appointment-reliability.test.ts test/showroom-crm-fix.test.ts test/valid-erp-02-crm-contracts.test.ts
CORR_ERP_02D_MYSQL=1 node --import tsx --test test/corr-erp-02d-test-drive-mysql.integration.test.ts
node --import tsx --test test/crm-negotiation-regression.test.ts test/crm-stabilization.test.ts test/crm-search.behavior.test.ts test/crm-reassignment.behavior.test.ts test/crm-negotiation-ui.behavior.test.ts test/appointment-reliability.test.ts
npm run build
npm run lint
npm test
```

## Scénarios A à J

| Scénario | Verdict | Preuve / limite |
|---|---|---|
| A — même véhicule | Conforme pour essai actif | 1 créé, 1 conflit, aucun doublon |
| B — même commercial | Conforme pour essai actif | 1 créé, 1 conflit |
| C — ressources distinctes | Conforme | 2 créés ; deadlock transitoire retenté de façon bornée |
| D — créneaux adjacents | Non testable | pas de fin/durée planifiée |
| E — modification vers créneau occupé | Non applicable actuellement | aucune API de modification |
| F — modifications concurrentes | Non applicable actuellement | aucune API de modification |
| G — annulation/nouvelle réservation | Conforme | état sérialisé, au plus un actif |
| H — essai/rendez-vous | Partiellement conforme | collision à l'instant courant dans les deux sens ; futur indéterminé |
| I — appel API direct | Conforme | protection dans les routes/backend |
| J — hors scope | Conforme au dispositif RBAC existant | contrôle avant conflit, message opaque |

## Campagnes globales

Référence VALID-ERP-02 : backend 172 réussis, 41 échecs, 213 fichiers/tests agrégés ; frontend 125 réussis, 26 échecs, 151.

- Frontend final : **130 réussis, 21 échecs, 151 au total, 0 ignoré, 51,089 s**.
- Backend final hors sandbox : **1 570 réussis, 86 échecs, 75 ignorés, 1 731 au total, 98,610 s**. Cette granularité Node compte les sous-tests, contrairement à la référence historique agrégée par fichiers ; elle ne doit donc pas être comparée arithmétiquement aux 172/41. Les nouveaux contrats CORR-ERP-02D passent et les échecs restants relèvent majoritairement de contrats/fixtures historiques d'autres lots.

L'exécution HTTP dans le sandbox retourne `listen EPERM`. La même suite exécutée hors sandbox fait fonctionner Supertest ; cette différence est classée environnement et non régression logicielle.
