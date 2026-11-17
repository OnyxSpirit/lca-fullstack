# 06 — Audit Utilisateurs & habilitations

## UI réelle

32 collaborateurs actifs, pagination sur cinq pages, filtres statut/agence/rôle et recherche. Les actions affichées sont pilotées par permission : activité, 2FA, modification, avatar, mot de passe et statut. Le compte courant ne peut pas être désactivé.

La matrice affiche 24 rôles et 382 permissions persistées, organisées par domaine avec recherche et portées. Le rôle système Super Administrateur est en lecture seule. Les politiques 2FA par rôle sont distinctes ; l'obligation du rôle système ne peut pas être retirée.

## Données et tests

- 485 liaisons rôle-permission ; 0 liaison orpheline.
- Tests ciblés : multi-agence, création de code de rôle, persistance d'autorité, édition, scopes, concurrence utilisateur, 2FA et appareils de confiance réussis.
- Les scénarios MySQL d'administration multi-agence sont identifiés mais non exécutés sur cette base à cause du garde-fou de nom.

Verdict : **prêt avec réserves non bloquantes**.

