# DIAG-TESTS-01 — Diagnostic approfondi des suites globales

## A. État Git initial

Branche `main`, HEAD `8bcbadb`. L’arbre contenait déjà 11 fichiers suivis modifiés et 11 fichiers non suivis issus de RECETTE-CORR-01/RECETTE-PROD-01. Cet état a été conservé. Aucun fichier applicatif, test ou migration n’a été modifié pendant DIAG-TESTS-01.

## B. Environnement

- Node.js 24.11.1; npm 11.7.0.
- Runner backend et frontend : runner natif `node:test`, lancé via `tsx`.
- Backend : 205 fichiers `*.test.ts`; frontend : 149.
- 26 fichiers backend référencent explicitement MySQL/intégration. Les intégrations nécessitent une instance MySQL 8.4 jetable et sont généralement ignorées sans leurs variables d’activation.
- Aucun fichier Jest/Vitest/Playwright de configuration globale ni hook central de setup n’a été trouvé; les fixtures et jsdom sont initialisés dans les fichiers.
- Dernière migration vérifiée : `backend-node/database/migrations/076_bank_reconciliation.sql`.

## C. Commandes exécutées

| Suite | Répertoire | Commande | Environnement non sensible | Journal | Code | Durée |
|---|---|---|---|---|---:|---:|
| Backend | `backend-node` | `npm test` | `NODE_ENV=test`, DB locale fictive du script, secrets JWT de test | `/tmp/diag-tests-01-backend.log` | 1 | 154,03 s murale; TAP 153,32 s |
| Frontend | `frontend` | `npm test` | Aucun ajout | `/tmp/diag-tests-01-frontend.log` | 1 | 92,46 s murale; TAP 90,57 s |

Le premier lancement sous sandbox a échoué avant collecte (`tsx` : `EPERM` sur socket IPC `/tmp/tsx-1000/*.pipe`). La relance autorisée hors de cette restriction a produit les résultats ci-dessous. Ce défaut de lancement n’est pas compté parmi les 220 échecs de tests.

## D–F. Résultats et comparaison

| Suite | Tests | Réussis | Échecs | Ignorés | Bilan précédent | Écart |
|---|---:|---:|---:|---:|---:|---:|
| Backend | 1 688 | 1 433 | 182 | 73 | 181 échecs avec harnais alternatif | +1; correspond exactement au `npm test` initial de RECETTE-CORR-01 |
| Frontend | 775 | 737 | 38 | 0 | 39 échecs, 774 tests | +1 test, +2 réussites, -1 échec |
| Total | 2 463 | 2 170 | 220 | 73 | 220 échecs | total inchangé |

Le backend à 181 utilisait une commande diagnostique différente avec support expérimental des mocks; `npm test` reproduit 182. Le frontend contient maintenant 775 tests, notamment le nouveau fichier RECETTE-CORR-01 déjà présent dans l’état initial.

## G. Répartition par fichiers

Les 182 échecs backend occupent 32 fichiers; les 38 frontend, 20 fichiers. Concentration principale :

| Fichier | Échecs |
|---|---:|
| `backend-node/test/app.test.ts` | 97 |
| `backend-node/test/commercial-residuals.test.ts` | 12 |
| `backend-node/test/crm-assignment-endpoint.test.ts` | 11 |
| `backend-node/test/ged-final-security.test.ts` | 9 |
| `backend-node/test/crm-reassignment-endpoint.test.ts` | 7 |
| `backend-node/test/customers360-endpoint.test.ts` | 7 |
| `backend-node/test/delivery-candidates.test.ts` | 7 |
| `frontend/test/sav-warranty-ui-08.behavior.test.ts` | 5 |

La répartition exhaustive, test par test, figure dans `DIAG-TESTS-01-ECHECS.md`.

## H–J. Signatures et causes

