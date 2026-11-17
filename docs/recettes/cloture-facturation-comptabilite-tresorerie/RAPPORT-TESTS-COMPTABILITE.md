# Tests de comptabilité

Exécuté : exercice 2025 ouvert, journal VE, comptes SYSCOHADA de recette, quatre schémas et quatre liaisons de trésorerie. L’événement historique régularisé a produit une écriture de 100 000 XAF équilibrée. La facture multimode et ses quatre paiements ont produit cinq écritures, débit total = crédit total = 800 000 XAF.

Le scénario SAV a produit les écritures 12 (facture) et 13 (règlement), chacune équilibrée à 53 505 XAF. Les trois événements d’intégration associés sont `POSTED` et l’écran Comptabilité les affiche en français.

Revalidation finale : exercices 2025/2026, journal VE, comptes SYSCOHADA, quatre schémas et quatre liaisons reprovisionnés. Le profil Comptable accède à `/treasury/accounting`; les autres profils sans permission reçoivent un refus explicite. Aucun enum anglais ciblé n’est visible.
