# CRM-03 — Recette fonctionnelle CRM et Showroom

Date : 22 octobre 2026  
Nature : recette et diagnostic uniquement, sans correction  
Références : `RAPPORT-AUDIT-TEMPORALITE-CRM-SHOWROOM-CRM01.md`, `RAPPORT-CORRECTION-CRM-SHOWROOM-CRM02.md`

## 1. Résumé exécutif

CRM-03 confirme sur tests automatisés et sur MySQL 8.4 réel isolé les protections centrales introduites par CRM-02 : démarrage d'un essai planifié sans barrière horaire, retour immédiat, exclusivité d'un véhicule pendant un essai actif, distinction des événements de planification/démarrage, scopes dynamiques et intégrité transactionnelle des scénarios couverts.

La fixture de concurrence CRM-02 passe sur MySQL 8.4.11. La fixture d'intégrité Showroom passe également, rollback transactionnel compris. Aucun double essai actif, aucun lien orphelin et aucune divergence de migration n'ont été observés à la fin des scénarios.

La recette navigateur du bundle CRM-02 courant n'a pas été exécutée : les instances `lca` et `lca-recette` sont protégées et ne peuvent pas recevoir les écritures de recette ; aucune instance applicative isolée authentifiable avec deux sessions fictives n'était disponible. Les assertions frontend ne sont pas présentées comme un équivalent.

Verdict : **VALIDÉ AVEC RÉSERVES**. Aucune anomalie P0/P1 CRM/Showroom n'a été détectée, mais la recette navigateur et plusieurs courses MySQL détaillées restent non exécutées ou partielles.

## 2. Environnement réellement utilisé

| Élément | Valeur constatée |
|---|---|
| Dépôt | branche `main`, commit `2306a2f903cd888ac1f77aaf0e9004991e08475f` |
| État initial | arbre Git propre |
| Node.js / npm | 24.11.1 / 11.7.0 |
| Docker | client et serveur 29.8.0 |
| MySQL temporaire | 8.4.11, isolation `REPEATABLE-READ`, fuseau `+00:00` / système UTC |
| Conteneur temporaire | `lca-crm03-mysql-20261022` |
| Port temporaire | `127.0.0.1:43307` |
| Base temporaire | `lca_crm03` |
| Volume temporaire | `lca_crm03_mysql_data_20261022` |
| Environnements protégés | `lca`, `lca-recette` : aucune écriture CRM-03 |

Avant la première écriture métier, l'instance temporaire a été vérifiée : UUID serveur propre, base vide, port distinct, volume neuf unique et aucun montage vers un volume préexistant. Le bootstrap officiel a appliqué la baseline consolidée 071 puis les migrations 072 à 102. Les 32 marqueurs observés couvrent 071 à 102.

Après les contrôles finaux, seuls le conteneur et le volume portant les identités ci-dessus ont été supprimés. Les environnements préexistants n'ont pas été arrêtés ni modifiés.

## 3. Version du code testée

Les fichiers CRM-02 présents ont été contrôlés par leur contenu et leur empreinte :

- backend : routes CRM, service/verrou d'essai, routes Showroom, filtrage Véhicules ;
- frontend : page CRM, modale d'essai CRM et page Showroom ;
- migrations : 077, 078 et 079 présentes, baseline 071, migrations courantes jusqu'à 102.

Le backend et le frontend ont été compilés depuis le même checkout. Aucun code métier ni fichier de migration n'a été modifié pendant CRM-03.

## 4. Matrice CRM

| Scénario | Statut | Preuve / limite |
|---|---|---|
| CRM03-CRM-01 création rendez-vous | PARTIEL | endpoint et persistance simulée PASS ; pas de parcours navigateur/MySQL complet |
| CRM03-CRM-02 chevauchement | PARTIEL | tests CRM-02 PASS : avertissement non bloquant ; pas de navigateur |
| CRM03-CRM-03 report | PARTIEL | endpoint, verrou et historique automatisés PASS ; pas de navigateur |
| CRM03-CRM-04 annulation | PARTIEL | endpoint et états automatisés PASS ; pas de navigateur |
| CRM03-CRM-05 planification essai | PARTIEL | contrats, réservation et événements automatisés PASS ; pas de parcours complet réel |
| CRM03-CRM-06 démarrage anticipé | PARTIEL | politique backend/frontend PASS ; pas de clic navigateur réel |
| CRM03-CRM-07 démarrage tardif | PARTIEL | politique backend PASS ; pas de parcours réel horodaté |
| CRM03-CRM-08 retour immédiat | PARTIEL | tests de retour immédiat et transaction PASS ; pas de parcours réel complet |
| CRM03-CRM-09 synchronisation | PARTIEL | invalidations, origine CRM et événements PASS en tests ; Socket.IO/navigateur non exécutés |

## 5. Matrice Showroom

