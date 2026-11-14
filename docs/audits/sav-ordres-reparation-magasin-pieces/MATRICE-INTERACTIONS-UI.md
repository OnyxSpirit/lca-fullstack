# Matrice des interactions UI

| Page | Interactions inventoriées | Résultat |
|---|---|---|
| Service | onglets, recherche, filtres/statuts, création OR, pagination, navigation détail | Code/tests OK ; clics authentifiés bloqués 2FA |
| Détail OR | actions de phase, formulaires, checkboxes qualité, affectations, sessions, PDF | 161 tests frontend ciblés globalement OK |
| Transit | choix moyen/destination, montant borné, création, confirmer/refuser | Défaut scope SA ; contrôles UI présents |
| Journal | recherche, liens OR, tableau | Présent ; pas pagination/tri/export |
| Reporting | dates, cartes, tableau moyens | Présent ; pas agence/export |
| Pièces | onglets, recherche, catégories, formulaires, commandes, réception, inventaire PDF | Tests ciblés OK ; E2E bloqué |
| Détail pièce | filtre type/date, pagination mouvements, PDF | Tests/inspection OK |
| File SAV magasin | ouvrir demande, préparer, emplacement, expédier, PDF | Tests ciblés OK |

Les contrôles visibles n'ont pas été déclarés E2E réussis sans clic authentifié réel.

