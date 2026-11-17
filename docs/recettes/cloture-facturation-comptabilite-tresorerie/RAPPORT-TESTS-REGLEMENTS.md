# Tests des règlements

Tests API/MySQL exécutés : espèces, carte, virement et Mobile Money, chacun 100 000 XAF. Un mouvement de trésorerie unique correspond à chaque paiement. Le rejeu API retourne `duplicate: true` pour les quatre règlements et ne crée aucun mouvement supplémentaire.

Le paiement SAV 7 de 53 505 XAF est confirmé, solde la facture 4, crée un unique mouvement de trésorerie entrant 18 et une écriture comptable équilibrée. Le reçu PDF a été inspecté visuellement.

Revalidation finale : paiements 1 à 4, espèces/carte/virement/Mobile Money, 100 000 XAF chacun. Les paliers de solde 300 000, 200 000, 100 000 puis 0 XAF sont confirmés.
