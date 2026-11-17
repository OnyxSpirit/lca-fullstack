# Audit comptabilité

Périmètre présent : plan SYSCOHADA, exercices/périodes, journaux, écritures double entrée, validation, comptabilisation, contrepassation, grand livre, balance, auxiliaires, clôtures, contrôles, reports à nouveau, états, échanges et intégration automatique.

MySQL : 19 comptes, 5 journaux, 5 exercices/périodes, 5 écritures et 10 lignes. Toutes les écritures contrôlées sont équilibrées. Quatre factures multi-agences ont des écritures `POSTED`. Deux événements historiques (facture 9002 et avoir 9001) restent `REGULARIZE` avec « Aucun schéma comptable actif ».

Automatisé : moteurs, automation et MySQL réussis. Navigateur : BLOQUÉ. Verdict : **PARTIELLEMENT CONFORME**, la régularisation historique restant nécessaire par une procédure contrôlée.