| Scénario | Statut | Preuve / limite |
|---|---|---|
| CRM03-SHW-01 enregistrement | PARTIEL | création/concurrence réelle MySQL PASS ; UI non exécutée |
| CRM03-SHW-02 affectation | PARTIEL | matrice HTTP/RBAC PASS ; UI non exécutée |
| CRM03-SHW-03 prise en charge | PARTIEL | transitions automatisées PASS ; UI non exécutée |
| CRM03-SHW-04 planification | PARTIEL | exclusivité MySQL PASS ; parcours navigateur non exécuté |
| CRM03-SHW-05 démarrage anticipé | PARTIEL | politique automatisée PASS ; navigateur non exécuté |
| CRM03-SHW-06 retour immédiat | PARTIEL | contrôle automatisé PASS ; navigateur non exécuté |
| CRM03-SHW-07 clôture manuelle | PARTIEL | distinction d'origine PASS en tests ; navigateur non exécuté |
| CRM03-SHW-08 annulation | PARTIEL | libération concurrente couverte ; UI non exécutée |
| CRM03-SHW-09 replanification | PARTIEL | conservation réservation testée statiquement ; MySQL/UI non exécutés |
| CRM03-SHW-10 persistance | PARTIEL | persistance MySQL couverte sur fixtures ; actualisations navigateur non exécutées |

## 6. Disponibilité des véhicules

| ID | Statut | Résultat |
|---|---|---|
| VEH-01 | PARTIEL | disponibilité sans réservation couverte par tests automatisés |
| VEH-02 | PASS | essai `planned` exclu par politique et filtre API |
| VEH-03 | PASS | essai `in_progress` exclu par politique et filtre API |
| VEH-04 | PASS | exclusivité indépendante du créneau confirmée par la fixture MySQL |
| VEH-05 | PARTIEL | politique par statut PASS ; scénario daté réel non exécuté |
| VEH-06 | PASS | annulation puis nouvelle réservation réussit sur MySQL |
| VEH-07 | PARTIEL | politique de libération PASS ; réallocation réelle après clôture non exécutée |
| VEH-08 | PASS | véhicule vendu refusé par tests backend |
| VEH-09 | PASS | véhicule archivé refusé par tests de disponibilité |
| VEH-10 | PASS | matrice RBAC/scopes et agence étrangère PASS |
| VEH-11 | PASS | autre essai actif de la même visite refusé |
| VEH-12 | PASS | deux véhicules distincts au même horaire autorisés sur MySQL |

Les sélecteurs CRM/Showroom demandent explicitement `excludeTestDriveReserved=true`. Le sélecteur Devis n'a pas été modifié.

## 7. Concurrence MySQL 8.4

| ID | Statut | Résultat exact |
|---|---|---|
| CONC-01 | PASS | deux réservations simultanées du même véhicule : une création, un conflit |
| CONC-02 | PASS | créneaux différents ne lèvent pas l'exclusivité par statut |
| CONC-03 | PARTIEL | sérialisation commune du véhicule prouvée ; deux routes HTTP CRM/Showroom simultanées non rejouées |
| CONC-04 | PARTIEL | double démarrage protégé par statut/CAS en tests ; course HTTP MySQL non rejouée |
| CONC-05 | PARTIEL | double retour protégé par statut/verrou en tests ; course HTTP MySQL non rejouée |
| CONC-06 | PARTIEL | annulation concurrente avec nouvelle réservation laisse au plus un actif ; annulation contre endpoint start non rejouée |
| CONC-07 | PASS | réservation possible après annulation sur MySQL |
| CONC-08 | NON EXÉCUTÉ | réallocation réelle après clôture non incluse dans la fixture disponible |
| CONC-09 | NON EXÉCUTÉ | course de kilométrage réelle non incluse dans la fixture CRM-02 |
| CONC-10 | PASS | aucun double actif et aucun lien essai/visite/véhicule ou activité CRM orphelin après campagne |

Fixture CRM-02 : **1/1 test PASS** en 2,53 s.  
Fixture intégrité Showroom : premier passage 3 PASS / 1 blocage de privilège pour le trigger de panne ; rejeu avec l'administrateur de la seule instance temporaire : **4/4 PASS** en 4,35 s, rollback compris.

## 8. RBAC et scopes

La matrice ciblée Supertest passe **114/114**. Elle couvre notamment `showroom.view`, `showroom.visitor.create`, `showroom.assign`, `showroom.status.update`, `showroom.visitor.update`, le démarrage CRM composite et les scopes OWN, AGENCY, CONCESSION et GLOBAL.

Résultats :

- permission absente : refus 403 ;
- ressource hors scope : masquée/refusée ;
- autre agence et autre concession : périmètres conservés ;
- démarrage CRM : double permission `showroom.visitor.update` + `crm.test_drive.create` exigée ;
- retour physique : permission distincte maintenue ;
- aucun rôle ou permission n'a été créé ou modifié.

## 9. Recette navigateur

Statut global : **NON EXÉCUTÉ**.

Un navigateur automatisable existe, mais aucune instance locale isolée réunissant le bundle courant, la base temporaire et deux utilisateurs fictifs authentifiables n'était préparée. Les instances accessibles sont des environnements préexistants protégés. Les utiliser aurait contrevenu à l'interdiction d'écrire dans une base existante ou aurait testé une version non démontrée comme identique au checkout.

