# Recette navigateur

## Exécuté

- Chromium headless local disponible.
- Page réelle `http://127.0.0.1:4176/login` rendue en 1440 × 900.
- Capture : `../lca-recette-login-1440.png`.
- L'API de connexion répond et impose la 2FA au compte administrateur de recette.

## Blocage

La création d'un rôle technique possédant toutes les permissions dans la base persistante de recette a été refusée par la protection de l'environnement, car elle aurait modifié durablement la frontière de sécurité. Aucun contournement de la 2FA n'a été tenté.

Les scénarios authentifiés CRM, Facturation, Véhicules, Trésorerie et RH, ainsi que les cinq résolutions demandées, restent donc `NON VALIDÉ — BLOCAGE EXTERNE`.

