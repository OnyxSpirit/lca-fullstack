# Non-régression

La vérification TypeScript et le build de production réussissent. Les corrections restent localisées aux contrôles de page, aux tailles et au contrat fournisseur.

Réserves connues : la commande `npm test` frontend exécute l'intégralité des tests et fait ressortir plusieurs assertions historiques qui recherchent des fragments de source CRM mis en forme d'une manière précise. Les fonctionnalités compilent, mais ces assertions doivent être rendues structurelles avant de considérer toute la suite verte.

Les changements préexistants du workspace (qualification finale, baseline et autres tests backend) ont été conservés et ne sont pas attribués à cette mission.
