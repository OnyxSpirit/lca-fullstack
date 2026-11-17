# Rapport MySQL et concurrence

Contraintes constatées : numéros facture/paiement uniques, idempotency keys uniques, mouvement unique par source/événement, contrepassation unique, source comptable unique. Les services utilisent transactions et `FOR UPDATE` sur facture, paiement, avoir, compte, transfert et allocations.

Tests MySQL automatisés exécutés : paiements/annulation, exports, Treasury, comptabilité, clôture, rapprochement — réussis. Contrôles réels : 0 facture incohérente, 0 paiement orphelin, 0 agence client/facture incohérente, 0 écriture déséquilibrée.

Aucun test concurrent destructif n’a été injecté dans les données financières préexistantes.
