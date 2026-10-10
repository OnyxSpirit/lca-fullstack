# AUDIT-ERP-01 — Inventaire des KPI

Références principales : `backend-node/src/modules/dashboard/dashboard.routes.ts:20-36`, `frontend/src/modules/dashboard/DashboardPage.tsx:48-410`.

## Matrice synthétique

| # | Indicateur | Source/formule et période | Statuts | Permission/scope | Présentation / vide | Verdict |
|---:|---|---|---|---|---|---|
| 1 | Chiffre d'affaires | `invoices.total - avoirs`; mois courant vs précédent | exclut seulement `cancelled` | `dashboard.view ∩ billing.view`; agence/concession/global | FCFA; `—` si absent | **Non conforme** : brouillons et borne future |
| 2 | Marge brute | ligne HT - coût snapshot, sinon coûts courants; mois | aucun filtre vente | `dashboard.view ∩ sales.view ∩ vehicles.financials.view` | FCFA, « indicative » si fallback | **Non conforme** : ventes annulées possibles |
| 3 | Ventes du mois | véhicules distincts dans `sale_items`; mois vs précédent | confirmed, preparation, ready_for_delivery, delivered | `dashboard.view ∩ sales.view`; propriétaire possible | compteur et variation | Calcul conforme; libellé trompeur |
| 4 | Prospects actifs | `leads` non terminés | exclut converted, lost | intersection visibilité CRM et dashboard | compteur, variation inconnue `—` | Conforme |
| 5 | Essais programmés | existence activité test_drive dans semaine SQL | activité `planned` | même scope CRM | sous-texte du KPI CRM | Conforme |
| 6 | Véhicules disponibles | stock commercial, non archivé, `available` | available | `dashboard.view ∩ vehicles.view` | compteur | Conforme |
| 7 | Véhicules dormants | disponibles avec ancienneté > 60 jours | available | idem | sous-texte | Conforme |
| 8 | Total/réservés/vendus | agrégats API `vehicles` | tous / reserved / sold | idem | non rendus directement | Conforme dans l'API; payload non visible |
| 9 | Visiteurs aujourd'hui | `DATE(arrival_at)=CURDATE()` | tous statuts | `dashboard.view ∩ showroom.view`; owner possible | compteur | Conforme |
| 10 | Visiteurs en attente | même période | waiting | idem | sous-texte | Conforme |
| 11 | Visiteurs pris en charge | même période | assigned, in_progress | idem | sous-texte | Conforme |
| 12 | Livraisons synthétiques | tout historique; planned futur/non daté et preparing/QC/ready | filtres explicites | `dashboard.view ∩ delivery.view`; spécialiste possible | retourné, non rendu | Conforme dans l'API |
| 13 | OR actifs synthétiques | tout historique | planned, received, diagnosis, waiting_approval, in_progress, quality_control, ready | `dashboard.view ∩ service.order.view`; conseiller possible | retourné, non rendu | Conforme dans l'API |
| 14 | CA hebdomadaire | factures depuis lundi, regroupées par jour | exclut seulement cancelled | scope billing | barres; jours sans données omis | **Non conforme** : brouillons, futur, jours manquants |
| 15 | Pic d'activité | maximum des jours retournés | hérite du CA semaine | scope billing | date/« aucune activité » | Affecté par #14 |
| 16 | Variation vs semaine précédente | somme semaine courante comparée à zéro | hérite du CA semaine | scope billing | `— vs semaine précédente` | **Non conforme** : semaine précédente jamais calculée |
| 17 | CA par activité, 6 mois | factures depuis M-5, VN/VO/SAV par mois | exclut seulement cancelled | scope billing; section UI aussi conditionnée par reporting.view | kXAF | **Non conforme** : brouillons, futur, mois vides omis |
| 18 | Répartition du stock | nombre par carrosserie, sinon énergie/autres | received, preparation, available, reserved | scope vehicles | graphique | Conforme; non affiché dans l'écran observé selon layout/composant |
| 19 | Liste OR « en cours » | `useRepairOrdersQuery('', '')`, quatre premiers | aucun filtre frontend | service.order.view | badges et dates | **Non conforme** : clôturé/annulé observés |
| 20 | Livraisons « prévues » | `useDeliveriesQuery({})`, quatre premières | aucun filtre frontend | delivery.view | badges et dates | **Non conforme** : livré/signé observé |

## Détails des formules et périodes

### CA et avoirs

La valeur est TTC (`invoices.total`). Les avoirs `issued`/`applied` sont agrégés par facture puis soustraits. Les remboursements ne sont pas soustraits : c'est cohérent pour du CA facturé, mais l'UI ne précise pas « CA facturé net d'avoirs ». La sous-requête ne filtre pas la date de l'avoir, ce qui réécrit la période de facture a posteriori.

Mois courant : `issue_date >= premier jour du mois`, sans borne exclusive au premier jour du mois suivant. Mois précédent : `[premier jour M-1, premier jour M[`. Même asymétrie sur ventes et marge. Semaine : lundi inclus, sans dimanche/lundi suivant comme borne haute. Six mois : début de M-5 inclus, sans borne haute.

### Comparaison hebdomadaire prioritaire

- Semaine actuelle avec factures : somme réelle, `previous=0`, `delta=current`, `deltaPercent=null`.
- Semaine précédente avec factures : sans effet; aucune requête ne la lit.
- Semaine précédente vide : même résultat; impossible à distinguer.
- Semaine actuelle vide : `weeklySeries.length===0`, donc `weeklyRevenue=null`.
- Frontend : `formatDeltaPercent(null)` produit `—`, suivi du texte « vs semaine précédente ».
- Correction minimale recommandée : requêter deux intervalles complets lundi-à-lundi, passer leurs sommes à `dashboardComparison`, et générer les sept jours à zéro côté réponse.

### États frontend

- Chargement : `…`; absence de donnée, permission, ou erreur : `—`. L'erreur API n'est pas distinguée.
- Variation inconnue : bien affichée `—`, jamais artificiellement `0 %`.
- CA : couleur toujours verte, même pour une variation négative.
- Ventes : couleur conditionnée au signe.
- Les cartes navigables sont des `div` avec `onClick`, sans rôle, focus clavier ni gestion Entrée/Espace.

## Données sensibles et devise

Le CA requiert `billing.view`; la marge ajoute `vehicles.financials.view`; les autres données requièrent leur permission métier. Les montants sont formatés en FCFA. L'échelle `kXAF` est mathématiquement cohérente mais devrait être rendue plus lisible (`8 500 kXAF` ou `8,5 M FCFA`).