Restent donc à exécuter : visibilité réelle des boutons, messages, avertissements, refetch, deux sessions commerciales, synchronisation Socket.IO et absence d'erreurs JavaScript bloquantes.

## 10. Tests temporels

- démarrage avant/à/après l'heure : PASS dans les tests de politique, sans blocage par `scheduled_at` ;
- démarrage le lendemain : PARTIEL, politique compatible mais scénario réel non rejoué ;
- retour immédiat : PASS dans les tests backend ciblés ;
- passage de minuit : PASS frontend ;
- navigateurs Africa/Brazzaville, UTC et America/New_York : PASS sur les helpers frontend ;
- convention serveur : MySQL temporaire UTC, mais le pool mysql2 ne fixe toujours pas explicitement `timezone: 'Z'`.

Ce dernier point reste le risque transversal CRM-01. Aucun changement global de fuseau n'a été effectué.

## 11. Tests automatisés

| Campagne | Résultat |
|---|---|
| Backend CRM/Showroom ciblé | 11 fichiers PASS directement + 3 fichiers Supertest rejoués hors sandbox |
| Matrice Supertest/RBAC ciblée | 114 PASS / 0 FAIL |
| Frontend CRM/Showroom ciblé | 22 PASS / 0 FAIL |
| MySQL exclusivité CRM-02 | 1 PASS / 0 FAIL |
| MySQL intégrité Showroom | 4 PASS / 0 FAIL au rejeu autorisé |
| Frontend global | 986 PASS / 0 FAIL / 0 SKIP, 129,3 s |
| Backend global | 1 946 PASS / 5 FAIL / 91 SKIP sur 2 042 tests, 188,7 s |
| Lint backend/frontend | PASS / PASS |
| Build backend/frontend | PASS / PASS |
| `git diff --check` | PASS |

Les cinq échecs backend globaux concernent : deux validations Paramètres dans `app.test.ts`, un tri agence dans `code500-sort-regression.test.ts`, une assertion historique Devis dans `quotations-dynamic-rbac.test.ts`, et une assertion de délégation dans `rbac-core-alignment.test.ts`. Aucun ne porte sur la correction CRM-02. Ils correspondent aux familles Paramètres/Devis/RBAC déjà connues et n'ont pas été corrigés pendant cette mission.

Les 91 SKIP sont principalement des tests opt-in MySQL d'autres domaines ; ils ne sont pas présentés comme exécutés.

## 12. Anomalies

Aucune anomalie P0/P1 CRM/Showroom confirmée.

### CRM03-ENV-01 — privilège de fixture insuffisant

- Gravité : environnementale, non applicative.
- Reproduction : exécuter la fixture `showroom-integrity-mysql.integration.test.ts` avec l'utilisateur SQL applicatif dédié alors que le binary log est actif.
- Attendu : création du trigger temporaire simulant une panne.
- Obtenu : `ER_BINLOG_CREATE_ROUTINE_NEED_SUPER`.
- Résolution de recette : rejeu avec le compte administrateur de l'instance temporaire uniquement ; 4/4 PASS.
- Impact production : aucun ; aucune configuration métier ou serveur existante modifiée.

## 13. Régressions

Aucune régression CRM-02 détectée dans les suites ciblées, les builds ou MySQL 8.4. Les cinq échecs globaux hors périmètre empêchent toutefois d'affirmer une non-régression globale parfaite de l'ensemble de l'ERP.

## 14. Réserves

1. Recette navigateur du bundle courant non exécutée.
2. Deux sessions réelles et synchronisation Socket.IO non exécutées.
3. CONC-03 à CONC-06 seulement partiels ; CONC-08 et CONC-09 non exécutés en MySQL réel.
4. Convention UTC mysql2 toujours implicite.
5. Cinq assertions backend globales historiques restent rouges hors CRM/Showroom.

## 15. Verdict final

**CRM-03 : VALIDÉ AVEC RÉSERVES.**

Les contrôles réalisés ne révèlent aucune non-conformité critique CRM/Showroom. L'exclusivité du véhicule résiste à une course MySQL réelle, les protections RBAC restent actives, le démarrage n'est plus borné par l'heure planifiée et les retours immédiats sont acceptés dans les tests ciblés.

Le verdict ne peut pas devenir « sans réserve » tant que la recette navigateur sur une instance applicative isolée du code courant et les courses MySQL restantes n'ont pas été exécutées.

## 16. Recommandations

1. Préparer une stack applicative CRM-03 totalement isolée, avec deux comptes fictifs et le bundle du commit testé.
2. Rejouer CRM03-CRM-01 à 09 et CRM03-SHW-01 à 10 dans deux sessions navigateur.
3. Ajouter une fixture MySQL/HTTP dédiée couvrant exactement CONC-03 à CONC-09.
4. Qualifier séparément la convention UTC du pool mysql2 avant toute modification transversale.
5. Traiter les cinq échecs globaux hors périmètre dans un lot distinct.

Aucun commit, push, déploiement, accès VPS, écriture dans une base métier, modification de rôle ou correction automatique n'a été effectué.
