# Annexe — Résultats des validations

Exécution du 17 octobre 2026 sur l'arbre de travail existant, sans Docker, sans base métier et sans modification fonctionnelle.

| Validation | Résultat | Preuve/limite |
|---|---|---|
| Backend lint | PASS | `npm run lint` |
| Backend build | PASS | `npm run build` |
| Frontend lint | PASS | `npm run lint` |
| Frontend build | PASS | `npm run build`; 2 505 modules transformés |
| Tests 2FA backend ciblés | PASS, 5/5 | authentication, governance, trusted devices, management, strong authentication |
| Suite frontend globale | ÉCHEC | 172 tests : 138 réussis, 34 échoués; durée ~124,7 s |
| Suite backend globale | NON TERMINÉE | Nombreux tests ont démarré; plusieurs échecs puis absence de progression >90 s; arrêt manuel, code 130 |
| Tests HTTP réels | NON EXÉCUTÉ | Pas d'environnement de recette isolé explicitement établi |
| Tests navigateur | NON EXÉCUTÉ | Même limite; aucun Docker/rebuild autorisé |
| Tests Socket.IO multiutilisateur | NON EXÉCUTÉ | Nécessitent un environnement isolé et plusieurs identités |

## Fichiers frontend en échec

`budget-treasury-integration`, `delivery-candidate.behavior`, `document-marks-lot13.behavior`, `document-preview`, `dynamic-permissions`, `erp-pagination-lot-01`, `erp-warranty-lifecycle-03.behavior`, `fin02-budget-approval`, `fin03-treasury-coverage`, `fin04-remunerations`, `final-corrections-lot1.behavior`, `ged-final-security`, `ged-ux-02.behavior`, `ged-ux-03.behavior`, `hr-administration`, `hr-contract-lot11a.behavior`, `hr-employee-lot10.behavior`, `hr-lazy-sections-lot14b2a`, `navigation`, `ops-ux01.behavior`, `pr06-purchase-order-cancellation.behavior`, `recette-corr01-financial-dialogs`, `rh-stock-ux02.behavior`, `sav-abandon-or-02`, `sav-warranty-ui-06.behavior`, `sav-warranty-ui-08.behavior`, `session-isolation.behavior`, `treasury-accounts-ux`, `treasury-categories-ux`, `treasury-flow-integration`, `treasury-foundation`, `treasury-manual-closure`, `treasury-manual-operations`, `tres-financial-workflows`.

L'exécution isolée de `dynamic-permissions.test.ts` donne 7 succès sur 8; l'échec restant repose sur une recherche textuelle devenue incompatible avec le formatage du composant RH, ce qui indique au moins un test fragile/obsolète plutôt qu'une preuve fonctionnelle directe.

## Fichiers backend observés en échec avant blocage

`app.test.ts`, `audit-final-corrections.test.ts`, `auth-rate-limit.test.ts`, `auth-session-fixture-security.test.ts`, `auth-session-revocation.test.ts`, `budget-treasury-integration.test.ts`, `commercial-residuals.test.ts`, `commercial-transversal-routes.test.ts`, `crm-appointment-endpoint.test.ts`, `crm-assignment-endpoint.test.ts`, `crm-reassignment-endpoint.test.ts`, `customers360-endpoint.test.ts`, `delivery-candidates.test.ts`, `delivery-document-security.test.ts`.

Cause démontrée pour un cas : `auth-session-revocation.test.ts` remplace `rbac.service.js` par un mock qui n'exporte pas `assertPermission`, désormais importé par `user-access.ts`. Pour les autres échecs, la suite globale inachevée ne permet pas de départager systématiquement régression, test obsolète et environnement.
