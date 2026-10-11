# STABILISATION-ERP-03 — Réserves

1. Notifications CRM absentes en base et inaccessibles au COMMERCIAL faute de permissions.
2. Aucun workflow officiel de conversion/liaison prospect vers client existant.
3. Inter-concessions toujours bloqué faute de seconde concession officielle.
4. Les étapes essai, offre, négociation et gagné sont reportées car elles déclenchent les campagnes Showroom/Devis/Vente.
5. Socket.IO CRM n'est pas validable de bout en bout tant que l'événement notification n'est pas persisté.
6. Pas de test de charge, responsive exhaustif ou pagination à forte volumétrie.
7. La stratégie de mises à jour concurrentes reste « dernière écriture gagnante » pour un même champ.

Verdict : **PRÊT AVEC RÉSERVES POUR LA CAMPAGNE VENTES**, après arbitrage prioritaire sur notifications et conversion CRM→Client.

