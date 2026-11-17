# Audit caisses, comptes et transferts

Les endpoints et UI couvrent création/activation des comptes, mapping moyen de paiement, entrées/sorties, disponibilité, transferts et annulation/contrepassation. Les clés uniques empêchent le double mouvement source et la double contrepassation.

Un compte bancaire isolé existe en recette, mais aucune caisse, catégorie ou configuration exploitable ; aucun transfert réel ne peut être exécuté. Les tests unitaires/intégration MySQL du dépôt passent, mais ne remplacent pas un E2E sur `lca_recette`.

Verdict : **NON TESTÉ FONCTIONNELLEMENT / PARTIELLEMENT CONFORME TECHNIQUEMENT**.
