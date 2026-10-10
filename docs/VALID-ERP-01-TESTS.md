# VALID-ERP-01 — Tests et preuves

Environnement : Node `v24.11.1`, npm `11.7.0`.

## Campagne Dashboard ciblée

- Backend : 4 fichiers, 38 tests individuels, **38 réussis**, 0 échoué, 0 ignoré.
- Frontend : 2 fichiers, 19 tests individuels, **19 réussis**, 0 échoué, 0 ignoré.
- Builds backend et frontend : réussis.
- Lints backend et frontend : réussis.

Les fichiers ciblés couvraient le domaine Dashboard, les corrections KPI, le scope CRM et la recherche/navigation transversale. Cette campagne ciblée n'est pas assimilée à la campagne globale.

## Suites globales

### Backend

Commande : `npm test` depuis `backend-node`.

- Total : 207
- Réussis : 166
- Échoués : 41
- Ignorés : 0
- Durée : 91,703 s

Les échecs ne sont pas masqués. Ils concernent plusieurs zones de l'ERP et empêchent de conclure à une non-régression globale, sans invalider à eux seuls les 38 contrôles Dashboard ciblés.

### Frontend

La commande standard `npm test` n'a pas pu initialiser le canal IPC de `tsx` (`EPERM`). L'équivalent de test sans IPC a donc été exécuté :

`node --import tsx --test test/**/*.test.ts`

- Total : 150
- Réussis : 127
- Échoués : 23
- Ignorés : 0
- Durée : 38,706 s

La substitution de commande est explicitement distinguée de la commande npm standard. Aucun test n'a été modifié.

## Navigateur

Non exécuté sur le bundle corrigé : port 3001 non remplaçable et instance isolée 3002 non autorisée par l'environnement. Les contrôles 1440/1024/768/375, clavier, débordement, troncature, graphiques, tableaux, états vides et erreurs restent à exécuter.

## Limites

Aucune base persistante n'a été modifiée. Les campagnes existantes ont été utilisées telles quelles ; aucun test, fixture, migration ou permission n'a été altéré.
