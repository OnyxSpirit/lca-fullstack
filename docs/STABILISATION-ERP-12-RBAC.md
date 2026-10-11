# ERP-12 — RBAC

Paramètres : lecture collective et écriture concession protégées par permissions dynamiques ; `OWN` refusé pour les réglages collectifs. Notifications : liste selon OWN/AGENCY/CONCESSION/GLOBAL, mutations liées au propriétaire. Tests réels : 401 sans jeton, 403 pour le commercial sans permission de lecture/mutation, succès Super Admin.
