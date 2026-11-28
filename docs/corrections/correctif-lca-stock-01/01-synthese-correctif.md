# Synthèse du correctif LCA-STOCK-01

La saisie d'une commande en flotte est réduite à la marque, au modèle, à une version facultative, à la quantité et à une illustration facultative. La marque et le modèle peuvent être recherchés/sélectionnés ou ajoutés explicitement depuis le formulaire. Les références nouvelles, la commande et les N fiches sont persistées dans une seule transaction. La réception est déterminée exclusivement par `vehicle_order_receipts`.

État final au 28 novembre 2026 : backend 2 399/2 399 exécutés hors 107 conditionnels (2 292 réussis, 107 ignorés dans ce mode), frontend 1 103/1 103, compilations et lints réussis. Les 107 intégrations conditionnelles ont été réellement qualifiées dans leurs bancs appropriés. La recette complémentaire Chromium, HTTP, MySQL 8.4, PDF et trois sessions WebSocket porte la matrice à **130/130 réussis**, sans cas ouvert. Verdict : **VALIDÉ**.
