# Tests E2E A à L

| Scénario | Résultat définitif |
|---|---|
| A Facturation vente/manuelle | Réussi API, MySQL et navigateur |
| B Paiement partiel puis intégral | Réussi ; quatre paliers de 100 000 XAF, solde nul |
| C Multimodes | Réussi : espèces, carte, virement, Mobile Money |
| D Facturation SAV | Réussi lors de la recette de référence, sans régression |
| E Entrée manuelle | Réussi : 75 000 XAF |
| F Sortie de fonds | Réussi : 25 000 XAF ; refus de solde et catégorie vérifiés |
| G Transfert | Réussi : 50 000 XAF et contrepassation contrôlée |
| H RBAC multi-agences | Réussi : 7 profils navigateur, 6 profils API, 2 agences |
| I Reporting/export | Réussi, écrans et exports contrôlés |
| J Concurrence/idempotence | Réussi : remboursement concurrent = une création + un doublon |
| K Comptabilité | Réussi : schémas, événements et écritures équilibrées |
| L Francisation/responsive | Réussi : aucun identifiant technique brut ciblé ; 3 viewports |

Les contrôles transversaux couvrent permissions, multi-agences, persistance, changement d’agence, concurrence, PDF/GED, exports, TypeScript, builds et suites globales. Aucun 5xx fonctionnel n’a été observé.
