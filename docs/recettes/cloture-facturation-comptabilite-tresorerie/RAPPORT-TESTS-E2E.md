# Tests E2E A à L

| Scénario | État |
|---|---|
| A Facturation vente | API/MySQL réussi ; liste Facturation et export CSV vérifiés sous Chromium |
| B Paiement partiel | API/MySQL réussi ; états de Facturation observés sous Chromium |
| C Multimodes | API/MySQL réussi, idempotence vérifiée |
| D Facturation SAV | Réussi API/MySQL/navigateur : OR 5 clôturé, facture 4 payée, règlement 7, trésorerie 18, 53 505 XAF |
| E Entrée manuelle | API/MySQL réussi |
| F Sortie de fonds | API/MySQL réussi, refus de catégorie incompatible vérifié |
| G Transfert | API/MySQL réussi, soldes et rejeu vérifiés |
| H RBAC multi-agences | Réussi par API officielle : 6 profils, changement, recalcul, révocation et réactivation |
| I Reporting | Centre de pilotage observé sous Chromium tablette ; export Facturation vérifié |
| J Concurrence | Remboursement concurrent et rejeux idempotents réussis ; unicité MySQL confirmée |
| K Comptabilité | Événements, écritures équilibrées, Grand livre et Intégrations vérifiés |
| L Francisation | Parcours financiers et détail SAV ciblés sans statut anglais détecté dans le bundle final |

Preuves visuelles : répertoire `preuves-navigateur/`. La suite Chromium couvre 1440×1000, 768×1024 et 390×844, sans erreur JavaScript ni réponse API 5xx.

Le scénario D a aussi vérifié trois refus métier (réception sans inspection, facturation anticipée, contrôle qualité prématuré), le retour d’une pièce sur deux, cinq archives GED et les PDF facture/reçu/OR. La migration 129 corrige les types de mouvements de pièces nécessaires à la livraison interne et au retour SAV.
