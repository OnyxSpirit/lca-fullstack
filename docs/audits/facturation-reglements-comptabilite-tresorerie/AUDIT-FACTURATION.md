# Audit facturation

## Présent

Liste `/billing`, détail `/billing/:id`, création manuelle/vente/atelier/pièces, brouillon, modification du brouillon, émission, annulation non encaissée, avoir, PDF, GED et export comptable. API principale : `/api/invoices*`, permissions `billing.invoice.*` et `billing.export`.

La liste dispose de recherche, statut, type, dates et pagination serveur. Les montants de paiement sont masqués sans `billing.payment.view`. L’émission rend la facture immuable ; numéros et idempotency keys sont uniques.

## Preuves

- Automatisé exécuté : suites facturation et exports réussies.
- MySQL : 6 factures, total 240 000 XAF ; aucun écart `total - amount_paid - balance_due` ; aucun montant négatif.
- Inspection : transaction, verrou facture/vente/OR, validation TVA, échéance, client/agence, archivage canonique.
- Navigateur : BLOQUÉ à la connexion ; aucun bouton métier déclaré testé.

Verdict : **CONFORME AVEC RÉSERVES**.
