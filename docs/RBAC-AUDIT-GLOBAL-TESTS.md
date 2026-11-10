# Audit global RBAC — tests et non-régression

## Inventaire

- Fichiers `*.test.ts` backend : **321**.
- Fichiers nommés MySQL/intégration MySQL : **71**.
- Fichiers utilisant Supertest ou `createApp()` : **66**.
- Fichiers contenant des marqueurs de concurrence/verrou/retry : **133**.
- Fichiers relatifs à Socket.IO/temps réel : **22**.
- Aucun test frontend, navigateur ou E2E n’a été lancé.

## Commandes exécutées

| Commande | Résultat |
|---|---|
| `npm run lint` | Réussi, code 0 |
| `npm run build` | Réussi, code 0 |
| `npm test` | Exécution partielle : 104 fichiers rapportés, puis absence durable de progression ; interruption contrôlée |

## Résultat de la suite complète tentée

- Fichiers rapportés avant blocage : **104/321**.
- Réussites : **78**.
- Échecs : **26**.
- Ignorés explicitement rapportés : **0**.
- Tests MySQL rapportés : **15 réussis, 0 échec** dans la portion exécutée.
- La suite ne peut pas être déclarée réussie : 217 fichiers n’ont pas produit de résultat pendant cette exécution.

### Échecs observés

`app.test.ts`, `audit-final-corrections.test.ts`, `auth-rate-limit.test.ts`, `commercial-final-workflow.test.ts`, `commercial-residuals.test.ts`, `commercial-transversal-routes.test.ts`, `commercial-workflow.test.ts`, `crm-appointment-concurrency-b341.test.ts`, `crm-appointment-endpoint.test.ts`, `crm-appointment-integrity-b341.test.ts`, `crm-appointment-reliability.test.ts`, `crm-assignment-endpoint.test.ts`, `crm-dynamic-rbac.test.ts`, `crm-negotiation-regression.test.ts`, `crm-reassignment-endpoint.test.ts`, `crm-stage-transition-matrix.test.ts`, `customers-dynamic-rbac.test.ts`, `customers-list-pagination-b3451.test.ts`, `customers360-endpoint.test.ts`, `delivery-candidates.test.ts`, `delivery-document-security.test.ts`, `document-marks-b33-pdf.test.ts`, `document-marks-b331-pdf.test.ts`, `dynamic-rbac.test.ts`, `erp-warranty-lifecycle-02.test.ts`, `erp08-workshop-document.test.ts`.

Les échecs CRM/Clients/Livraisons sont cohérents avec des fixtures historiques qui construisent encore l’ancien contexte ou attendent `GLOBAL/CONCESSION`, mais cette explication n’est pas appliquée indistinctement : chaque échec doit être rejoué isolément lors du lot final pour distinguer dette de fixture et régression réelle. Les échecs PDF/documentaires et workflow nécessitent leur propre diagnostic.

## Preuves positives pertinentes dans la portion exécutée

- Administration agence, contexte agence et realtime agence : tests MySQL réussis.
- CRM multi-agences : `crm-agency-rbac.test.ts` et sa recette MySQL réussis.
- Client : preuve statique agence et identité MySQL réussies.
- Livraisons : checklists, autorisations financières et services — tests de concurrence MySQL réussis ; le test candidats échoue sur la migration partielle.
- Marques documentaires : deux intégrations MySQL réussies, mais deux tests PDF échouent.
- Tests Ventes ciblés exécutés avant cet audit : 7 fichiers sur 7 réussis ; ils ne remplacent pas une recette MySQL dédiée.

## Lacunes de couverture

1. Aucune matrice HTTP négative exhaustive pour les 664 endpoints.
2. Recettes MySQL manquantes ou incomplètes pour Showroom, Devis, Proformas, Ventes et stock véhicules.
3. Peu de tests retirant un rôle ou changeant l’agence pendant une transaction métier.
4. Chaînes critiques Facturation/Trésorerie/Pièces/Atelier/RH non testées sous le nouveau contexte puisqu’elles ne sont pas migrées.
5. Les collisions de routes ne disposent pas toutes d’un test explicite d’ordre/accessibilité.
6. La suite monolithique peut stagner ; le lot final doit isoler les handles ouverts et produire un rapport de sortie fiable.

## Critère de non-régression final

Lint et build verts, 321 fichiers exécutés sans blocage, zéro échec non justifié, recettes MySQL 8.4 isolées pour chaque chaîne critique, tests A/B + OWN/AGENCY + révocation concurrente + Socket.IO, et correspondance univoque avec les 664 lignes de l’inventaire.
