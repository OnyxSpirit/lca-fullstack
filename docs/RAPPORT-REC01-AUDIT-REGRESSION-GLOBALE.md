# REC-01 — Audit et stabilisation des suites globales

Date : 20 octobre 2026  
Verdict : **VALIDÉ** pour la stabilisation des suites de tests uniquement.

Ce verdict ne constitue pas une autorisation de mise en production et ne démarre ni REC-02 ni REC-03.

## 1. État initial du dépôt

Branche conservée : `main`.

Élément non suivi présent avant REC-01 et préservé : `lca-fin.zip`. Les corrections photo/logo et leur rapport étaient déjà présents dans l'état suivi du dépôt au début de cette mission.

Aucun reset, restore, stash, clean, changement de branche, commit ou push n'a été exécuté.

## 2. Environnement de test

- Node.js 24.11.1 ;
- suites Node Test exécutées séquentiellement ;
- frontend lancé avec `tsx --test --test-concurrency=1` ;
- backend lancé avec les variables de test du script `npm test` ;
- serveurs HTTP éphémères Supertest locaux, sans service métier ;
- aucune base métier, aucun conteneur métier et aucun volume métier utilisés ou modifiés ;
- aucune recette navigateur.

Le sandbox interdit la création du socket IPC `tsx` et l'écoute HTTP éphémère de Supertest (`EPERM`). Les campagnes applicatives ont donc été relancées hors de cette restriction locale, sans accès à la production.

## 3. Résultats initiaux

### Frontend

- total : 959 ;
- réussis : 958 ;
- échecs : 1 ;
- ignorés : 0 ;
- non exécutés : 0 ;
- durée : 133 748,96 ms.

Échec : `fin04-remunerations.test.ts` attendait le texte historique `Rémunérations`, alors que le libellé fonctionnel validé est `Salaires & rémunérations`.

### Backend

La première tentative confinée a été bloquée par `listen EPERM` et interrompue après absence de progression ; elle est classée problème d'environnement et non régression applicative.

La campagne initiale exploitable hors sandbox a exécuté les 2 014 tests :

- réussis : 1 898 ;
- échecs : 25 ;
- ignorés conditionnels : 91 ;
- non exécutés : 0 ;
- durée observée : environ 3 min 30 s (la sortie volumineuse du runner initial a été tronquée par le collecteur ; la campagne finale fournit la durée exacte).

Les 25 échecs provenaient de cinq groupes : fixtures CRM de création, fixtures CRM de réaffectation, fixture de matrice Stock, assertion d'emplacement véhicule et assertion de transition logistique.

## 4. Inventaire et classification des anomalies

| Référence | Cause | Classe | Sévérité |
|---|---|---|---|
| REC01-FE-01 | Ancien libellé `Rémunérations` dans une assertion | B — test obsolète | Mineure |
| REC01-BE-01 | Fixtures CRM sans lignes pour les nouvelles requêtes de snapshots auteur/agence des notifications | C — fixture incorrecte | Majeure pour la suite |
| REC01-BE-02 | Fixture Stock sans lignes pour les mêmes snapshots historiques | C — fixture incorrecte | Majeure pour la suite |
| REC01-BE-03 | Assertions limitées à `PARC`/`SHOWROOM` après validation officielle de `GARAGE` | B — tests obsolètes | Mineure |
| REC01-ENV-01 | IPC `tsx` et écoute Supertest interdits dans le sandbox | D — environnement | Bloquant localement |

Aucune régression applicative réelle n'a été démontrée. Aucun contrôle métier, RBAC, financier, territorial ou de sécurité n'a été assoupli.

## 5. Passe 1 — corrections

- Mise à jour exacte du libellé attendu vers `Salaires & rémunérations`.
- Ajout, dans les fixtures CRM et Stock concernées, des réponses aux lectures de l'auteur et de l'agence utilisées par la traçabilité des notifications.
- Mise à jour des assertions statiques afin qu'elles vérifient le validateur central `isVehicleLocationType`, qui couvre les types officiellement autorisés dont `GARAGE`.
- Aucun fichier applicatif backend modifié.
- Aucun test supprimé, ignoré ou affaibli.

