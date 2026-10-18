# Rapport — Pagination de la liste Clients (lot B.3.4.5.1)

## 1. Résumé exécutif

La liste générale des clients utilise désormais une pagination serveur visible et indépendante des sept paginations de la fiche Client 360. Le pied du tableau affiche l’intervalle, le total filtré, la page courante, le nombre de pages, les actions **Précédent / Suivant** et un choix de 15, 30 ou 50 clients par page.

Le contrat historique non paginé de `GET /customers` est conservé pour les sélecteurs existants. Aucun schéma SQL, conteneur, volume, service, donnée métier ou autre lot B.3.4 n’a été modifié.

Verdict : **VALIDÉ AVEC RÉSERVES**, car les tests ciblés, lint et builds passent, mais aucun serveur local n’était disponible pour la recette dans un navigateur réel et la suite frontend complète n’a pas produit son résumé TAP final dans le lanceur disponible.

## 2. Problème initial et cause racine

La route principale chargeait au maximum 200 clients dans un tableau simple. Le composant ne possédait ni état `page/pageSize`, ni métadonnées de total, ni pied de pagination. L’API renvoyait uniquement un tableau : le frontend ne pouvait donc pas connaître le total autorisé au-delà des lignes chargées.

Les corrections du lot B.3.4.5 portaient sur `CustomerDetailPage.tsx` et ses collections internes ; elles ne pouvaient pas corriger cette vue distincte.

## 3. Chemin réellement concerné

- Menu : **Clients / Fiches Clients 360°**.
- Route : `/customers`, déclarée dans `frontend/src/App.tsx`.
- Garde : `ModuleGuard module="customers"`, permission existante `customers.view`.
- Composant monté : `frontend/src/modules/customers/CustomersListPage.tsx`.
- Nouveau hook paginé : `useCustomersPageQuery` dans `frontend/src/api/erpHooks.ts`.
- Endpoint : `GET /api/customers` dans `backend-node/src/modules/customers/customer.routes.ts`.
- Fiche individuelle hors périmètre : `/customers/:id`, `CustomerDetailPage.tsx` et `GET /customers/:id/360`.

## 4. Comparaison Prospects / Facturation

Prospects utilise déjà un hook paginé dont la clé TanStack contient filtres, page et taille ; Facturation maintient un état de page, le remet à 1 lorsque les critères changent, borne une page devenue invalide à partir de la réponse serveur et affiche Précédent/Page/Suivant. La liste Clients reprend ces conventions et les composants `Card`, `Button` et styles responsive existants, sans modifier ces deux modules.

## 5. Modifications réalisées

### Backend

Lorsque `page` ou `pageSize` est fourni, `GET /customers` :

1. construit un prédicat unique contenant scope, recherche, type et classification ;
2. calcule `COUNT(*)` avec exactement ce même prédicat ;
3. borne la page par `pageRequest/pageMeta` (taille maximale existante : 100) ;
4. charge uniquement la page avec un ordre stable `updated_at DESC, id DESC` ;
5. renvoie `{ items, total, page, pageSize, totalPages }`.

Sans paramètre de pagination, la réponse historique en tableau et la limite 200 sont préservées pour les consommateurs existants.

Le total est calculé après le scope `OWN`, `AGENCY`, `CONCESSION` ou `GLOBAL` et après les filtres. Il ne révèle donc pas de clients hors périmètre.

### Frontend

- `page` vaut 1 initialement et `pageSize` vaut 15.
- La clé de cache inclut recherche, type, page et taille.
- Recherche ou changement de type remet la page à 1.
- Changement de taille (15/30/50) remet la page à 1 sans perdre les critères.
- La page normalisée par le serveur est répercutée dans l’état local, ce qui évite `Page 5 sur 4` après réduction du total.
- Première page : **Précédent** désactivé ; dernière page : **Suivant** désactivé.
- Tableau vide : `Aucun client à afficher`, jamais un intervalle `1 à 0`.
- Les contrôles reviennent à la ligne sur petit écran.
- Le clic et le clavier continuent d’ouvrir `/customers/:id`.

## 6. Recherche, filtres, cache et mutations

La recherche globale demeure serveur (code, nom, société, courriel, téléphone). Le filtre de type demeure serveur. Les paramètres territoriaux et de classification déjà acceptés restent disponibles dans le hook. L’invalidation existante sur le préfixe `erpKeys.customers` couvre aussi les nouvelles clés paginées après création ou modification.

Les paginations internes 7/15/30 de la fiche Client 360 et leurs query keys n’ont pas été modifiées.

## 7. Tests exécutés

### Frontend ciblé

- 7/7 tests : stabilisation Client, recherche réelle et pagination principale.
- Test du composant réellement monté : total, intervalle, première page, suivante, précédente, dernière page, boutons désactivés, tailles 15/30, filtre, recherche, retour page 1 et ouverture d’une fiche.
- États chargement, erreur et vide restent couverts par le composant et les tests Clients existants.

Résultat : **PASS**.

### Backend ciblé et non-régression

- 3/3 nouveaux tests : page 2, total territorial, page hors plage/dernière page et contrat historique.
- Campagne combinée pagination, Client 360, Prospects et Facturation : **40/40 PASS**.
- Les tests vérifient également le tri stable, les bornes communes et l’absence de régression des sept collections internes.

### Qualification technique

- `frontend npm run lint` : PASS.
- `frontend npm run build` : PASS (2 508 modules transformés).
- `backend-node npm run lint` : PASS.
- `backend-node npm run build` : PASS.
- `git diff --check` : PASS.
- Suite frontend complète : lancée deux fois ; 98 résultats PASS ont été écrits sans échec, puis le processus a été interrompu par le lanceur avant le résumé TAP. Elle n’est donc pas comptabilisée comme intégralement démontrée.

## 8. Recette navigateur

Non exécutée. Les contrôles en lecture seule ont confirmé qu’aucun serveur local n’écoutait sur `127.0.0.1:3001` ou `127.0.0.1:4183`. Démarrer/reconstruire un environnement ou modifier les conteneurs existants aurait dépassé les autorisations de ce lot. La vérification visuelle est remplacée uniquement par une recette JSDOM du composant réel ; elle ne vaut pas recette navigateur définitive.

Réserve à lever : démarrer ultérieurement un environnement local autorisé avec ce code et effectuer le parcours menu Clients, page suivante/précédente, tailles, recherche, ouverture/retour et petit écran.

## 9. Fichiers modifiés

- `backend-node/src/modules/customers/customer.routes.ts`
- `backend-node/test/customers-list-pagination-b3451.test.ts`
- `frontend/src/api/erpHooks.ts`
- `frontend/src/modules/customers/CustomersListPage.tsx`
- `frontend/test/customers-list-pagination-b3451.test.ts`
- `frontend/test/customers-search.behavior.test.ts`
- `frontend/test/customers-360-stabilization.test.ts`
- `docs/RAPPORT-PAGINATION-LISTE-CLIENTS-B3451.md`

## 10. Préservation et risques résiduels

Les types de lieux dont `GARAGE`, la migration 093, les transferts véhicules, signatures/cachets, GED Aperçu, migrations et archives de livraison n’ont pas été touchés. Aucun commit, push, déploiement, accès VPS, changement de branche ou écriture en base n’a été effectué.

Le risque fonctionnel résiduel est limité à l’absence de recette visuelle dans un navigateur connecté à un backend reconstruit. La logique est démontrée au niveau composant et API, mais le verdict reste volontairement **VALIDÉ AVEC RÉSERVES** jusqu’à cette recette réelle.
