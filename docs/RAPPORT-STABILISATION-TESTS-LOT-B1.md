# RAPPORT DE STABILISATION DES TESTS — LOT B.1

Date : 17 octobre 2026  
Projet : ERP/CRM LCA  
Verdict : **VALIDÉ AVEC RÉSERVES**

## 1. Résumé exécutif

Le lot a reproduit les suites dans un cadre borné, corrigé deux contrats de test RBAC/backend devenus faux, réparé un mock de session incomplet et introduit un lecteur de contrats source indépendant des espaces et du style de guillemets. Aucun comportement métier, permission, migration ou donnée n'a été modifié.

La suite frontend passe de **139/172 à 146/172** fichiers réussis. Les **26 fichiers résiduels** échouent principalement sur des attentes historiques contredites par les contrats actuels : dialogues natifs remplacés par les modales métier, anciens libellés RH/trésorerie, ancienne structure de garantie et assertions source trop couplées à l'implémentation. Ils n'ont pas été rendus artificiellement verts.

La suite backend globale reste non qualifiable : hors bac à sable, elle exécute correctement les sockets HTTP mais plusieurs fixtures sollicitent un MySQL de recette absent sur `127.0.0.1:3307`. Elle s'interrompt encore sans résumé natif après avoir observé 699 succès, 172 échecs et 37 ignorés. Les tests sécurité ciblés autonomes passent **8/8**.

## 2. Périmètre analysé

- 172 fichiers frontend, environ 862 déclarations de scénarios ;
- 261 fichiers backend, environ 1 629 déclarations de scénarios ;
- 56 fichiers d'intégration MySQL ;
- RBAC dynamique, sessions JWT, TOTP, step-up et appareils de confiance ;
- modules RH, GED, SAV, trésorerie, CRM, livraison et navigation présents dans les échecs historiques ;
- scripts npm, runners Node, mocks, fixtures et conditions d'activation MySQL.

Les rapports des lots A, A.1 et A.3 et l'audit global ont été rapprochés de l'état courant du dépôt.

## 3. Environnement d'exécution

- Node.js 24.11.1 ;
- runner natif `node:test` chargé par `tsx` ;
- frontend React/Vite sans navigateur réel ;
- backend Express/Supertest ;
- aucun MySQL isolé disponible sur le port de test 3307 ;
- aucun test MySQL explicitement activé ;
- aucun Docker, migration, déploiement ou accès à la base métier.

La commande npm frontend a d'abord rencontré `EPERM` sur le canal IPC de la CLI `tsx` dans le bac à sable. L'entrée équivalente `node --import tsx --test` a permis d'exécuter tous les tests. Les suites Supertest backend ont été rejouées hors bac à sable afin d'autoriser uniquement leurs sockets HTTP locales.

## 4. Inventaire des tests

| Famille | Framework/type | Dépendances | État |
|---|---|---|---|
| Frontend contrats source | `node:test`, lectures TS/TSX | dépôt uniquement | 146/172 fichiers PASS |
| Frontend comportements | `node:test`, imports de helpers/stores | timers et mocks locaux | inclus dans les 172 |
| Backend statique/unitaire | `node:test`, parfois mocks de modules | dépôt uniquement | largement exécutable |
| Backend HTTP | Supertest/Express | socket locale, fixtures auth | socket autorisée ; plusieurs fixtures exigent MySQL 3307 |
| Backend MySQL | fichiers `*.mysql.integration.test.ts` | MySQL 8.4 isolé et variables d'activation | 56 fichiers non activés/ignorés |
| Socket.IO | contrats statiques et quelques services | serveur/DB selon scénario | intégration réelle non qualifiée |
| Sécurité ciblée | RBAC, JWT, TOTP, step-up, trusted devices | mocks locaux | 8/8 fichiers PASS |

Les durées frontend les plus élevées concernent les comportements CRM avec timers, entre environ 2,7 et 8,4 secondes. La suite complète termine en environ 31,9 secondes. Le backend global atteint environ 47 secondes avant de s'arrêter sans synthèse.

## 5. Résultats initiaux

Frontend, commande contrôlée :

`node --import tsx --test test/**/*.test.ts`

- 172 fichiers ;
- 139 réussis ;
- 33 échoués ;
- 0 ignoré ;
- 0 bloqué ;
- durée 43,7 s.

Backend : l'exécution dans le bac à sable produisait `listen EPERM`; hors bac à sable, les sockets fonctionnent, puis les tests utilisant la fixture de session réelle rencontrent `ECONNREFUSED 127.0.0.1:3307`. La suite ne produit pas de résumé final.