Fichiers REC-01 modifiés :

- `frontend/test/fin04-remunerations.test.ts` ;
- `backend-node/test/crm-assignment-endpoint.test.ts` ;
- `backend-node/test/crm-reassignment-endpoint.test.ts` ;
- `backend-node/test/vehicle-scope-matrix.test.ts` ;
- `backend-node/test/recette-critique-02.test.ts` ;
- `backend-node/test/stock-parc-recette-fix02.test.ts`.

## 6. Résultats ciblés de la passe 1

- frontend FIN04 : 3/3 réussis, 0 échec, 0 ignoré, 291,48 ms ;
- backend CRM/Stock : 129/129 réussis, 0 échec, 0 ignoré, 6 823,91 ms.

## 7. Résultats globaux de la passe 1

### Frontend

- total : 959 ;
- réussis : 959 ;
- échecs : 0 ;
- ignorés : 0 ;
- non exécutés : 0 ;
- durée : 124 005,02 ms.

### Backend

- total : 2 014 ;
- réussis : 1 923 ;
- échecs : 0 ;
- ignorés conditionnels : 91 ;
- non exécutés : 0 ;
- durée : 211 281,15 ms.

Les suites étant vertes à l'issue de la passe 1, aucune passe 2 ou 3 n'a été nécessaire.

## 8. Comparaison avant / après

| Suite | Avant | Après passe 1 |
|---|---:|---:|
| Frontend | 958 PASS / 1 FAIL | 959 PASS / 0 FAIL |
| Backend | 1 898 PASS / 25 FAIL / 91 SKIP | 1 923 PASS / 0 FAIL / 91 SKIP |

## 9. Prestataires et photo/logo

Campagne frontend ciblée :

- total : 41 ;
- réussis : 41 ;
- échecs : 0 ;
- ignorés : 0 ;
- durée : 4 898,86 ms.

Elle couvre les profils, Personnel unifié, contrats et édition de brouillon, rémunérations, finance, photo/logo Prestataire, photo Employé et comportement de la zone GED.

Campagne backend Prestataires ciblée :

- total : 37 ;
- réussis : 33 ;
- échecs : 0 ;
- ignorés conditionnels MySQL : 4 ;
- durée : 5 685,78 ms.

## 10. Migrations

Les contrôles statiques et la suite globale relatifs aux migrations sont verts. Les scénarios réels MySQL 8.4 de 094, 097 et 101 figurent parmi les quatre tests ciblés ignorés, car leur variable d'activation et une instance MySQL jetable dédiée n'étaient pas disponibles pendant cette campagne.

Le rapport LOT 7 conserve la preuve antérieure de la chaîne 071→101 sur MySQL 8.4 isolé. REC-01 ne revendique pas un nouveau rejeu SQL réel.

## 11. Lint, builds et intégrité du diff

- lint frontend : PASS ;
- build frontend : PASS, 2 516 modules transformés ;
- lint backend : PASS ;
- build backend : PASS ;
- `git diff --check` : PASS.

## 12. Anomalies restantes et risques résiduels

Aucun échec ne subsiste dans les suites ordinaires frontend et backend.

Risques résiduels :

- les 91 tests backend conditionnels restent ignorés sans leurs environnements d'intégration (principalement MySQL 8.4, concurrence ou WSS/TLS) ;
- les migrations 094/097/101 n'ont pas été rejouées réellement pendant REC-01 ;
- aucune recette HTTP métier dédiée ni recette navigateur n'était autorisée dans REC-01.

## 13. Préparation de REC-02

Les suites ordinaires sont stabilisées et permettent de préparer REC-02. Cette préparation ne vaut ni démarrage de REC-02, ni autorisation de déploiement. REC-02 devra traiter explicitement les tests conditionnels et les parcours d'intégration réels dans un environnement isolé autorisé.

## 14. Verdict final

**VALIDÉ** pour l'objectif REC-01 de stabilisation des suites globales.

La validation repose sur une passe de correction, deux suites globales finales sans échec, les tests Prestataires/photo-logo ciblés, les lint, les builds et le contrôle du diff. Elle ne couvre pas la mise en production.
