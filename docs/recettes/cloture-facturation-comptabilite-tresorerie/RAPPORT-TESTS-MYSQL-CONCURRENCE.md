# Tests MySQL et concurrence

Idempotence exécutée pour reprise historique, facture, quatre paiements, entrée, sortie, transfert, avoirs et remboursements. Le double remboursement simultané avec la même clé produit une création et un doublon, puis deux doublons au rejeu. Les contraintes et verrous MySQL empêchent les doublons contrôlés. Les variantes simultanées double facture, double transfert et double comptabilisation n’ont pas été exécutées comme scénarios dédiés et restent une extension de couverture, sans anomalie observée dans les parcours rejoués.

Le SAV confirme les quantités réelles (réservé 2, consommé 1, retourné 1), le solde facture nul et l’unicité du règlement et du mouvement de 53 505 XAF.

La recette finale confirme à nouveau la concurrence de remboursement sur MySQL 8.4 réel : une création, un doublon, total borné à 100 000 XAF. Les scénarios réels de livraison, clôture, paiements, trésorerie et intégration comptable exécutés lors du lot restent réussis.
