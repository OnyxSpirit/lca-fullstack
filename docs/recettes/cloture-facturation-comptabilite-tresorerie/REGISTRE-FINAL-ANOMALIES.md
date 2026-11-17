# Registre final des anomalies

| Référence | État final | Preuve |
|---|---|---|
| FIN-001 à FIN-005 | Corrigées et recettées | API, MySQL, navigateur et tests globaux |
| FIN-006 | Qualifiée, aucune écriture requise | Fixture documentaire isolée ; aucun historique réel modifié |
| SAV-MVT-01 | Corrigée | Migration 129 et scénarios MySQL/SAV réussis |
| UI-FR-SAV-01 | Corrigée | Statuts SAV francisés |
| UI-FR-BILL-01 | Corrigée | `FACTURE_MANUELLE` remplacé par « Facture manuelle » dans le bundle final |
| TS-ACC-01 | Corrigée | Import `FiscalRow`; TypeScript et build réussis |
| DOCKER-E2E-01 | Corrigée | Volume MySQL isolé reconstruit, migration 129, services sains |
| AUTH-E2E-01 | Levée | 2FA respecté ; session Super Administrateur validée sans désactivation ni contournement |
| SUITES-GLOBALES-01 | Levée | Backend 0 échec ; frontend 0 échec |
| RBAC-NAV-01 | Levée | 7 profils, 2 agences, routes, menus, actions, révocation/réactivation |

Aucune anomalie bloquante ou majeure du périmètre ne reste ouverte.
