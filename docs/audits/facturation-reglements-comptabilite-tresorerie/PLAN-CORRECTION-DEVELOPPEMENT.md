# Plan futur de correction et développement

1. Configurer Treasury en recette : comptes, catégories, mappings par moyen/agence, activation et tests de soldes.
2. Concevoir une reprise idempotente des paiements historiques sans mouvement, avec journal avant/après et rollback.
3. Résoudre les événements comptables `REGULARIZE` après validation des schémas.
4. Créer des rôles temporaires métier OWN/AGENCY, exécuter la matrice multi-agences puis les supprimer.
5. Arbitrer et retirer, si confirmé, l’interdiction créateur=validateur des factures fournisseurs.
6. Réconcilier le remboursement historique sans avoir avec une trace de migration/régularisation.
7. Exécuter E2E A–J et contrôles PDF/GED visuels.
8. Refaire les rapprochements MySQL/reporting et documenter les soldes de clôture.

Ce plan n’a pas été exécuté pendant l’audit.
