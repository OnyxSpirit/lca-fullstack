# DIAG-TESTS-01 — Plan de correction recommandé

Cette mission n’implémente aucune correction. L’ordre ci-dessous cherche à lever les causes communes avant les symptômes.

| Ordre | Cause | Priorité | Action proposée | Fichiers probables | Risque | Validation requise |
|---:|---|---|---|---|---|---|
| 1 | CAUSE-01 | P1 | Introduire un constructeur de contexte d’authentification de test persistant : utilisateur actif, rôle actif, permissions/scopes, session active et `sid` signé. Migrer d’abord une suite pilote, sans fallback de rôle. | `backend-node/test/app.test.ts`, huit suites endpoint, helpers de test à créer ou consolider | Masquer un vrai contrôle RBAC si la fixture accorde trop de droits | Test isolé, fichier, globale; 401/403/404/200 attendus; tests anti-IDOR et sans permission |
| 2 | CAUSE-02 | P2 | Fixer la politique Node du projet : commande avec module mocks expérimental ou injection de dépendance compatible. | `backend-node/package.json`, `auth-session-revocation.test.ts`, documentation CI | Divergence local/CI | Fichier isolé puis suite backend sur la version Node déclarée |
| 3 | CAUSE-03 | P2 | Inventorier les assertions baseline/migration, comparer aux invariants 071–076, corriger seulement celles historiquement figées. | Sept tests listés sous CAUSE-03 | Accepter par erreur une migration non additive | Bootstrap MySQL 8.4 vierge, checksums, niveau 076, tests de convergence |
| 4 | CAUSE-04 | P2 | Remplacer les regex frontend de forme par rendu jsdom, interactions et assertions observables; traiter par domaine. | 36 tests du registre, en commençant par SAV warranty, numeric inputs et Parts | Transformer un test précis en test trop permissif | Test isolé + fichier + globale, lint et build frontend |
| 5 | CAUSE-05 | P2 | Reclasser chaque assertion backend source/SQL : invariant de sécurité à garder, détail d’implémentation à convertir en test fonctionnel. | 24 tests du registre | Perdre une garantie SQL/RBAC implicite | Tests API avec scopes, non-divulgation, MySQL jetable si nécessaire |
| 6 | CAUSE-08/09/10 | P1/P2 | Diagnostiquer individuellement les neuf résiduels après levée des causes communes. | CRM search, SAV finance et sept backend résiduels | Corriger un symptôme dépendant d’une cause précédente | Isolé/fichier/globale; instrumentation ciblée; aucun retry automatique |
| 7 | Toutes | P1 | Rejouer les deux suites globales sur environnement reproductible et comparer le registre identifiant par identifiant. | CI et scripts npm | Différence de version Node ou d’environnement | Zéro échec non justifié, MySQL uniquement jetable pour les intégrations |

## Garde-fous

- Ne jamais remplacer le RBAC dynamique par des noms de rôles forgés dans les JWT.
- Ne pas mettre à jour une regex simplement parce qu’elle échoue : vérifier d’abord la règle métier.
- Ne pas augmenter les timeouts ni ajouter de retries avant d’avoir identifié l’attente réelle.
- Rejouer les invariants financiers FIN-01 à FIN-09 et les contrôles inter-agence/inter-concession après toute correction de fixtures.

