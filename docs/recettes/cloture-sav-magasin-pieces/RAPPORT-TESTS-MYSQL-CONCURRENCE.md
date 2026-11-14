# Rapport de tests MySQL et concurrence

- Réellement exécuté/automatisé : tests de concurrence/idempotence du périmètre SAV–pièces issus de la campagne ciblée, réussis.
- Inspection statique : transactions, `FOR UPDATE`, disponibilité transit, réservation de pièces et clés d’idempotence.
- Navigateur : sans objet pour la preuve de concurrence ; parcours déclencheur bloqué par 2FA.
- Bloqué : répétition sur données réelles multi-utilisateurs.
- Non exécuté : charge longue, chaos réseau et modification de `concession_erp`.

Aucune migration n’a été ajoutée ; aucun schéma jetable ne reste à nettoyer.
