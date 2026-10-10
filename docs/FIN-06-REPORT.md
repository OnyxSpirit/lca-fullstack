# FIN-06 — Reporting financier consolidé

## Verdict

Implémenté. Le reporting reste opérationnel : il ne crée ni grand livre, ni balance, ni compte de résultat. Les migrations 072 à 075 sont inchangées et aucune migration n’a été nécessaire.

## A — Sources de vérité

- Trésorerie : `treasury_accounts` et mouvements `POSTED`, par `value_date`.
- Clients : factures, avoirs, paiements et remboursements FIN-01. Un paiement historique `refunded` n’est repris que s’il n’a aucune ligne dans `payment_refunds`.
- Budgets : enveloppes décidées et dépenses `approved` FIN-02 ; les paiements ne réduisent pas deux fois le disponible à engager.
- Fournisseurs : factures et avoirs `VALIDATED` FIN-05, décaissements Treasury et contrepassations.
- Rémunérations : agrégats FIN-04, sans identité individuelle et avec intersection obligatoire `hr.salary.view`.
- Couverture : calcul FIN-03 réutilisé sans duplication.

## B — Conventions

Les flux utilisent `[from, to + 1 jour)`. Les soldes utilisent `asOf`. Chaque ligne porte sa devise ; aucune conversion ou addition inter-devises n’est réalisée. Les transferts internes sont visibles séparément mais exclus des entrées et sorties économiques consolidées.

## C — Sécurité

Chaque section intersecte `reporting.view` avec les permissions métier. L’export ajoute `reporting.export`. Les scopes `AGENCY`, `CONCESSION` et `GLOBAL` sont appliqués ; `OWN` est refusé pour ces agrégats collectifs. Le panneau frontend masque les sections non autorisées.

## D — API et export

- `GET /api/reports/financial/:section`
- `GET /api/reports/financial-export/:section`
- sections : `treasury`, `customers`, `budgets`, `suppliers`, `remunerations`, `coverage`

Paramètres : `from`, `to`, `asOf`, `agencyId`, `currency`. Le CSV est UTF-8 BOM, séparateur point-virgule, cellules protégées contre l’injection de formule et contient les métadonnées du rapport.

## E — Limites explicites

La couverture FIN-03 est un instantané courant et n’est pas rejouée historiquement. Pour les entités dont l’état courant a été annulé après `asOf`, une reconstruction parfaite n’est possible que si l’historique métier conserve l’ancien état ; l’API annonce cette limite dans `meta.historicalLimitations`.

## F — Recette

Le contrat `fin06-financial-reporting.test.ts` couvre FIN06-01 à FIN06-40. Les builds TypeScript backend et frontend doivent être verts. La recette MySQL 8.4 doit appliquer le bootstrap sur une base jetable, exercer des appels authentifiés et comparer les agrégats API/SQL/CSV, puis supprimer le conteneur et son stockage temporaire.
