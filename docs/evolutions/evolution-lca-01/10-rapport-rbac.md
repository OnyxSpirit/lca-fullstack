# Rapport RBAC

Les routes de commande, liste et réception utilisent l'autorisation métier de l'agence active. Les lectures, verrouillages et écritures portent toutes l'agence. L'intégration réelle a démontré qu'une commande d'une autre agence n'apparaît pas et que sa réception retourne 404. La désactivation/réactivation de rôle et la propagation dans une session existante n'ont pas été rejouées dans cette mission.
