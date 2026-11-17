# Rapport des tests d’intégration

- Backend : 43 fichiers financiers exécutés et réussis. Le premier lancement avait 18 erreurs de harnais (secrets JWT courts), corrigées sans code métier ; deux tests GED exigeaient `--experimental-test-module-mocks` et passent avec le harnais officiel.
- Frontend : 32/32 fichiers réussis.
- Builds/lints : réussis.
- API sans authentification : factures, comptes Treasury, écritures et reporting retournent 401.
- MySQL recette : lecture seule, aucune fixture créée.

Les tests navigateur authentifiés sont BLOQUÉS par l’absence de connexion valide.