| Cause | Signature | Échecs | Confiance |
|---|---|---:|---|
| CAUSE-01 | HTTP 401 précoce ou cascade dans fichiers partageant la fixture JWT/session | 143 | CONFIRMÉE |
| CAUSE-02 | `TypeError: mock.module is not a function` | 1 | CONFIRMÉE |
| CAUSE-03 | baseline/migration/convergence historique | 7 | PROBABLE |
| CAUSE-04 | regex frontend ne correspondant plus au source | 36 | PROBABLE |
| CAUSE-05 | regex/structure backend ne correspondant plus au source/SQL | 24 | PROBABLE |
| CAUSE-08 | timeout frontend CRM | 1 | NON DÉTERMINÉE |
| CAUSE-09 | assertion SAV finance non expliquée | 1 | NON DÉTERMINÉE |
| CAUSE-10 | assertions backend résiduelles | 7 | NON DÉTERMINÉE |

Le test représentatif `le CRM refuse un rôle sans permission` échoue seul avec 401 au lieu de 403 : l’ordre global n’est pas la cause. `billing-stabilization.test.ts` échoue aussi seul (1/3) sur la même regex. `auth-session-revocation.test.ts` échoue seul avant ses scénarios. Ces trois signatures sont donc indépendantes de l’ordre d’exécution.

## K. Tests obsolètes suspects

Soixante-sept échecs sont associés à des assertions historiques suspectes : 7 de migration/baseline et 60 regex de forme. Ils ne sont pas déclarés automatiquement obsolètes. Pour chacun, la règle actuelle doit être vérifiée avant modification. Les documents FIN-09 établissent déjà que la baseline consolidée est 071 puis migrations additives 072–076 et que certaines anciennes assertions de version étaient une dette connue.

## L–M. Environnement et isolation

Deux problèmes d’environnement sont prouvés : socket IPC `tsx` interdit dans le sandbox initial, puis `mock.module` indisponible dans la commande Node courante. Seul le second constitue un échec de la suite (1 test). Les intégrations MySQL sont ignorées sans activation; la globale n’est donc pas une recette MySQL exhaustive.

Les trois reproductions isolées montrent que les causes dominantes ne dépendent pas de l’ordre. Aucun état partagé ou fuite de connexion n’est démontré. Le timeout CRM isolé/fichier/global reste à mesurer séparément avant conclusion.

## N–P. Régressions possibles et risques

Neuf échecs restent non déterminés et peuvent inclure une régression réelle. Les 67 assertions statiques probables peuvent également révéler soit une évolution valide, soit une régression; leur statut ne peut être tranché par une simple lecture de regex.

Aucune anomalie financière P0 (double paiement, corruption, sous-couverture) n’est démontrée. Aucune faille RBAC P0 n’est démontrée : les 401 sont plus restrictifs que prévu et proviennent des fixtures, mais ils rendent 143 contrôles RBAC/validation inutilisables; c’est un risque de couverture P1, pas une preuve de contournement.

## Q–R. Plan et tests à rejouer

Ordre recommandé : CAUSE-01, CAUSE-02, CAUSE-03, CAUSE-04/05, puis les neuf résiduels. Après chaque cause : test isolé, fichier complet, suite globale. Terminer par bootstrap MySQL 8.4 vierge niveau 076 et les scénarios FIN-01 à FIN-09, concurrence, anti-IDOR, inter-agence et inter-concession.

Le détail des changements proposés et des risques est dans `DIAG-TESTS-01-PLAN-CORRECTION.md`. Aucune correction n’a été exécutée.

## S. Limites

- Les tests MySQL ignorés ne prouvent rien lors de cette globale.
- Les assertions statiques ne permettent pas seules de distinguer évolution légitime et régression.
- Le groupe non déterminé nécessite neuf analyses ciblées supplémentaires.
- Les journaux complets sont temporaires dans `/tmp` et ne contiennent pas de secret de production.

## T. Verdict

- Échecs reproduits : **220** — backend 182, frontend 38.
- Causes/groupes : **8** — 2 confirmés, 3 probables, 3 non déterminés.
- Échecs d’environnement comptés dans la suite : **1** (`mock.module`); un blocage sandbox supplémentaire a précédé la relance mais n’est pas un test.
- Échecs liés à des tests historiques suspects : **67 probables**, aucun déclaré définitivement obsolète sans validation métier.
- Régressions réelles possibles : **NON DÉTERMINÉ**; neuf échecs sont directement non classés, les assertions statiques doivent aussi être vérifiées.
- P0 financier : **aucun démontré**.
- P0 RBAC : **aucun démontré**.
- Verdict production inchangé : **NON APTE** tant que la suite et la couverture dynamique restent rouges.

