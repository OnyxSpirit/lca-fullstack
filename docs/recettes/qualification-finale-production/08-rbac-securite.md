# RBAC et sécurité

- Schéma final : `enum('OWN','AGENCY')`, non nul.
- Tentative de persistance de `GLOBAL` : rejetée par MySQL.
- `OWN` : un seul client appartenant à l'utilisateur fictif.
- `AGENCY` : deux clients de l'agence active, aucun de l'agence voisine.
- Changement d'agence : explicite et accompagné d'un recalcul du contexte.
- Filtre `agencyId` hostile : sans élargissement de visibilité.
- Les anciennes valeurs restent uniquement nécessaires pendant le replay historique des migrations et dans les tests négatifs.
