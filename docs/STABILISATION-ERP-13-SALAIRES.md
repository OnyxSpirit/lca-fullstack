# STABILISATION-ERP-13 — Salaires

L’historique salarial est append-only : création autorisée, montant strictement positif, date d’effet valide et unicité employé/date. Les essais nul et doublon retournent respectivement `400` et `409`.

Aucune route de modification ou suppression d’un salaire n’existe. Un historique réel est conservé, sans reproduire son montant dans les livrables.
