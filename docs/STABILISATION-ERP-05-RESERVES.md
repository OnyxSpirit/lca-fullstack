# STABILISATION-ERP-05 — Réserves

| Réserve | Applicabilité REC05 | État |
|---|---|---|
| R1 suites globales rouges | 31 frontend + 2 assertions backend historiques | OUVERTE |
| R2 dialogue natif annulation | présent dans Vente | OUVERTE |
| R3 build périmé | conteneurs sains, non démontré résolu | CONSERVÉE |
| R4 avoirs/remboursements après paiement | non exercés | OUVERTE |
| R5 préproduction absente | hors environnement local | OUVERTE |
| R6 notifications CRM | distinctes ; Vente persistée validée | CRM CONSERVÉE |
| R7 Prospect→Client | hors vente directe | OUVERTE |
| R8 `vehicles.view OWN` | pas modifié | OUVERTE |
| R9 inter-concessions | une concession | BLOQUÉE |

Réserves nouvelles : code HTTP de rejeu idempotent, bannière de régularisation sur vente livrée, couverture navigateur REC05 limitée par l'usage imposé du port historique 3001.
