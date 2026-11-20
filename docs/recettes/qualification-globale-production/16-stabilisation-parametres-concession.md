# Qualification — Stabilisation des paramètres de concession

Date : 20 novembre 2026

## Périmètre et audit historique

L’intervention couvre exclusivement **Paramètres concession** et ses dépendances API nécessaires. Les modifications non commitées présentes avant la mission ont été conservées.

Versions et jalons examinés avec `git log`, `git show`, `git diff` et `git blame` :

- `e723c9e` : séparation initiale des paramètres Documents/GED et Signatures/cachets ;
- `3278bee` et `2c1ce2e` : cycle de vie des signatures et cachets documentaires ;
- `69b1d87^` : état où **Atelier & Ponts** n’exposait que les barèmes horaires ;
- `4e23c03`, `69b1d87` et `44e202a` : évolutions successives des listes et paginations ;
- historique de `DeliveryChecklistTemplates.tsx` et migrations `020`/`062` : catégories, types, ordre et snapshots immuables des livraisons.

La régression Atelier provenait de la réintroduction de `BaysSettings` dans `SettingsPage`. Le composant, les hooks, les routes, les permissions et les tables sont conservés ; seule son exposition dans Paramètres est retirée.

## Fonctionnalités qualifiées

| Chemin UI | Résultat |
|---|---|
| Paramètres concession → Signatures & Cachets → Signatures | Onglet exclusif, recherche, gestion historique et pagination 10/20/50/100. Les requêtes signatures ne sont actives que dans cet onglet. |
| Paramètres concession → Signatures & Cachets → Cachets | Onglet exclusif, catégories, cachets, versions, politiques documentaires et pagination indépendante. Les requêtes cachets ne sont actives que dans cet onglet. |
| Paramètres concession → Documents et GED | Catégories et types créés sans code saisi. Code généré côté backend ; code existant conservé lors d’une modification. |
| Paramètres concession → Constructeurs | Code interne généré côté backend à la création et immuable lors d’un renommage. |
| Paramètres concession → Services de livraison | Code généré côté backend, sans modifier les snapshots et factures de livraison. |
| Paramètres concession → Checklist livraison | Catégories et types restaurés, associations/modification/statut/ordre conservés, deux paginations indépendantes et codes automatiques. Les instances historiques restent des snapshots. |
| Paramètres concession → Atelier & Ponts | Ponts et postes masqués. Le code et les API restent disponibles pour une réactivation future. |
| Paramètres concession → Atelier & Ponts → Barèmes horaires atelier | Tableau, recherche, création/modification, surcharge agence, héritage, statuts et pagination standardisée. |
| Paramètres concession → Fournisseurs | Création sans code. Code généré côté backend et conservé lors d’un renommage. Relations achats, pièces et factures inchangées. |

## Convention de code

La source d’autorité est `backend-node/src/shared/stable-code.ts` :

- décomposition Unicode NFD et suppression des accents ;
- majuscules ;
- groupes de caractères non alphanumériques remplacés par `_` ;
- suppression des séparateurs de bord ;
- longueur bornée selon la colonne MySQL ;
- suffixes déterministes `_2`, `_3`, etc. ;
- collision gérée par la contrainte unique MySQL et nouvelle tentative dans la transaction ;
- aucun recalcul lors d’un renommage ;
- aucune migration ou réécriture des codes existants.

Périmètres d’unicité conservés tels que définis par le schéma : global pour Documents/GED, constructeurs et fournisseurs ; concession pour services et catégories de checklist ; catégorie pour types de checklist.

## RBAC et données historiques

- Les permissions existantes sont conservées.
- Aucun scope `CONCESSION` ou `GLOBAL` n’a été ajouté.
- Les contrôles backend des ponts/postes restent actifs malgré leur masquage UI.
- Aucune table, route, donnée, référence documentaire ou snapshot historique n’a été supprimé.
- Aucun commit, push ou déploiement n’a été effectué.

## Validation technique

| Contrôle | Résultat |
|---|---|
| TypeScript / lint frontend | Réussi |
| TypeScript / lint backend | Réussi |
| Build Vite production | Réussi — 2 552 modules |
| Tests ciblés paramètres, checklist, pagination et codes | Réussis |
| Suite backend complète | Réussie — 2 185 tests, 2 081 réussis, 0 échec, 104 tests MySQL conditionnels ignorés faute d’instance dédiée |
| Suite frontend complète | Réussie — 1 075/1 075 tests, 0 échec |
| `git diff --check` | Réussi |

## Réserves de recette

La recette navigateur authentifiée ne doit pas contourner la MFA. Les conteneurs frontend, backend et MySQL existants sont sains, mais contiennent une base historique et n’ont pas été reconstruits ni modifiés. De plus, l’accès au navigateur local est indisponible dans cette session. La validation navigateur avec créations fictives reste donc limitée tant qu’un environnement Docker isolé, une base jetable, un navigateur local accessible et un compte de recette autorisé avec MFA ne sont pas fournis.

Les tests MySQL marqués conditionnels restent explicitement ignorés par la suite lorsque l’instance MySQL 8.4 de qualification n’est pas disponible. Ils ne sont pas déclarés réussis.
