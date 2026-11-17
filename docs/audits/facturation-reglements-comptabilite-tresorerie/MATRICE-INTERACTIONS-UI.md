# Matrice des interactions UI

| Écran | Contrôles inventoriés | Preuve |
|---|---|---|
| Factures | recherche, statuts, types, dates, pages, création, export, détail | Liste, filtres et formulaire testés sur état vide ; détail non testable |
| Détail facture | modifier, émettre, annuler, payer, avoir, remboursement, reçu/PDF | Code + tests ; clic réel bloqué |
| Pilotage | période, agence, devise, granularité, pages, source, exports, impression | Écran et filtres parcourus ; résultats vides |
| Treasury | onglets, comptes, catégories, flux, opérations, transferts, documents | Écrans, onglets et formulaires parcourus ; données absentes |
| Comptabilité | 10 onglets, recherches, statuts, formulaires, exports, PDF | 10 onglets parcourus ; référentiels métier absents |
| Rapprochement | import, aperçu, validation, candidats, allocations, écarts, annulation | Écran parcouru ; aucune donnée réelle |

Les preuves navigateur portent sur la navigation, les contrôles et les états vides. Les soumissions financières et contrôles de résultats restent couverts uniquement par les tests automatisés.
