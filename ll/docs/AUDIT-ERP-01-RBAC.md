# AUDIT-ERP-01 — Audit RBAC

## Conclusion

**CONFORME avec réserves UX.** Aucun accès hors agence/concession ni exposition de montants sensibles n'a été démontré. La protection effective est serveur; les cartes masquées ne constituent pas l'unique barrière.

## Chaîne de contrôle

1. `/dashboard/overview` et `/global-search` imposent `requirePermission('dashboard.view')` (`dashboard.routes.ts:20,39`).
2. `dashboardScope` intersecte le scope de `dashboard.view` avec celui de la permission métier (`:16-17`).
3. Les scopes supportés sont :
   - GLOBAL : `1=1`;
   - CONCESSION : agences partageant le `concession_id` de l'agence utilisateur;
   - AGENCY : `agency_id = user.agencyId`;
   - OWN : colonne propriétaire = `user.sub`, uniquement quand une colonne propriétaire est définie.
4. Une permission manquante ou un scope OWN sans propriétaire applicable produit `null`; le KPI devient `null` ou un tableau vide. C'est un refus conservateur.

## Matrice des API Dashboard

| Donnée | Permission métier | Propriétaire OWN | Protection sensible |
|---|---|---|---|
| CA / séries | billing.view | aucun : OWN refusé | montant non renvoyé sans intersection |
| Marge | sales.view + vehicles.financials.view | salesperson_id | double intersection |
| Ventes | sales.view | salesperson_id | compteur filtré |
| CRM | crm.prospect.view | règles `crmLeadScope` | visibilité CRM intersectée deux fois |
| Véhicules | vehicles.view | aucun : OWN refusé | compteurs et distribution filtrés |
| Showroom | showroom.view | assigned_user_id | filtré |
| Livraisons | delivery.view | delivery_specialist_id | filtré |
| Atelier | service.order.view | advisor_id | filtré |

La réponse contient aussi des booléens `permissions`, mais ceux-ci ne remplacent pas les prédicats SQL.

## Recherche globale

`dashboard.routes.ts:39-51` applique `dashboard.view` puis la permission/scopie métier propre à chaque type : customers, leads, sales, invoices, repair orders, vehicles et parts. La recherche :

- refuse moins de 2 caractères;
- tronque à 120 caractères;
- échappe `%`, `_` et `\` pour LIKE;
- paramètre les valeurs SQL;
- limite chaque catégorie à cinq résultats;
- ne renvoie aucune catégorie sans scope autorisé.

L'endpoint facture utilise `created_by` pour OWN; les véhicules n'ont pas d'OWN applicable; les pièces passent par `part_stocks.agency_id`. Les tests de portée transversale passent.

## Réserves

- **P3 confirmé :** la zone graphiques est conditionnée côté UI par `reporting.view` (`DashboardPage.tsx:172`) alors que l'API exige `billing.view`. Le backend empêche toute fuite, mais un utilisateur reporting sans billing voit une zone vide, et un utilisateur billing sans reporting ne voit pas ses séries autorisées.
- Les listes OR/livraisons passent par leurs propres hooks et permissions. Le problème constaté est le filtre de statut, pas le RBAC.
- Les scopes OWN non applicables sont silencieusement privés de données. Sécurisé, mais une documentation produit devrait expliciter ce comportement.

## Tests et couverture manquante

Les 32 tests backend ciblés, incluant CRM et recherche transversale, passent. Pour clôturer totalement le risque, ajouter sans changer les règles :

- matrice d'intégration GLOBAL/CONCESSION/AGENCY/OWN avec deux concessions et plusieurs agences;
- assertions explicites qu'un scope OWN non applicable ne reçoit aucun agrégat;
- contrôles sur les tableaux `weeklySeries`, `revenueTrend` et `stockDistribution`, pas seulement les cartes;
- E2E avec comptes réels aux permissions partielles.
