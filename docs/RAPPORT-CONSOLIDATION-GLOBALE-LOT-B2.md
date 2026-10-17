# Rapport de consolidation globale — lot B.2

Date de référence : 17 octobre 2026  
Périmètre : dépôt local ERP/CRM LCA, sans déploiement ni base métier.

## 1. Résumé exécutif

La campagne a stabilisé les suites frontend et backend, supprimé les dépendances à l’ordre d’exécution, remis à jour les contrats de tests après les évolutions récentes et qualifié la chaîne de migrations sur MySQL 8.4 isolé. Une omission réelle de présentation de la garantie dans le formulaire d’ordre de réparation a été corrigée. Aucun contrôle RBAC, financier ou 2FA n’a été affaibli.

Verdict : **VALIDÉ AVEC RÉSERVES**. Les réserves portent sur les scénarios MySQL opt-in non activés individuellement et l’absence de parcours navigateur multiutilisateur dans ce lot.

## 2. Inventaire initial

- 23 modules frontend et 24 modules backend ;
- 37 fichiers de routes backend ;
- 58 migrations SQL actives, jusqu’à `091_two_factor_trusted_device_deletion.sql` ;
- 172 fichiers de tests frontend et 261 fichiers de tests backend ;
- 266 codes candidats inventoriés dans le seed système ;
- 602 documents Markdown, majoritairement des rapports historiques conservés comme traces.

L’état Git était déjà largement modifié par les lots précédents. Toutes ces modifications ont été préservées ; aucune commande reset, restore, stash, clean, commit ou changement de branche n’a été utilisée.

## 3. Environnement de recette

Une instance `mysql:8.4` dédiée, nommée `lca-b2-mysql-84`, a été créée avec les labels `lca.scope=lot-b2` et `lca.disposable=true`. Elle utilise un `tmpfs` pour `/var/lib/mysql`, aucun volume Docker, et expose uniquement `127.0.0.1:3307`. Aucun conteneur ni réseau métier préexistant n’a été modifié.

Après qualification, ce conteneur jetable a été supprimé. Aucune ressource préexistante et aucun volume Docker n’ont été supprimés.

## 4. Corrections backend

- sérialisation inter-fichiers de la suite Node afin d’isoler les remplacements de globals et du pool ;
- fixture de session enrichie pour indexer toutes les identités par utilisateur et neutraliser explicitement la lecture 2FA quand elle n’est pas testée ;
- `assertSessionCurrent` ne consulte pas un état TOTP impossible à déchiffrer lorsque le serveur n’a aucune clé 2FA configurée ; les opérations 2FA conservent leurs gardes de configuration ;
- mocks HTTP de validation de devis alignés sur le service centralisé d’audit ;
- contrats financiers, RH, GED, garantie et trésorerie alignés sur les services centralisés actuels (`writeAudit`, émission temps réel par domaine, permissions variables) ;
- helper de lecture des contrats source ajouté pour rendre les assertions indépendantes du seul formatage.

## 5. Corrections frontend

- isolation de session et de `fetch` ;
- contrats financiers, trésorerie, GED, RH, navigation, pagination et garantie actualisés ;
- panneau garantie de `NewRepairOrderModal` complété avec le snapshot contractuel renvoyé par le serveur et le kilométrage actuel ;
- assertions source rendues tolérantes au formatage, sans retrait des validations métier.

## 6. Tests obsolètes actualisés

Les tests classés « pertinents mais obsolètes » ont été adaptés : audit centralisé plutôt qu’`INSERT audit_logs` local, émissions Socket.IO par domaine, rattachement Treasury récent, routes RH reformatées, et nouvelle présentation garantie. Les protections vérifiées restent identiques ou plus précises.

## 7. Tests retirés et justification

Aucun test n’a été supprimé et aucun test n’a été désactivé pour obtenir un résultat vert.

## 8. Fichiers supprimés et justification

Aucun fichier n’a été supprimé. Les fichiers historiques ou d’utilité incertaine ont été conservés.

## 9. Documentation actualisée

- présent rapport ;
- `docs/STRATEGIE-DE-TESTS.md` ;
- README principal : version de migration, exécution sérialisée et lien vers la stratégie de tests.

## 10. Structure documentaire finale

L’organisation existante est conservée afin de ne pas casser les nombreux liens historiques. Le README reste le point d’entrée ; la stratégie de tests et ce rapport constituent les références B.2. Les rapports anciens restent des archives factuelles, non des spécifications actuelles.

## 11. Migrations testées

