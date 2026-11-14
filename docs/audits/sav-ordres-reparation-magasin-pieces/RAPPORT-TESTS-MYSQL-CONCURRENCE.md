# Rapport MySQL et concurrence

Les tests spécialisés couvrent verrous `FOR UPDATE`, double réservation, double consommation, réception idempotente, livraison/réception/retour rejouables, double décision client et transit idempotent.

État recette : 0 stock négatif/surréservé et 0 incohérence dans la chaîne demandé → préparé → livré → reçu → consommé/retourné.

Aucun test destructif supplémentaire n'a été injecté dans `lca_recette` faute de profils authentifiés et parce que la campagne interdit toute atteinte à `concession_erp`. Les preuves de concurrence reposent sur les suites MySQL isolées existantes.

Verdict : **CONFORME AVEC RÉSERVES**.

