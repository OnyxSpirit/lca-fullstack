# Infrastructure Docker

Pile neuve `lca-qualification-02` créée sans arrêter ni recréer les ressources existantes. Images construites sous Node 22 et Nginx ; backend, frontend et MySQL sont sains. Les pools réseau étant épuisés, les réseaux isolés de recette existants ont été réutilisés sans reconfiguration.

La finalisation ajoute des runners conservés pour inspection et un proxy Nginx TLS `lca-qualification-02-wss-proxy`. L’interruption externe du 25 novembre a arrêté la pile isolée ; MySQL de qualification a été redémarré le 26 novembre après autorisation explicite de l’utilisateur. Aucune ressource n’a été supprimée ou recréée.
