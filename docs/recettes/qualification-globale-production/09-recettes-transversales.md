# Recettes transversales

La campagne transversale automatisée couvre Commercial, SAV, Pièces, Financier, RH, scopes agence, sessions fortes et changements de contexte. Pour la politique multi-étapes :

- RH : création, décision, engagement, réservation et paiement par un acteur cumulant les permissions ; réussi.
- Trésorerie : soumission/approbation restent permissionnées sans comparaison d'identité ; liquidité, budget, verrou et idempotence conservés.
- Comptabilité, factures fournisseurs et avoirs : aucune interdiction créateur=validateur dans le code actif ; statuts et intégrité financière conservés.
- SAV, Pièces, Ventes et Livraison : aucune séparation artificielle détectée ; les confirmations physiques et décisions client restent des faits métier légitimes.

Chaque mutation conserve son auteur et son action dans les historiques/audits.

La clôture pagination a ajouté une preuve multi-agences : 121 enregistrements dans l'agence active et 17 dans une agence sœur pour chacun des deux domaines. Les réponses, compteurs et agrégats de la session active ne contiennent que l'agence 1. Les pages demandées hors plage sont corrigées par le serveur après filtrage.
