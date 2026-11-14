# Rapport de non-régression

Sept suites ciblées passent sur sept (durée 23,9 s) : CRM, clôture CRM/Client/Stock, Client RBAC, Devis agence, négociation/émission, Devis RBAC dynamique et Véhicules RBAC dynamique. La suite d’intégration MySQL réelle dédiée passe également (2 tests sur 2) dans un schéma jetable supprimé après exécution.

La migration 127 est additive. Elle est enregistrée dans `schema_migrations`; trois nouvelles tables et six colonnes attendues sont présentes. Les volumes métier observés avant/après restent inchangés : 6 clients, 1 prospect, 2 véhicules.

Aucun reset, truncate, commit, push ou déploiement n’a été réalisé. La fixture navigateur a été nettoyée transactionnellement et les compteurs initiaux ont été retrouvés.
