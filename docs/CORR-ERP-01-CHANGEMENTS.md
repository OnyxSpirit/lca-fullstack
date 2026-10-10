# CORR-ERP-01 — Détail des changements

## Backend Dashboard

Fichier : `backend-node/src/modules/dashboard/dashboard.routes.ts`.

- A01/A05 : comparaison sur deux semaines bornées `[lundi, lundi+7[` et `[lundi-7, lundi[`.
- A02 : prédicat uniforme `i.status NOT IN('draft','cancelled')`.
- A03 : marge limitée à `confirmed`, `preparation`, `ready_for_delivery`, `delivered`.
- A04 : modèle de registre par `UNION ALL` : factures positives à `i.issue_date`, avoirs négatifs à `cn.issue_date`. Il évite aussi la multiplication des factures par plusieurs avoirs.
- A05 : bornes hautes sur mois courant, ventes, marge, semaine et tendance.
- A06 : CTE calendaires récursives pour sept jours et six mois, avec `COALESCE(...,0)`.
- Pic d'activité : `null` si toute la semaine est à zéro; la comparaison existe même lorsque les deux semaines sont vides.

## Atelier et Livraison

Fichiers :

- `backend-node/src/modules/workshop/workshop.routes.ts`
- `backend-node/src/modules/deliveries/delivery.routes.ts`
- `frontend/src/api/erpHooks.ts`

Le filtre `active=true` est appliqué serveur avant tri et pagination.

- Atelier réutilise `REPAIR_ORDER_IN_WORKSHOP_STATUSES`.
- Livraison accepte `planned` seulement si non datée ou future, ainsi que `preparing`, `quality_control`, `ready`.
- `delivered` et `cancelled` sont exclus.
- Les scopes et permissions existants restent ceux des routes métier.

## Frontend Dashboard

Fichier : `frontend/src/modules/dashboard/DashboardPage.tsx`.

- A07 : classe de couleur calculée sur le signe; `null` reste neutre.
- A10 : unité affichée alignée sur les véhicules distincts.
- A11 : message `role="alert"`, bouton Réessayer, erreurs/vides des widgets.
- A12 : `xl:grid-cols-4`, conteneurs `min-w-0`, protection contre le débordement, montant cassable et header flexible.
- A13 : cartes KPI et lignes OR/livraison transformées en composants `Link`, donc focalisables et activables nativement.
- A15 : graphiques conditionnés par `billing.view`, comme leur source API; `reporting.view` reste requis pour le bouton d'export.

## Tests

Fichiers ajoutés :

- `backend-node/test/dashboard-kpi-corrections.test.ts`
- `frontend/test/dashboard-corrections.test.ts`

Fichiers ajustés :

- `backend-node/test/dashboard.domain.test.ts` : quatre combinaisons semaine vide/pleine.
- `backend-node/test/dashboard-search-transversal.test.ts` : invariant anti-multiplication adapté au registre facture/avoir.
- `frontend/test/dashboard-navigation-search-transversal.test.ts` : regex rendues insensibles au seul espacement, sans affaiblir les assertions debounce/activation.

## Fichiers préexistants non attribuables à CORR-ERP-01

Le dépôt était déjà modifié avant la mission, notamment Billing, Vehicles, plusieurs fixtures/tests, les rapports STABILISATION et des archives ZIP. Ces changements ont été conservés. Le build backend a aussi régénéré `dist/app.js` et `dist/middleware/agency-scope.js` depuis cet état local préexistant; ils ne constituent pas une règle métier de CORR-ERP-01.
