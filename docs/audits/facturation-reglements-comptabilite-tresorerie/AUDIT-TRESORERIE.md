# Audit trésorerie

Le code fournit comptes bancaires/caisses, catégories, entrées/sorties manuelles, engagements, transferts, mouvements, clôture, pièces GED, temps réel et rapprochement bancaire.

État réel de recette : `treasury_accounts=1` (`REC-BANK`), catégories=0, mappings=0, configurations=0, mouvements=0, opérations manuelles=0, transferts=0, relevés=1. Ce compte isolé ne suffit pas : les nouveaux encaissements ne disposent d’aucun mapping/configuration exploitable.

Tests automatisés : réussis. Navigateur authentifié : écrans pilotage, opérations, paramétrage et rapprochement parcourus sur une recette isolée vide ; formulaire d’entrée/sortie visible, sans compte ni catégorie sélectionnable. Verdict : **NON CONFORME EN RECETTE**, non à cause d’un défaut démontré du moteur mais d’une absence de configuration exploitable.