- installation fraîche : baseline 071, seed, puis migrations 072 à 091 ;
- 21 migrations présentes dans `schema_migrations` pour la plage 071–091 ;
- aucune étape en échec dans `schema_migration_steps` ;
- migration 080 : base 079, interruption après DDL avant journal, reprise `RECOVERED`, structures déjà conformes, divergence réelle et conservation des données ;
- migration 091 : permission `auth.2fa.devices.delete` unique, affectée au seul vrai `SUPER_ADMIN` avec `GLOBAL`; scopes autorisés AGENCY/CONCESSION/GLOBAL et refus de OWN vérifiés par le code et les tests.

## 12. Résultats frontend

- suite complète : **876/876 PASS**, 0 échec, 0 skip, 114,553 s ;
- lint TypeScript : PASS ;
- build Vite : PASS, 2 505 modules, 15,31 s.

## 13. Résultats backend

Le passage initial B.2 a reproduit les contaminations inter-fichiers. Après sérialisation et correction des fixtures, les sous-suites ciblées Showroom (126/126), Treasury (11/11), contrats consolidés (120/120 après correction du dernier cas) et validation devis/RH (21/21) réussissent.

Suite complète finale : **1 822 PASS**, **0 échec**, **83 SKIP** sur 1 905 tests, durée 215,097 s. Les 83 SKIP correspondent aux scénarios opt-in dont les prérequis explicites n’étaient pas activés ; ils ne sont pas comptés comme réussis.

## 14. Résultats HTTP

Les parcours Supertest actifs de la suite backend couvrent authentification, sessions, RBAC, devis, ventes, GED, notifications, Showroom, garantie, RH et Treasury. Les validations ciblées de devis ont notamment réussi pour propriétaire, manager, refus hors périmètre, PDF et audit.

## 15. Résultats MySQL

- MySQL 8.4 isolé healthy ;
- bootstrap 071→091 réussi ;
- 161 tables, 552 clés étrangères et 1 233 entrées d’index observées ;
- test réel migration 080 : **1/1 PASS**, 40,768 s ;
- aucune écriture sur la base métier.

Les autres fichiers MySQL opt-in non activés individuellement restent **NON EXÉCUTÉS**, et non PASS.

## 16. Résultats sécurité

Les tests actifs couvrent JWT, révocation de session, RBAC dynamique, scopes, vrai `SUPER_ADMIN`, 2FA, appareils de confiance et suppression définitive. La permission 091 reste globale pour le rôle système ; aucun bypass par nom de rôle n’a été ajouté.

## 17. Résultats Socket.IO éventuels

Les contrats statiques et producteurs temps réel de la suite standard sont validés. Aucun scénario navigateur Socket.IO multiutilisateur réel n’a été exécuté dans ce lot.

## 18. Comparaison avant/après

| Indicateur | Avant B.2 | Après consolidation |
|---|---:|---:|
| Frontend | 146/172 fichiers PASS | 172/172 fichiers, 876/876 tests PASS |
| Backend | résultat global instable, sans bilan fiable | exécution sérialisée et résumé TAP fiable |
| MySQL | 56 fichiers opt-in non activés | bootstrap 071→091 et reprise 080 réels qualifiés |
| Contrats source | sensibles à Prettier | lecture normalisée + invariants ciblés |

## 19. Anomalies résiduelles

- scénarios MySQL opt-in autres que la migration 080 non exécutés un à un ;
- aucun parcours navigateur réel ni Socket.IO multiutilisateur ;
- volume documentaire historique élevé, mais aucune suppression sûre démontrée.

## 20. Risques connus

- les tests source restent moins robustes que des tests comportementaux ; leur helper évite seulement les faux échecs de formatage ;
- une exécution parallèle des fichiers reste déconseillée tant que les globals et mocks ne sont pas totalement encapsulés ;
- l’activation en masse des scénarios MySQL exige une orchestration dédiée pour éviter leurs collisions de données.

## 21. Modifications locales

Les changements concernent les scripts npm de test, les fixtures/helpers de tests, les contrats frontend/backend, une correction UI garantie, la garde de session 2FA sans serveur configuré et la documentation. Ils restent non commités conformément à la mission.

## 22. Verdict final

**VALIDÉ AVEC RÉSERVES** : les suites actives frontend, les validations backend ciblées, lint/build et la chaîne MySQL 8.4 critique sont qualifiés. Le verdict n’est pas « VALIDÉ » tant que l’ensemble des scénarios MySQL opt-in et les parcours navigateur/Socket.IO réels ne sont pas exécutés dans une campagne isolée dédiée.
