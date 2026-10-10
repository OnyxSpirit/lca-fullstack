# AUDIT-ERP-01 — Rapport principal

Date de l'audit : 10 octobre 2026  
Mode : audit strict, lecture seule  
Périmètre : Dashboard, API `/dashboard/overview`, recherche globale, KPI, RBAC et cohérence intermodules.

## Conclusion exécutive

Le Dashboard est correctement protégé par `dashboard.view` et chaque famille de données est en plus soumise à sa permission métier. Aucun contournement RBAC ni fuite inter-agence/inter-concession n'a été démontré. En revanche, les chiffres financiers ne sont pas encore une source de pilotage fiable : le CA inclut les factures brouillon, la marge n'exclut aucun statut de vente, les avoirs sont rattachés à la période de la facture et la comparaison hebdomadaire annoncée n'est jamais calculée.

L'audit couvre **20 indicateurs/groupes visibles ou retournés** : **11 conformes** et **9 affectés par au moins une anomalie confirmée**. Le registre comporte **16 constats : 13 confirmés, 2 probables, 1 à vérifier**, dont 4 P1, 10 P2 et 2 P3. Aucune anomalie RBAC de fuite de données n'est confirmée.

## Sources et méthode

- Lecture des routes Dashboard et Reporting, hooks, types, composants et tests ciblés.
- Comparaison des statuts, dates, formules, permissions et scopes SQL.
- Tests existants exécutés sans modification.
- Recette réelle authentifiée sur `http://127.0.0.1:3001/dashboard`, en 1440, 1024, 768 et 375 px, sans écriture volontaire.
- Aucun accès VPS/production, aucune base créée ou modifiée.

## Constats majeurs

1. **P1 — CA non aligné au Reporting.** `dashboard.routes.ts:23,32-33` exclut seulement `cancelled`; le Reporting exclut `draft` et `cancelled` (`report.routes.ts:22`). Un brouillon contribue donc au CA Dashboard et aux graphiques.
2. **P1 — marge brute sans filtre de statut.** `dashboard.routes.ts:25` additionne toute vente datée, y compris un statut annulé, contrairement aux ventes et au Reporting.
3. **P1 — fausse comparaison hebdomadaire.** `dashboard.routes.ts:35` passe toujours zéro comme valeur précédente. Si la semaine courante a des données, `delta=current` et `deltaPercent=null`; si elle est vide, l'objet est `null`. La semaine précédente n'est jamais interrogée.
4. **P1 — temporalité des avoirs divergente.** Le Dashboard soustrait tous les avoirs émis/appliqués de leur facture, indépendamment de la date de l'avoir; le Reporting financier expose les avoirs selon leur propre date (`report.routes.ts:29`). L'historique peut changer rétroactivement.
5. **P2 — widgets opérationnels trompeurs.** Le frontend demande les OR et livraisons sans filtre (`DashboardPage.tsx:54`) puis présente les premiers résultats comme « en cours » et « prévues ». La recette affiche réellement deux OR `Clôturé`/`Annulé` et une livraison `Livré & Signé`.
6. **P2 — responsive.** À 1024 px, le montant CA est visuellement tronqué; à 375 px, la page présente un défilement horizontal. 1440 et 768 px restent exploitables.

## Analyse financière

- Source CA : `invoices.total`, donc TTC, moins `credit_notes.amount` aux statuts `issued`/`applied`. Les factures annulées sont exclues, mais pas les brouillons. Les paiements et remboursements n'entrent pas dans le CA, ce qui est conceptuellement normal pour un indicateur de facturation; ils appartiennent au suivi d'encaissement.
- Période mensuelle : début du mois SQL inclus, sans borne haute; le mois précédent est correctement borné `[début M-1, début M[`. Les dates futures du mois courant ou au-delà peuvent donc entrer.
- Marge : montant de ligne ramené HT moins snapshot de coût, avec repli sur le coût courant du véhicule. Ce repli est explicitement qualifié d'« indicative » par l'UI, ce qui est conforme; l'absence de filtre de statut ne l'est pas.
- Devise : FCFA côté cartes; graphiques en `kXAF`, cohérent mais peu lisible (`8500kXAF`).

## Cohérence intermodules

| Comparaison | Verdict | Motif |
|---|---|---|
| Dashboard ventes / Reporting ventes | Conforme | mêmes statuts actifs et mêmes véhicules distincts, sous réserve des périodes ouvertes du Dashboard |
| Dashboard CA / Reporting CA | Anormale | brouillons inclus seulement au Dashboard |
| Dashboard marge / Reporting marge | Anormale | aucun filtre de statut au Dashboard |
| Avoirs Dashboard / Reporting finance | Anormale | date de facture contre date d'avoir |
| Stock disponible / stock Reporting | Normale | le premier compte `available`; le second couvre le stock commercial exploitable reçu à réservé |
| Répartition stock / Reporting véhicules | Conforme | mêmes statuts `received`, `preparation`, `available`, `reserved` |
| Atelier/Livraisons API / widgets Dashboard | Anormale | l'API synthétique filtre correctement; les listes frontend utilisées comme widgets ne filtrent pas |

## Tests exécutés

Commande backend :

`node --experimental-test-module-mocks --import tsx --test test/dashboard.domain.test.ts test/dashboard-crm-scope.test.ts test/dashboard-search-transversal.test.ts`

Résultat : **32 réussis, 0 échec**.

Commande frontend :

`./node_modules/.bin/tsx --test test/dashboard-navigation-search-transversal.test.ts`

Résultat : **11 réussis, 2 échecs**. Les deux échecs sont des assertions textuelles devenues obsolètes à cause du formatage (`useGlobalSearchQuery(debounced, globalSearchOpen)` et `setTimeout(() => ...)` existent avec des espaces). Le comportement recherché existe; cela ne démontre pas une panne fonctionnelle.

## Recette navigateur réelle

| Largeur | Résultat |
|---:|---|
| 1440 px | Dashboard chargé et lisible; preuves métier des widgets incorrects |
| 1024 px | montant CA tronqué dans sa carte; grille trop comprimée |
| 768 px | menu compact et grille 2 colonnes, utilisable |
| 375 px | cartes en colonne mais débordement horizontal confirmé; titre fortement cassé |

Jeu observé : CA `33 399 010 FCFA`, marge indicative `8 000 000 FCFA`, 1 véhicule vendu, 3 prospects actifs, 3 véhicules disponibles. Ces valeurs servent de preuve d'affichage, pas de certification comptable du jeu de données.

## Limites

- Aucune mutation ni scénario injecté : les cas brouillon, vente annulée et dates limites sont démontrés par le code, pas par modification de la base locale.
- Le fuseau de session MySQL n'est pas fixé dans le code examiné; son alignement avec Africa/Brazzaville reste à vérifier sur chaque environnement.
- Les scopes ont été prouvés par analyse et tests unitaires ciblés, pas par une matrice E2E de comptes réels pour tous les rôles.

## Livrables

- `docs/AUDIT-ERP-01-KPI.md`
- `docs/AUDIT-ERP-01-RBAC.md`
- `docs/AUDIT-ERP-01-ANOMALIES.md`
- `docs/AUDIT-ERP-01-PLAN-CORRECTION.md`

Aucune correction n'a été appliquée.
