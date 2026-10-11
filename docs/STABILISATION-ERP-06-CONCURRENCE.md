# ERP-06 — Concurrence et idempotence

Deux requêtes de planification simultanées sur la vente #5 ont produit une création et un conflit. MySQL conserve une seule livraison active pour cette vente.

Après finalisation, deux rejeux simultanés de la signature ont retourné le dossier existant. Les contrôles SQL confirment exactement une signature, un document métier archivé et une livraison par vente. L'autorisation partielle n'a été consommée qu'une fois.

Le code HTTP du rejeu reste 200 pour la signature déjà finalisée. Aucun changement de contrat n'a été imposé : le critère métier d'absence de doublon est respecté.
