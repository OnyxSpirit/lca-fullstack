# ERP-07 — Encaissements

- Modes actifs observés : espèces, carte, virement, chèque, Mobile Money, financement bancaire.
- Les modes configurés avec référence obligatoire refusent une référence vide.
- Paiement nul/négatif : validation backend existante ; dépassement : HTTP 409.
- REC07 : 189 000 XAF partiel puis 1 000 000 XAF complémentaire, tous deux via espèces et mapping Treasury officiel.
- Deux tentatives concurrentes de paiement du solde : une seule création 201, l'autre 409 ; aucun dépassement.
- Archives immuables : reçus #5 et #6, hash présents en GED.
- Mouvements Treasury : deux `IN` POSTED, puis un `OUT` POSTED pour le remboursement.

Les références bancaires réelles et transactions externes n'ont pas été utilisées.
