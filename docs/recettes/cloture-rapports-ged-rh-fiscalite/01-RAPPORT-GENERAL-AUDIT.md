# Rapport général d’audit

Campagne isolée `lca-reporting-ged-hr`, base `lca_reporting_ged_hr_e2e`, frontend 4178, backend 3006, MySQL 33323. Périmètre : Rapports & Indicateurs, Documents & GED, RH & Administration, fiscalité d’entreprise et RBAC multi-agence.

Constats majeurs : sept contrôles d’identité interdisaient encore à un acteur autorisé de décider sa propre demande ; la matrice RBAC affichait plusieurs domaines techniques ; aucun référentiel fiscal d’entreprise générique n’existait. Ces écarts ont été corrigés sans diminuer les permissions, les scopes, les verrous transactionnels ni le 2FA.

Résultat : lint et builds backend/frontend verts, suites complètes vertes, migration 130 appliquée sur MySQL 8.4 sans avertissement, scénario MySQL d’approbation polyvalente vert.

## Campagne finale du 17 novembre 2026

L’environnement existant a été contrôlé avant réutilisation : les trois services isolés étaient sains, la base dédiée a été conservée et seuls le backend et le frontend ont été reconstruits après correction. Quatre campagnes MySQL réelles ont exercé Reporting (5 scénarios), GED (1 scénario composite), RH Reporting (1 scénario composite) et Fiscalité (1 scénario composite avec concurrence).

Trois écarts supplémentaires ont été corrigés dans l’administration fiscale : fenêtre de création de nature absente, fermeture des formulaires après refus API, et absence de verrou anti-double-clic. Le backend refuse aussi tout règlement nul ou négatif. Les fenêtres corrigées, leurs champs et sélecteurs, leurs états désactivés et l’annulation sans création ont été contrôlés dans le navigateur authentifié.

Verdict global : **VALIDÉ APRÈS CORRECTIONS**, sans réserve bloquante connue. Une occurrence JSX n’est jamais comptée comme une preuve métier à elle seule.
