# Matrice des interactions UI

| Surface | Interactions observées | Résultat |
|---|---|---|
| Facturation | liste, détail, états de paiement, export CSV | Réussi |
| Trésorerie | journal, filtres, mouvements, contrepassation | Réussi |
| Comptabilité | Grand livre, Intégrations, écritures comptabilisées | Réussi |
| SAV OR 5 | détail, étapes verrouillées, facture, contrôle qualité, clôture, historique | Réussi |
| PDF/GED | facture, reçu, OR (2 pages), rapport financier, archives SAV | Réussi |
| Responsive | 1440×900, 768×1024, 375×812 | Réussi sur parcours financiers |
| RBAC | accès/refus directs, boutons, menus, changement d’agence | API et navigateur exhaustifs sur la matrice définie |

Validation finale du bundle Docker reconstruite avec `VITE_API_URL=/api`. Les statuts SAV visibles sont francisés (`Terminée`, `Facturé → Clôturé`, etc.).