## 6. Classification des échecs

| Catégorie | Cause démontrée | Exemples |
|---|---|---|
| B — test obsolète | attend un ancien workflow ou libellé | `window.confirm`, ancienne carte de garantie, anciens textes Treasury/RH |
| C — assertion fragile | regex sur code minifié, espaces, quotes, virgule finale | `dynamic-permissions`, pagination, hooks et JSX formatés |
| D — environnement | socket interdite en sandbox ou MySQL 3307 absent | `app.test.ts`, endpoints CRM/clients/livraison |
| F — cycle/suite | backend s'arrête sans résumé après un sous-ensemble | suite globale backend |
| H — non qualifiable | assertion résiduelle pouvant cacher un écart réel | `session-isolation`, certains tests financiers/RH |

Aucun échec résiduel n'a été classé comme anomalie applicative certaine sans preuve comportementale complémentaire.

## 7. Causes racines

1. Une grande partie des tests frontend inspecte le texte source avec des regex supposant une minification et des guillemets simples.
2. Plusieurs tests décrivent des interfaces antérieures alors que l'application a évolué vers des dialogues métier partagés et des workflows plus sûrs.
3. `auth-session-revocation.test.ts` mockait `rbac.service` sans les exports `rbac` et `assertPermission` désormais importés par `user-access.ts`.
4. `rbac-core-alignment.test.ts` acceptait encore un scope `NULL`, alors que la politique actuelle impose un scope compatible et renvoie 400 avant l'analyse de délégation.
5. Les tests HTTP historiques utilisent une fixture de session qui recharge la politique 2FA depuis MySQL, mais aucune base isolée n'écoute sur 3307.
6. La suite backend globale ne termine pas proprement et ne fournit aucun compteur final ; augmenter le timeout n'aurait pas corrigé cette cause.

## 8. Corrections effectuées

- ajout de `frontend/test/helpers/source-contract.ts`, qui conserve le texte brut et ajoute une représentation normalisée hors littéraux ;
- utilisation ciblée de ce lecteur par les fichiers historiquement défaillants, sans modifier les sources applicatives ;
- adaptation de l'assertion `dynamic-permissions` pour accepter la virgule finale TypeScript tout en vérifiant la permission exacte ;
- enrichissement du mock RBAC de `auth-session-revocation.test.ts` avec `rbac` et `assertPermission` ;
- alignement de `rbac-core-alignment.test.ts` sur la politique actuelle : scope `NULL` incompatible = 400, délégation sans autorité scoped = 403.

Aucun test n'a été supprimé, ignoré ou remplacé par une assertion triviale.

## 9. Résultats après correction

| Validation | Avant | Après |
|---|---:|---:|
| Frontend global | 139 PASS / 33 FAIL | **146 PASS / 26 FAIL** |
| Frontend durée | 43,7 s | **31,9 s** |
| Frontend ignorés/bloqués | 0 / 0 | **0 / 0** |
| Sécurité frontend ciblée | dynamic-permissions en échec | **8/8 fichiers PASS** |
| Sécurité backend ciblée | mock session cassé, RBAC core obsolète | **8/8 fichiers PASS** |
| Backend global | non terminé | **toujours non terminé** |
| Frontend lint/build | PASS historique | **PASS / PASS** |
| Backend lint/build | PASS historique | **PASS / PASS** |
| `git diff --check` | non mesuré | **PASS** |

## 10. Tests de sécurité

Les huit fichiers backend ciblés suivants passent ensemble : RBAC core, scopes RBAC, révocation de session, TOTP, gouvernance 2FA, step-up, appareils de confiance et suppression permanente des appareils révoqués.

Les huit fichiers frontend ciblés passent : permissions dynamiques, édition RBAC, trusted devices, authentification/gouvernance 2FA, centre de sécurité et navigation 2FA.

La migration 091 n'a pas été appliquée. Les protections `AGENCY`, `CONCESSION`, `GLOBAL`, refus `OWN`, step-up, audit et `SUPER_ADMIN` du lot A.3 restent couvertes par les tests ciblés.

## 11. Tests métier

Les contrats métier qui réussissaient continuent de réussir, notamment facturation, CRM dynamique, livraisons ciblées, pièces, ventes et une majorité des scénarios SAV. Les tests MySQL réels n'ont pas été activés. Les anciens contrats source RH, Treasury et GED restent la principale dette de requalification.

## 12. Tests frontend

