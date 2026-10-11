# STABILISATION-ERP-03 — Recette CRM

Campagne réelle sur `lca-recette` uniquement. Cinq prospects `REC03-` ont été créés par l'API officielle : particulier avec budget/reprise, entreprise flotte, particulier sans budget, prospect perdu et prospect réaffecté. Les étapes réellement définies sont `new`, `contacted`, `qualified`, `appointment`, `test_drive`, `offer`, `negotiation`, `won`, `lost`.

Validations exécutées : création particulier/entreprise, espaces/accentuation, budget nul et renseigné, modification, recherche, pagination, filtre étape/priorité/commercial, doublon indicatif, affectation/réaffectation, transition `new → contacted → qualified`, rendez-vous, conflit de créneau 409, perte avec motif, activité, accès direct et scopes.

Le prospect #1 est au stade `appointment`, #4 est `lost`; les trois autres restent `new`. Une qualification directe depuis `new` est refusée 409. Le filtre frontend « Toute l'équipe » affiche les deux prospects OWN du Commercial et n'est pas vide.

Les étapes `test_drive`, `offer`, `negotiation` et `won` exigent leurs actions métier (essai, devis, vente) et ne sont pas forcées ici. La mission interdit de créer une vente : elles sont donc non exécutées et préparées pour la campagne suivante.

