# Matrice des interactions UI finale

| Écran | Interactions contrôlées | État |
|---|---|---|
| OR | ouverture, statuts, devis, pièces, temps, facture | Inspection + tests automatisés ; navigateur bloqué |
| Magasin | recherche, stock, réservations, approvisionnement | Inspection + automatisé ; navigateur bloqué |
| Transit | destination, montant, initier, confirmer/refuser | Inspection + automatisé ; navigateur bloqué |
| Journal | recherche, dates, tous types OR/paiement/transfert, tris, pages, CSV | Corrigé et automatisé |
| Reporting | agence RBAC, dates, actualiser, CSV, états vides/erreurs | Corrigé et automatisé |

Les contrôles frontend existent réellement dans `SavBusinessSections.tsx`, leurs appels API sont permissionnés et les états chargement/vide/erreur sont rendus. Le test navigateur authentifié n’a pas été exécuté au-delà du challenge 2FA ; les clics métier ne sont donc pas déclarés validés visuellement.
