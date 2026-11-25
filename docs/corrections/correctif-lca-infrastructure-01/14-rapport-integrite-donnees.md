# Intégrité des données

Avant migration, principal et restauration concordaient : 242 tables, 64 migrations, 264 étapes, 2 rôles, 383 permissions, 0 client, 0 facture, total factures 0,00, 0 employé. La FK factures ne contenait aucun orphelin.

Après montée isolée, les variations sont exclusivement les objets/permissions attendus de 135–137. Les factures, clients, montants, encaissements et employés sont restés identiques. La FK finale relie `invoices.customer_id NULL` à `customers.id`, RESTRICT/RESTRICT, sans doublon ni orphelin. Les tests ciblés conservent explicitement une facture historique `(10, client 1)` dans tous les scénarios de reprise.
