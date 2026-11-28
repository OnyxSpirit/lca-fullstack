# Observations et tests

## Scénarios

| ID | Résultat |
|---|---|
| OBS-01..03 | Présents dans le code; navigateur non authentifié, capture fonctionnelle non obtenue |
| OBS-04 | Création profil présente, non réexécutée |
| OBS-05..16 | Backend/API/MySQL couverts par `evolution-lca-01-mysql.integration.test.ts`; preuve historique QUALIFICATION-LCA-02 relue |
| OBS-17..19 | Modification statut/VIN/images existe dans Stock; non rattachée visuellement à une commande |
| OBS-20 | Persistance démontrée par test MySQL existant |
| OBS-21 | Recherche profils locale; aucun filtre/recherche commandes |
| OBS-22 | Pagination serveur code + test GET page 1 |
| OBS-23 | Cloisonnement seconde agence démontré; bascule UI non observée |
| OBS-24 | Guards identifiés; scénario navigateur non exécuté |
| OBS-25 | Comparaison API/MySQL démontrée dans le test d'intégration, frontend non authentifié |

`evolution-lca-01.test.ts` est un test statique : il vérifie seulement la présence de motifs (routes, NULL VIN, FOR UPDATE, pagination, migration). Il ne démontre pas l'UI.

`evolution-lca-01-mysql.integration.test.ts` (conditionnel `EVOLUTION_LCA_MYSQL_TEST=1`) bootstrappe MySQL, crée commande 10, vérifie 10 fiches sans VIN, réceptionne 4, vérifie 4/6, lance deux réceptions concurrentes de 6 et obtient 201/409, vérifie 10 reçus, cloisonnement agence et audits. Il ne clique pas le frontend, ne vérifie ni galerie, ni pagination multi-pages, ni bascule d'agence UI, ni permissions métier minimales.

Le navigateur local a affiché uniquement `/login`; aucun compte de qualification autorisé n'était fourni. Par protection de l'environnement, aucun compte, mot de passe ou état 2FA n'a été créé/modifié.

