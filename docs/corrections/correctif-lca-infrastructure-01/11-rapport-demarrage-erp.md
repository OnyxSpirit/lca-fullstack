# Démarrage ERP

L'installation fraîche officielle baseline→137 a réussi. Les images backend et frontend Node 22 ont été construites avec le Compose standard. MySQL, backend et frontend sont healthy, sans redémarrage. Le backend a journalisé le niveau 137 avec zéro étape non `APPLIED`; l'interface, `/healthz` et `/api/health` via proxy répondent HTTP 200. La connexion fictive répond HTTP 200 avec un challenge `two_factor_setup_required`, démontrant le parcours d'authentification. Un backend de contrôle aux volumes corrigés démarre sans EACCES, ne rejoue aucune migration et répond HTTP 200.

L'environnement principal n'est pas déclaré réparé : sa base reste bloquée à 135 étape 7. Sa politique de redémarrage automatique continue ses tentatives; aucune commande de redémarrage ou recréation n'a été lancée par la mission.
