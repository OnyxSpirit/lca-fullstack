# ERP-14 — Ventes et facturation

La vente REC14 annulée ne peut plus produire de facture (`409`). Les chaînes vente → facture existantes ont été relues sans mutation et conservent leurs références.

Les transitions officielles restent `reserved → ordered → confirmed → preparation`; la préparation exige la couverture financière. Aucune nouvelle règle « facture avant confirmation » n’a été imposée.
