# Tests showroom

Suite MySQL réelle : 4/4. Les doublons concurrents, la conversion atomique, le rollback forcé et l’isolation inter-agences passent. Le trigger de faute a été créé puis supprimé dans le schéma jetable.

Suite HTTP paginée après ajout du tri : 12/12. Elle couvre pagination, stabilité, recherche, dates, agrégats et scopes OWN/AGENCY/CONCESSION/GLOBAL. Contrat spécifique de tri showroom : 1/1.

Validation navigateur réel : tri par durée d’attente puis inversion exécutés avec succès le 2026-11-14.
