# STABILISATION-ERP-05 — Tests

- Backend TypeScript : réussi.
- Tests backend ciblés : 4/5 fichiers réussis ; le cinquième contient 2 assertions historiques périmées.
- Frontend TypeScript : réussi.
- Suite frontend : 755/786 réussis, 31 échecs historiques ; les tests Vente/Facture/Paiement majeurs réussissent, `SALE-DISCOUNT` reste rouge.
- API réelle : 92 appels mesurés, 0 réponse 5xx.
- MySQL : ventes, réservations, stock, factures, paiements, autorisation, audits, notifications et GED contrôlés.
- Navigateur port 3001 : liste et détail rendus, aucune erreur console.

Script reproductible : `scripts/stabilisation-erp-05-sales.mjs`. Il nécessite les variables de `.env.recette` et ne révèle aucun secret.
