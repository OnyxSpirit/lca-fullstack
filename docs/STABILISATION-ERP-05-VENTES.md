# STABILISATION-ERP-05 — Ventes

Verdict : **PRÊT AVEC RÉSERVES**. La chaîne Vente réelle a été exécutée sur `lca-recette` (API 3004, MySQL 33321, niveau 079) avec les clients REC03 et le stock REC04.

Trois dossiers de référence sont conservés : vente #2 partiellement réglée et autorisée, vente #5 soldée, vente #4 annulée. La création réserve atomiquement le véhicule et produit une réservation confirmée. La confirmation commerciale transforme le véhicule en `sold`. L'annulation libère le véhicule et annule la réservation.

La recette navigateur demandée a été effectuée sur `http://127.0.0.1:3001` : liste, filtres, tableau, statuts, détail, montants, facture, paiements, garantie et actions se rendent sans page blanche ni erreur console. Ce port montre les données historiques, pas les données isolées REC05 ; les preuves REC05 frontend sont donc partielles.

Réserves principales : rejeu idempotent de création renvoyé en 201 au lieu de 200, message de régularisation visible sur une vente déjà livrée, dialogue natif `window.prompt` pour le motif d'annulation, suites globales historiquement rouges.
