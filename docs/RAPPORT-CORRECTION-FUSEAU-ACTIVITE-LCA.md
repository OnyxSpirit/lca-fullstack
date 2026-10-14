# Correction ciblée du fuseau horaire — Activité utilisateurs

Date : 14 octobre 2026

## Constat initial

MySQL conserve les `created_at` en UTC sous forme `DATETIME`. Le backend renvoie ces valeurs comme chaînes sans suffixe (`YYYY-MM-DD HH:mm:ss`). `new Date(value).toLocaleString('fr-FR')` les interprétait donc dans le fuseau du navigateur avant de les afficher. Deux navigateurs placés dans des fuseaux différents pouvaient présenter des heures, voire des journées différentes.

Le fuseau métier est stocké dans `concessions.timezone`. L'API Activité le résout déjà par l'agence du compte et le retourne dans `GET /activity` et `GET /activity/filters`, avec repli `Africa/Brazzaville` si aucune agence exploitable n'existe.

## Correction

- ajout d'un formateur frontend unique dans `activityDate.ts` ;
- une chaîne MySQL dépourvue de zone est normalisée une seule fois en UTC par ajout explicite de `Z` ;
- liste et détail utilisent ensuite `Intl.DateTimeFormat` avec le `timeZone` fourni par l'API ;
- aucun formatage n'est appliqué aux champs `type=date`, qui représentent des dates calendaires métier et non des instants ;
- le PDF utilise désormais `identity.timezone` au lieu d'une constante et normalise lui aussi explicitement les chaînes MySQL UTC ;
- aucune modification de la logique de filtrage, du compteur, du tri ou de la pagination.

## Cas proches de minuit

Pour `Africa/Brazzaville` :

- `2026-09-30 22:59:59` UTC s'affiche le 30/09/2026 à 23:59:59 ;
- `2026-09-30 23:00:00` UTC s'affiche le 01/10/2026 à 00:00:00 ;
- `2026-09-30 23:30:00` UTC s'affiche le 01/10/2026 à 00:30:00.

## Tests

Les tests de non-régression couvrent :

- chaîne MySQL sans suffixe et ISO déjà suffixée ;
- navigateurs simulés en UTC, America/New_York et Asia/Tokyo ;
- franchissement de minuit métier ;
- rendu PDF dans `Africa/Brazzaville` et dans `UTC` ;
- build/lint frontend et build backend ;
- suites Activité existantes.

## Garanties

Aucun timestamp MySQL, événement historique, filtre serveur, PDF archivé ou donnée métier n'a été modifié. Aucune migration, reconstruction Docker, opération Git distante ou déploiement n'a été effectué.
