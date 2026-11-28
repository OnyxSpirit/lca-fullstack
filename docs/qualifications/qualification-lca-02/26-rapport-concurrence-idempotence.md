# Concurrence et idempotence

Les suites couvrent verrous, doubles soumissions, paiements, retours, rendez-vous, inventaires et migrations reprises. Le rejeu du bootstrap sur le schéma frais retourne `VERSIONED` au niveau 137 sans avertissement.

La passe conditionnelle active réellement les scénarios de concurrence et d’idempotence sur MySQL 8.4 ; chaque reprise est exécutée sur un schéma isolé afin d’éviter qu’une clé métier fixe d’un passage antérieur produise un faux échec.
