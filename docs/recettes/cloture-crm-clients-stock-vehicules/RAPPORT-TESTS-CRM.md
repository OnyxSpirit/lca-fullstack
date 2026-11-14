# Rapport de tests CRM

- Liste filtrable par `active`, `archived` ou `all`.
- Archivage et réactivation idempotents, avec motif, acteur et activité.
- Prospect archivé exclu du flux actif et privé de nouvelles actions commerciales.
- Création d’essai et de devis refusée côté serveur pour un prospect archivé.
- Tests exécutés : `crm-agency-rbac`, `crm-customer-stock-closure`, trois suites devis ; résultat vert.
- Recette navigateur : archivage avec motif, disparition de la vue active, présence dans le filtre « Prospects archivés », activité d’archivage visible, puis réactivation et disparition de la vue archivée.
