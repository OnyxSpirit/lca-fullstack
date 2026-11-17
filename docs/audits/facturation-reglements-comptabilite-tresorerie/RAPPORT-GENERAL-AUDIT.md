# Rapport général d’audit financier

Date : 2026-11-14. Cible exclusive : `lca_recette` (MySQL 8.4.11, migration 128). Audit sans correction métier.

## Synthèse

| Domaine | Verdict | Justification |
|---|---|---|
| Facturation | CONFORME AVEC RÉSERVES | Cycle, idempotence, pagination et exports solides ; recette très peu représentative. |
| Règlements | PARTIELLEMENT CONFORME | Nouveaux règlements transactionnels, mais aucun mapping/configuration Treasury exploitable. |
| Avoirs/remboursements | CONFORME AVEC RÉSERVES | Avoir, remboursement, idempotence et contre-écriture présents ; preuve navigateur absente. |
| Comptabilité | PARTIELLEMENT CONFORME | Moteur double entrée riche ; deux événements réels restent `REGULARIZE`. |
| Trésorerie | NON CONFORME EN RECETTE | Un compte isolé, mais zéro catégorie, mapping, mouvement, transfert et opération manuelle. |
| Caisses/transferts | NON TESTÉ FONCTIONNELLEMENT | Code et tests présents, aucune donnée/configuration réelle. |
| Reporting | CONFORME AVEC RÉSERVES | API/UI/exports présents ; écrans parcourus, mais comparaison chiffrée impossible sans jeu de données. |
| Facturation ↔ Treasury | PARTIELLEMENT CONFORME | Intégration automatique existe, mais l’environnement n’est pas activé et l’historique n’est pas repris. |
| RBAC | PARTIELLEMENT CONFORME | Contrôles applicatifs présents ; seulement SUPER_ADMIN historique `GLOBAL`, aucun profil métier. |
| PDF/GED | CONFORME AVEC RÉSERVES | Tests d’archives idempotentes réussis ; aucun document métier disponible pour un contrôle visuel complet. |
| Frontend | CONFORME AVEC RÉSERVES | Build et 32 fichiers tests réussis ; parcours authentifié des écrans principaux effectué sur recette isolée. |
| MySQL | CONFORME AVEC RÉSERVES | Contraintes d’unicité et écritures équilibrées ; configuration Treasury vide. |

## Preuves réellement exécutées

- Conteneurs recette sains ; frontend HTTP 200 ; backend répond (route `/health` absente, 404).
- 43/43 fichiers backend financiers réussis avec mocks Node officiels ; 32/32 frontend réussis.
- Lint et build backend/frontend réussis ; Vite : 2 547 modules.
- Quatre endpoints financiers sans jeton : HTTP 401.
- MySQL lecture seule : 6 factures, 2 paiements, 1 remboursement, 5 écritures équilibrées, 1 compte Treasury isolé et 0 mouvement Treasury.
- Recette Docker isolée : migrations 1–128, Super Admin créé par le script officiel, enrôlement 2FA normal et accès authentifié réussi.
- Parcours navigateur : facturation, reporting Treasury, opérations, paramétrage, rapprochement et les 10 onglets comptables.

## Limites du parcours navigateur

Le compte de la recette historique reste inutilisable (« Identifiants invalides ») et le provisioning officiel y refuse un second Super Admin. Pour ne pas altérer cette base, une recette Docker jetable et vide a été créée. Le compte d’audit y a été provisionné par le script officiel et enrôlé en 2FA sans contournement. Les interactions de structure et d’états vides sont donc validées ; les scénarios financiers complets restent non prouvés, car cette recette ne contient ni client, ni facture, ni compte/catégorie/mapping Treasury. Aucun mouvement financier artificiel n’a été validé.