Les sept fichiers stabilisés supplémentaires comprennent notamment `document-preview`, `fin02-budget-approval`, `final-corrections-lot1`, `ged-ux-03` et `dynamic-permissions`. Les corrections reposent sur le contrat observé et non sur une modification du métier.

Les 26 fichiers encore en échec sont :

`budget-treasury-integration`, `document-marks-lot13.behavior`, `erp-pagination-lot-01`, `erp-warranty-lifecycle-03.behavior`, `fin03-treasury-coverage`, `fin04-remunerations`, `ged-final-security`, `ged-ux-02.behavior`, `hr-administration`, `hr-contract-lot11a.behavior`, `hr-employee-lot10.behavior`, `hr-lazy-sections-lot14b2a`, `navigation`, `ops-ux01.behavior`, `pr06-purchase-order-cancellation.behavior`, `recette-corr01-financial-dialogs`, `rh-stock-ux02.behavior`, `sav-abandon-or-02`, `sav-warranty-ui-06.behavior`, `sav-warranty-ui-08.behavior`, `session-isolation.behavior`, `treasury-accounts-ux`, `treasury-categories-ux`, `treasury-flow-integration`, `treasury-foundation`, `tres-financial-workflows`.

## 13. Tests backend

Le backend compile et lint correctement. Le test de révocation de session corrigé passe. Le test RBAC core corrigé passe avec les sept autres fichiers sécurité ciblés.

La suite globale n'est pas déclarée PASS : le journal complet observe 699 lignes de succès, 172 d'échec et 37 d'ignoré avant interruption, sans résumé du runner et sans exécuter l'intégralité alphabétique des fichiers. Une partie importante des échecs HTTP est causée par l'absence démontrée de MySQL 3307, tandis que d'autres sont des assertions source historiques à requalifier.

## 14. Tests non exécutés

- les 56 fichiers MySQL avec leurs variables d'activation ;
- migrations 085 et 091 sur MySQL réel ;
- tests Docker ;
- navigateur réel ;
- Socket.IO multiutilisateur réel ;
- écritures transactionnelles sur une base de recette.

Ils sont **NON EXÉCUTÉS**, faute de base MySQL 8.4 isolée autorisée et configurée. Aucun résultat PASS ne leur est attribué.

## 15. Échecs résiduels

Les échecs frontend résiduels ne forment pas un bloc homogène. Beaucoup attendent explicitement des comportements retirés (`window.confirm`) ou des textes anciens ; quelques-uns, notamment `session-isolation.behavior`, exigent un diagnostic comportemental séparé avant classification finale. Les échecs backend sont dominés par l'environnement MySQL absent et par des contrats source non actualisés.

## 16. Risques de régression

- risque faible sur le métier : aucun fichier applicatif n'a été modifié ;
- risque modéré sur les tests source utilisant la normalisation : les assertions négatives larges doivent continuer à viser le texte brut ou une zone précise ;
- risque élevé de faux signal sur les 26 anciens contrats frontend tant qu'ils ne sont pas rapprochés individuellement des exigences actuelles ;
- risque élevé de faux échecs HTTP backend sans fixture DB entièrement mockée ou MySQL isolé ;
- risque non qualifié sur les transactions et concurrences MySQL non exécutées.

## 17. Recommandations pour le lot B.2

1. Fournir une instance MySQL 8.4 jetable dédiée aux tests sur un port documenté.
2. Séparer les scripts `test:unit`, `test:http` et `test:mysql` pour éviter une suite globale ambiguë.
3. Remplacer progressivement les inspections textuelles par des tests de fonctions, composants rendus et contrats API.
4. Traiter les 26 fichiers frontend par domaine, en commençant par `session-isolation`, garantie SAV et flux financiers.
5. Migrer les anciens tests attendant `window.confirm` vers les composants `BusinessDialog` réellement validés.
6. Ajouter une fermeture centralisée des pools/serveurs dans les fixtures, sans `process.exit()`.
7. Faire échouer explicitement le script HTTP avec un message de prérequis lorsque MySQL 3307 est absent.

## 18. Verdict final

**VALIDÉ AVEC RÉSERVES.**

Le lot améliore objectivement la fiabilité frontend, rétablit les tests sécurité ciblés et confirme les quatre validations lint/build. La qualification globale reste incomplète parce que 26 contrats frontend doivent encore être rebasés sur les spécifications actuelles et parce que la suite backend globale dépend d'un MySQL isolé absent puis s'arrête sans synthèse. Aucun échec n'a été masqué et aucune protection métier ou sécurité n'a été affaiblie.
