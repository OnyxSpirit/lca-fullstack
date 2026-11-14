# Rapport de tests RBAC

- Réellement exécuté/automatisé : campagne RBAC backend (11 suites) et frontend (28 tests) réussie ; test final des scopes réussi.
- Cas final : `GLOBAL` et `CONCESSION` du Super Admin migré deviennent `agency_id=?` avec l’agence active ; `AGENCY` et `OWN` restent inchangés ; aucun fallback vers l’agence JWT si le contexte actif est nul ; un utilisateur ordinaire `GLOBAL` est refusé.
- Inspection statique : permissions `service.journal.view`, `service.reporting.view` et `service.reporting.export` contrôlées.
- Navigateur/bloqué : matrice réelle multi-rôles non exécutée, profils absents et 2FA requis.
- Non exécuté : altération de rôles ou permissions de recette.

Verdict : **régression SAV-001 corrigée, réserve sur la recette réelle multi-profils**.
