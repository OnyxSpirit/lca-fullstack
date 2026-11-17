# Rapport Rapports & Indicateurs

La page `/reports` conserve ses filtres temporels, consolidations, tableaux, graphiques et exports existants. Un panneau fiscal permissionné présente le nombre d’obligations, les montants déclarés/réglés/restants, les éléments à traiter et les échéances dépassées.

Le calcul est effectué par MySQL, borné par la période et l’agence active. Aucun montant n’est converti implicitement et aucun taux n’est inventé. Les tests de contrat reporting existants et la suite frontend complète restent verts.

## Preuve finale

`reporting-mysql.integration.test.ts` a exécuté 5/5 scénarios sur MySQL 8.4 : réconciliation facture/avoir/paiement, dates réelles des remboursements, ventes et marges, stock courant et CSV, granularités et dates invalides. Les refus d’agence et l’intersection entre `reporting.view`, `reporting.export` et les permissions sources sont vérifiés. Les valeurs nulles ou à zéro ne produisent ni pourcentage infini ni donnée fictive.

Verdict : **VALIDÉ**.
