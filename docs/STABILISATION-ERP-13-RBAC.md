# STABILISATION-ERP-13 — RBAC

Les contrôles couvrent `hr.view`, personnel, salaire, stock, budget, dépense, historique d’approbation et reporting. Sans jeton : `401`. Avec un profil commercial : `403`.

Les scopes OWN, AGENCY, CONCESSION et GLOBAL sont évalués depuis les permissions persistées ; OWN est refusé pour les ressources collectives stock/budget.
