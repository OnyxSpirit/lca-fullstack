# Matrice des fonctionnalités

| ID | Domaine | Fonction | Preuve | Statut |
|---|---|---|---|---|
| F-VTE-01 | Vente | liste/recherche/pagination | navigateur | CONFORME |
| F-VTE-02 | Vente | création directe | navigateur+MySQL observé via UI | CONFORME |
| F-VTE-03 | Vente | remise/prix minimum | navigateur | CONFORME |
| F-VTE-04 | Vente | confirmation sans facture | navigateur | CONFORME au workflow actuel |
| F-VTE-05 | Vente | confirmation commande séparée | code+UI | ABSENTE, obsolète |
| F-VTE-06 | Vente | facture associée | navigateur | CONFORME |
| F-VTE-07 | Vente | paiement associé | navigateur | CONFORME |
| F-VTE-08 | Vente | annulation impayée | tests ciblés, pas navigateur | PARTIELLE |
| F-VTE-09 | Vente | double vente/concurrence | MySQL 8.4 jetable | CONFORME |
| F-DEV-01 | Devis | création opportunité | navigateur | CONFORME |
| F-DEV-02 | Devis | modification brouillon | contrôle visible, non rejoué | PARTIELLE |
| F-DEV-03 | Devis | émission/archivage | navigateur | CONFORME |
| F-DEV-04 | Devis | conversion vente | bouton éligible | PARTIELLE |
| F-DEV-05 | Devis | transformation pro forma | navigateur | CONFORME |
| F-DEV-06 | Devis | PDF | extraction+hash GED | CONFORME |
| F-DEV-07 | Devis | annulation/refus/expiration | code seulement | NON TESTÉE |
| F-PRO-01 | Pro forma | création autonome | navigateur | CONFORME |
| F-PRO-02 | Pro forma | création depuis devis | navigateur | CONFORME |
| F-PRO-03 | Pro forma | modification brouillon | navigateur | CONFORME |
| F-PRO-04 | Pro forma | émission/numéro | navigateur | CONFORME |
| F-PRO-05 | Pro forma | PDF/GED | extraction+hash GED | DÉFECTUEUSE identité client |
| F-PRO-06 | Pro forma | annulation/expiration | inspection | À ARBITRER |
| F-SHO-01 | Showroom | recherche | navigateur | CONFORME |
| F-SHO-02 | Showroom | affectation | navigateur | CONFORME |
| F-SHO-03 | Showroom | prise en charge | navigateur | CONFORME |
| F-SHO-04 | Showroom | compteurs | navigateur | CONFORME |
| F-SHO-05 | Showroom | essai planifié/démarré/retourné | navigateur | CONFORME |
| F-SHO-06 | Showroom | rendez-vous/réaffectation/annulation | non rejoué | NON TESTÉE |
| F-LIV-01 | Livraison | candidat et planification | navigateur | CONFORME |
| F-LIV-02 | Livraison | gate financier | navigateur | CONFORME |
| F-LIV-03 | Livraison | checklist | navigateur | CONFORME |
| F-LIV-04 | Livraison | contrôle qualité | navigateur | CONFORME |
| F-LIV-05 | Livraison | finalisation | navigateur | CONFORME |
| F-LIV-06 | Livraison | heure rendez-vous | navigateur | DÉFECTUEUSE |
| F-LIV-07 | Livraison | signature/PV | navigateur+statique | À ARBITRER |
| F-LIV-08 | Livraison | autorisation avec solde | 8 tests MySQL concurrents | CONFORME |
| F-LIV-09 | Livraison | vente annulée/rejeu | MySQL 8.4 jetable | CONFORME |
| F-LIV-10 | Livraison | isolation inter-agence complète | suite RBAC | NON TESTÉE, fixture bloquée par 2FA |

Clôture : les statuts NON TESTÉ conservés correspondent à des interactions non rejouées ou à un blocage explicite ; ils ne sont pas assimilés à une conformité.
