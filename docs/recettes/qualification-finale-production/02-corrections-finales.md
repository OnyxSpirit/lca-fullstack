# Corrections finales

- Bootstrap : le baseline conserve temporairement les quatre valeurs historiques du champ `role_permissions.scope`, afin que les migrations 72 à 130 puissent être rejouées. Les migrations 131 et 132 réduisent ensuite le schéma final à `OWN` et `AGENCY`, non nul.
- Runner : le motif de tests backend est désormais cité ; l'ajout d'un sous-répertoire ne modifie plus l'expansion du shell.
- Tests historiques : les contrôles Atelier et Utilisateurs attendent désormais les libellés et périmètres actuels `OWN`/`AGENCY`.
- Responsive : recherche et notifications sont masquées sous 400 px ; l'action rapide apparaît à partir de 1024 px.
- Qualification : deux fichiers dédiés, non découverts par la campagne historique, exécutent les contrôles base et API sans `skip`.
