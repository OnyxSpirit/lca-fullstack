# STABILISATION-FINALE-ERP — matrice

| Domaine | Preuve | État |
|---|---|---|
| Authentification | login, `/me`, refresh rotatif, logout | VALIDÉ |
| RBAC dynamique | création rôle, OWN/AGENCY, retrait, désactivation, anti faux SUPER_ADMIN | VALIDÉ |
| MySQL 8.4 | bootstrap frais 072–076 sur 8.4.11 | VALIDÉ |
| Véhicules | API critique + écran port 3001, 3 véhicules | VALIDÉ sur périmètre testé |
| Atelier / OR | écran port 3001, 2 OR, origine commerciale visible au reporting | VALIDÉ sur périmètre testé |
| Billing | écran port 3001, 3 factures, totaux/encaissements cohérents visuellement | VALIDÉ sur périmètre testé |
| Reporting | synthèse, Atelier par origine, finance consolidée chargés | VALIDÉ sur périmètre testé |
| Compilation backend | lint et build | VALIDÉ |
| Compilation frontend | lint et build | VALIDÉ |
| Tests backend globaux | 45 échecs | NON VALIDÉ |
| Tests frontend globaux | 38 échecs | NON VALIDÉ |
| Recette exhaustive mutations | non exécutée sur tous les modules | NON VALIDÉ |

Le verdict global est gouverné par les deux lignes de suites globales : **NON VALIDÉ**.
