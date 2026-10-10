# CORR-ERP-01 — Rapport de correction

Date : 10 octobre 2026  
Périmètre : anomalies confirmées A01 à A13 de l'audit AUDIT-ERP-01.

## Verdict

Les causes démontrées de **A01 à A11 et A13 sont corrigées et couvertes par des tests ciblés**. La correction responsive A12 est implémentée et validée par compilation/tests de contrat, mais sa recette visuelle post-correction reste ouverte : le processus déjà présent sur le port 3001 sert l'ancien bundle et ne peut pas être remplacé sans interrompre un service extérieur à cette mission.

A14 n'a donné lieu à aucun changement transversal de fuseau. A15 est alignée côté interface sur `billing.view`, sans extension du périmètre retourné par l'API.

## Contrat financier retenu

- **CA facturé brut** : somme TTC de `invoices.total` pour les factures dont le statut n'est ni `draft` ni `cancelled`, imputée à `invoices.issue_date`.
- **CA facturé net** : CA facturé brut moins les avoirs `issued`/`applied`, chaque avoir étant imputé à sa propre `credit_notes.issue_date`.
- **CA encaissé** : paiements confirmés nets de remboursements; il demeure distinct du CA facturé et n'est pas utilisé par les cartes corrigées.
- **Marge brute indicative** : montant de ligne ramené HT moins snapshot de coût; si le snapshot manque, repli inchangé sur les coûts courants du véhicule et libellé « indicative ».
- **Ventes admissibles** : `confirmed`, `preparation`, `ready_for_delivery`, `delivered`.

Les exports historiques et les écritures comptables n'ont pas été modifiés. Le Reporting possède encore des calculs historiques où certains avoirs sont rattachés à la période de facture; cette divergence est documentée dans les réserves.

## Corrections réalisées

| Anomalie | Résultat |
|---|---|
| A01 | semaine précédente réellement agrégée sur l'intervalle lundi-à-lundi |
| A02 | brouillons et annulations exclus de toutes les séries de CA Dashboard |
| A03 | marge limitée aux statuts de vente admissibles |
| A04 | avoirs Dashboard imputés à leur propre date comptable |
| A05 | bornes hautes exclusives ajoutées au mois, à la semaine et aux six mois |
| A06 | sept jours et six mois toujours matérialisés, zéros compris |
| A07 | variation CA verte, rouge ou neutre selon valeur réelle |
| A08 | widget OR demande `active=true`; filtre SQL réutilisant les statuts Atelier |
| A09 | widget Livraison demande `active=true`; terminées/annulées et planned passées exclues |
| A10 | libellé remplacé par « Véhicules vendus ce mois » |
| A11 | alerte API explicite, relance, erreurs propres aux deux widgets |
| A12 | grille quatre colonnes repoussée à `xl`, contraintes min-width/overflow et titre flexible |
| A13 | cartes KPI et lignes opérationnelles converties en liens natifs clavier |

## Préservation

- Intersections RBAC Dashboard/permission métier inchangées.
- Scopes OWN, AGENCY, CONCESSION et GLOBAL inchangés.
- Aucun changement de migration, de rôle ou de permission.
- Snapshot de coût, fallback, devise FCFA, convention de variation indéfinie et destinations de navigation préservés.
- Aucun filtrage après pagination : Atelier et Livraison filtrent dans leurs requêtes SQL.

## Résultats principaux

- Lint backend et frontend : réussis.
- Build backend et frontend : réussis.
- Tests Dashboard backend : 4 fichiers, 38 cas, réussis.
- Tests Dashboard frontend : 2 fichiers, 19 cas, réussis.
- Suite globale backend : 166/207 réussis, 41 échecs historiques ou hors périmètre, contre une référence de 45 échecs.
- Suite globale frontend : 127/150 réussis, 23 échecs historiques ou hors périmètre, contre une référence de 38 échecs.
- Aucune nouvelle régression identifiée dans les suites ciblées.

L'ERP n'est pas déclaré prêt pour la production.
