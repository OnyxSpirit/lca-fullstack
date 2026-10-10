# CORR-TESTS-01A — Rapport

## A. État initial

Branche `main`, HEAD `8bcbadb`. Les modifications de RECETTE-CORR-01 et les rapports DIAG-TESTS-01 étaient déjà présents et ont été préservés. Dernière migration : `076_bank_reconciliation.sql`; aucune migration n’a été modifiée.

## B–C. Diagnostic JWT et cause racine

Le chemin réel est : fixture → JWT HS256 contenant `sub` et `sid` → `authenticate` → jointure `refresh_tokens`/`users` (session non révoquée, non expirée, utilisateur actif) → relecture de l’agence → `resolveRbacContext` → rôle actif et `role_permissions` persistées → route métier.

Les neuf familles historiques signaient `sub/roles/agencyId`, sans `sid` ni ligne de session. `authenticate` rejetait donc le jeton avant le RBAC. Les noms de rôles dans le JWT ne sont toujours pas utilisés comme source d’autorisation.

## D–G. Fixtures et stratégie

Un helper commun `test/helpers/auth-session-fixture.ts` crée des identités et sessions déterministes avec états ACTIVE, EXPIRED, REVOKED ou ABSENT. Dans les suites endpoint qui simulent déjà MySQL, il intercepte exclusivement la requête réelle `refresh_tokens` et délègue toutes les autres requêtes au mock du fichier. Le test monolithique reçoit en plus un rôle/ensemble de permissions explicitement borné; aucun Super Admin ni toutes-permissions automatique n’est créé.

Neuf fichiers de fixtures JWT ont été migrés : `app`, commercial résiduel/transversal, affectation/réaffectation/rendez-vous CRM, Client 360, candidats livraison et sécurité documents de livraison.

## H–I. Sécurité JWT et RBAC

Les dix scénarios JWT-01 à JWT-10 sont verts : session active, session absente, révoquée, expirée, JWT expiré, signature invalide, session d’un autre utilisateur, permission absente, scope AGENCY non promu, révocation après émission. Les six scénarios de `auth-session-revocation.test.ts` sont également verts. Total ciblé : **16/16**.

Les refus 401 historiques ont disparu des blocs détaillés de la globale. Les tests atteignent désormais le RBAC et les contrôleurs. Plusieurs attentes anciennes reçoivent maintenant 403 ou 400 différents; elles sont volontairement laissées pour CORR-TESTS-01B.

## J–K. `mock.module`

Node 24.11.1 expose `mock.module` uniquement avec le support expérimental des modules mocks. Le script backend utilise désormais `node --experimental-test-module-mocks --import tsx --test`. La suite isolée de révocation passe 6/6 sans suppression d’assertion. L’avertissement expérimental reste une réserve de portabilité.

## L–O. Résultats

| Mesure | Avant | Après | Écart |
|---|---:|---:|---:|
| Backend tests | 1 688 | 1 703 | +15 (10 nouveaux JWT + 5 scénarios auparavant bloqués par le crash de fichier) |
| Backend réussis | 1 433 | 1 525 | +92 |
| Backend échoués | 182 | 105 | -77 |
| Backend ignorés | 73 | 73 | 0 |
| Frontend tests | 775 | 775 | 0 |
| Frontend réussis | 737 | 736 | -1 |
| Frontend échoués | 38 | 39 | +1 intermittent |

Backend global : code 1, 169,56 s TAP. Frontend global : code 1, 95,25 s TAP. Le frontend n’a pas été modifié dans ce lot; `DEL-CAND-UI vente agence 2` a réapparu et est classé intermittent à confirmer.

## P. Échecs nouvellement révélés

Le passage après authentification révèle principalement 403 au lieu de 400, 400 au lieu de 403 et des assertions métier/structurelles déjà classées hors périmètre. Les 143 anciens échecs d’authentification ne sont donc pas déclarés comme 143 tests métier réparés : la cause 401 est levée, mais 105 échecs backend persistent, dont des attentes nouvellement atteignables.

## Q. Finance

Le code financier, Treasury, fournisseurs, RH, reporting et les calculs n’ont pas été modifiés. Les contrôles statiques et unitaires correspondants ont été rejoués dans la globale. Les intégrations MySQL financières demeurent ignorées sans activation et ne constituent pas une nouvelle preuve MySQL dans ce lot.

## R–T. Risques, fichiers et verdict

Le helper utilise un registre simulé uniquement dans des suites qui simulaient déjà `pool.execute`; il ne modifie pas la production. Une recette MySQL 8.4 dédiée du helper persistant reste à ajouter si ce helper doit être réutilisé par des tests d’intégration réels.

Fichiers modifiés dans ce lot : `backend-node/package.json` et neuf tests backend. Fichiers créés : helper, test de sécurité JWT et trois rapports. Aucun code métier ni frontend n’a été modifié par CORR-TESTS-01A.

**Verdict du lot : VALIDÉ AVEC RÉSERVES.** La cause JWT et `mock.module` est corrigée; les assertions révélées restent pour 01B.

**Aptitude production : NON APTE.** La globale conserve 105 échecs backend et 39 frontend.

