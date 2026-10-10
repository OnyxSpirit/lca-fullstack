# DIAG-TESTS-01 — Registre des causes

| ID cause | Description | Statut | Preuve | Échecs associés | Gravité | Correction proposée |
|---|---|---|---|---:|---|---|
| CAUSE-01 | Les fixtures d’API signent un JWT avec rôle/agence, mais sans session persistée `sid`; l’authentification actuelle relit la session et répond 401 avant RBAC/validation métier. Les assertions suivantes chutent en cascade. | CONFIRMÉE | 143 échecs répartis dans `app.test.ts` et huit suites endpoint; test isolé : 401 au lieu de 403. | 143 | P1 | Créer une fixture d’authentification commune qui persiste utilisateur, rôle, permissions et session active; ne pas réintroduire de fallback par nom de rôle. |
| CAUSE-02 | `auth-session-revocation.test.ts` appelle `mock.module`, absent de l’API exposée par Node 24.11.1 sans activation expérimentale. | CONFIRMÉE | Fichier isolé : `TypeError: mock.module is not a function`, avant exécution des scénarios. | 1 | P2 | Aligner la version/commande Node cible ou remplacer ce mock par une injection compatible et documentée. |
| CAUSE-03 | Sept tests statiques attendent une baseline ou une convergence de migration antérieure alors que le dépôt atteint réellement 076. | PROBABLE | Échecs dans les contrôles baseline/migrations; `076_bank_reconciliation.sql` est le dernier fichier présent. | 7 | P2 | Revalider chaque invariant fonctionnel puis mettre à jour uniquement les assertions de version/convergence devenues historiques. |
| CAUSE-04 | Trente-six tests frontend inspectent le texte source avec des expressions régulières trop couplées à la forme du JSX/TypeScript. | PROBABLE | Erreurs `input did not match regular expression`; reproduction isolée de `billing-stabilization.test.ts` : 1/3 échoue pareil. | 36 | P2 | Remplacer en priorité les assertions de forme par des tests comportementaux DOM/API; vérifier le comportement avant toute mise à jour de motif. |
| CAUSE-05 | Vingt-quatre tests backend statiques inspectent la forme exacte du code/SQL et ne reconnaissent plus des implémentations équivalentes ou remaniées. | PROBABLE | Erreurs `operator: match` sur services, scopes, GED, finance et documents. | 24 | P2 | Convertir les invariants critiques en tests de service/API/SQL observables; conserver les contrôles structurels seulement lorsqu’ils prouvent un risque réel. |
| CAUSE-08 | Un scénario frontend CRM dépasse sa temporisation dans la suite et reste à distinguer entre coût jsdom et défaut asynchrone. | NON DÉTERMINÉE | `crm-search.behavior.test.ts`, signature timeout/cascade. | 1 | P2 | Rejouer test seul, fichier, puis suite avec instrumentation des timers/promesses sans augmenter arbitrairement le délai. |
| CAUSE-09 | Un test SAV finance échoue par assertion non regex; la preuve actuelle ne permet pas de trancher test obsolète ou régression d’affichage. | NON DÉTERMINÉE | `frontend/test/sav-finance-03.test.ts`. | 1 | P1 | Exécuter un test comportemental rendu avec données contrôlées et comparer aux règles FIN documentées. |
| CAUSE-10 | Sept assertions backend résiduelles ne sont expliquées ni par le 401 commun, ni par `mock.module`, ni par une signature de migration/regex suffisamment probante. | NON DÉTERMINÉE | Sept lignes du registre individuel, principalement assertions de structure/valeur. | 7 | P1 | Examiner individuellement premier point de divergence, règle métier et contre-preuve avant toute correction. |

## Bilan causal

- 8 causes ou groupes distincts.
- 2 causes confirmées, couvrant 144 échecs.
- 3 causes probables, couvrant 67 échecs.
- 3 groupes non déterminés, couvrant 9 échecs.
- Aucun P0 financier ou RBAC démontré par cette exécution.

