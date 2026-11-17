# Tests de facturation

Test API exécuté : facture `FAC-LCAPNR-2026-000001`, 400 000 XAF, émise, archivée puis soldée. MySQL confirme `paid`, montant réglé 400 000, solde 0. La liste, le détail, les états et l’export CSV ont été observés au navigateur.

Facturation SAV : `FAC-LCABZV-2026-000002`, 53 505 XAF, émise automatiquement après contrôle qualité, payée et archivée. MySQL, écran OR et PDF officiel concordent.
