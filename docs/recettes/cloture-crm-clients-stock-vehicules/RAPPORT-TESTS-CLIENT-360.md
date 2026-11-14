# Rapport de tests Client 360°

L’écran permet désormais l’édition du client selon `customers.update`. Les contacts peuvent être ajoutés, modifiés, désactivés et réactivés. La suppression physique est refusée avec HTTP 410. L’historique conserve création, modification et changements d’état.

Preuves : build TypeScript backend, build Vite, test `customer-agency-rbac` vert, migration 127 et six colonnes additives vérifiées dans MySQL. En navigateur : édition de la ville immédiatement reflétée, création d’un contact avec téléphone/e-mail facultatifs vides, désactivation avec confirmation, réactivation avec confirmation, puis historique visible `CREATED`, `DEACTIVATED`, `REACTIVATED`. Une anomalie d’affichage des erreurs de validation a été détectée et corrigée pendant cette recette.
