# Audit règlements et encaissements

La collecte exige facture encaissable, idempotency key, moyen actif, destination Treasury compatible, référence/justificatif selon le mode, date non future et montant ≤ solde. Facture, paiement et mouvement sont créés dans une même transaction ; `postAutomaticMovement` possède une unicité source/événement.

MySQL : 2 paiements (un remboursé 118 000 XAF, un confirmé 1 XAF), sans orphelin ni incohérence d’agence. Tous ont une clé idempotente, mais aucun n’a de compte Treasury et aucun mouvement Treasury n’existe : ce sont des données historiques/fixtures non intégrées.

Tests automatisés exécutés : paiements, annulation, destinations, concurrence MySQL, reçus et intégration — réussis. Navigateur : BLOQUÉ. Verdict : **PARTIELLEMENT CONFORME** en recette.
