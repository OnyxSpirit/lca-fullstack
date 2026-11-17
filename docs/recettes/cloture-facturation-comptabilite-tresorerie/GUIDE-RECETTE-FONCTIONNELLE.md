# Guide de recette fonctionnelle

1. Utiliser uniquement `http://127.0.0.1:4177` et la base `lca_financial_e2e`.
2. Sélectionner l’agence à tester et vérifier le recalcul des droits.
3. Créer/émettre une facture, contrôler son PDF, puis enregistrer les règlements.
4. Comparer facture, journal de trésorerie et écritures comptables.
5. Pour chaque rejeu, conserver la même clé d’idempotence et vérifier l’absence de doublon MySQL.
6. Ne jamais appliquer la reprise historique réelle sans autorisation distincte.

## Point de référence final — 17 novembre 2026

Le scénario SAV de référence est l’OR `OR-1794903433769` : facture `FAC-LCABZV-2026-000002`, règlement confirmé et mouvement de trésorerie de 53 505 XAF. Les documents facture, reçu, OR, contrôle qualité et remise sont archivés. La donnée historique de 118 000 XAF provient de la fixture SQL documentaire ; elle ne doit pas être régularisée comme une opération métier réelle.

## Clôture définitive

La recette finale a reconstruit le volume MySQL isolé, appliqué les migrations jusqu’au niveau 129 et reprovisionné les fixtures. Utiliser les six profils `@lca.test` et le Super Administrateur uniquement dans cette recette. Les résultats de référence sont backend 2 215/0 échec et frontend 1 047/1 047.
