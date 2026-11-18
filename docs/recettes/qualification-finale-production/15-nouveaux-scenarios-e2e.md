# Nouveaux scénarios E2E

| Identifiant | Profil | Opération | Vérification |
|---|---|---|---|
| QF-DB-01 | système | contrôler migrations | niveau 132, aucune étape en échec |
| QF-DB-02 | système | tenter `GLOBAL` | rejet MySQL |
| QF-DB-03 | système | inspecter fixtures | deux agences, données fictives |
| QF-DB-04 | OWN/AGENCY | comparer ensembles | 1 contre 2 clients, agence B isolée |
| QF-API-01 | commercial OWN | lister clients | portefeuille propre uniquement |
| QF-API-02 | responsable AGENCY | lister clients | agence active uniquement |
| QF-API-03 | multi-agences | changer d'agence | contexte recalculé, client B seul |
| QF-API-04 | responsable AGENCY | injecter agencyId B | aucun contournement |

Chaque scénario vérifie la réponse API ou l'état MySQL autoritaire ; les fixtures sont idempotentes et reconnaissables.
