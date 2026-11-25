# RBAC

Permissions ajoutées : `service.diagnostic.view`, `service.diagnostic.create`, `service.diagnostic.prepare`, `service.diagnostic.accept`, `hr.employee.technician.manage`. Elles sont contrôlées au backend et utilisées par le frontend. La requête MySQL fraîche retourne zéro affectation avec un scope autre que OWN ou AGENCY. Aucun nom de rôle ne gouverne les nouvelles actions.
