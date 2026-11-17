# Matrice des interactions UI

| Surface | Interactions observées | Résultat |
|---|---|---|
| Facturation | liste, détail, états de paiement, export CSV | Réussi |
| Trésorerie | journal, filtres, mouvements, contrepassation | Réussi |
| Comptabilité | Grand livre, Intégrations, écritures comptabilisées | Réussi |
| SAV OR 5 | détail, étapes verrouillées, facture, contrôle qualité, clôture, historique | Réussi |
| PDF/GED | facture, reçu, OR (2 pages), rapport financier, archives SAV | Réussi |
| Responsive | 1440×1000, 768×1024, 390×844 | Réussi sur parcours ciblés |
| RBAC | accès/refus directs et changement d’agence | API exhaustive ; navigateur représentatif |

Validation finale du bundle Docker reconstruite avec `VITE_API_URL=/api`. Les statuts SAV visibles sont francisés (`Terminée`, `Facturé → Clôturé`, etc.).
