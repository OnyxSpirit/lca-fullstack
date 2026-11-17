# Audit intégration Facturation ↔ Trésorerie

## Chaîne implémentée

`POST /invoices/:id/payments` verrouille facture et doublon, crée paiement, poste le mouvement Treasury, actualise facture/vente, audite, notifie et archive le reçu. Tout échec transactionnel annule l’ensemble. Les remboursements et annulations utilisent des mouvements compensatoires.

## État réel

La recette n’a ni compte, ni mapping, ni configuration Treasury active. Les deux paiements historiques ont `treasury_account_id=NULL` et aucun mouvement. L’automatisation comptable ne découvre un paiement qu’après mouvement Treasury `POSTED` : aucun paiement de recette n’est donc intégré à la comptabilité centrale.

Verdict : **PARTIELLEMENT CONFORME**. Le moteur existe, mais l’intégration n’est pas opérationnelle dans l’environnement demandé.
