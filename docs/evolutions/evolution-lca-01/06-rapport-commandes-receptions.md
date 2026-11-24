# Rapport commandes et réceptions

La commande porte un modèle commercial, une agence, une quantité et une clé d'idempotence. La réception verrouille la commande et les véhicules restants avec `FOR UPDATE`, choisit les identifiants dans un ordre stable, modifie uniquement la quantité demandée, journalise les statuts et l'audit puis valide en une transaction.

Essai HTTP/MySQL : commande de 10, réception de 4, deux réceptions concurrentes de 6 ; une seule réussit et l'autre reçoit 409. Total final 10, nouvelle réception refusée. Aucun véhicule additionnel n'est créé pendant la réception.
