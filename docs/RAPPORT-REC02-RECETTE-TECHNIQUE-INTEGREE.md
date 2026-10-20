# REC-02 — Recette technique intégrée HTTP, RBAC, MySQL, concurrence et finance

Date : 20 octobre 2026  
Verdict : **NON VALIDÉ**

Ce verdict concerne uniquement REC-02. Il ne constitue ni une validation fonctionnelle complète, ni une autorisation de mise en production.

## 1. Synthèse

L'environnement Docker local a été identifié sans ambiguïté. La pile `lca` utilise le Compose du dépôt, MySQL 8.4.11, la base locale `concession_erp`, les migrations 034 à 101, un backend sain et un frontend publié sur le port HTTP 80. La pile distincte `lca-recette` publie le backend sur `127.0.0.1:3004`, le frontend sur `127.0.0.1:4176` et MySQL sur `127.0.0.1:33321`, mais son journal s'arrête à 079 et ne contient aucune table Prestataires.

La non-régression ordinaire est verte : 959 tests frontend réussis et 1 923 tests backend réussis, avec 91 tests backend conditionnels explicitement ignorés. Les migrations 094, 097 et 101 ont été rejouées avec succès sur des schémas temporaires MySQL 8.4, ensuite supprimés.

La recette HTTP authentifiée multi-profils et le scénario financier critique n'ont pas pu être exécutés. Le secret configuré pour le Super Admin local ne permet plus l'authentification (HTTP 401), le compte existant est protégé par TOTP, aucune session navigateur n'était disponible, et le provisionneur officiel refuse correctement la création d'un second Super Admin système. Aucun JWT n'a été forgé, aucun secret 2FA n'a été extrait et aucune donnée d'authentification n'a été modifiée directement en SQL.

## 2. Environnement réellement utilisé

### Pile `lca`

- Compose : `docker-compose.yml` du dépôt courant ;
- projet Docker : `lca` ;
- backend : `lca-backend-1`, sain, réseau privé `lca_private` ;
- frontend : `lca-frontend-1`, sain, réseaux `lca_private` et `lca_public`, port hôte 80 ;
- MySQL : `lca-mysql-1`, sain, image MySQL 8.4 ;
- base : `concession_erp` ;
- version MySQL : 8.4.11 ;
- migrations : 55 entrées, plage 034 à 101 ;
- migrations 094 à 101 présentes, dont 096, 097, 098, 099, 100 et 101 ;
- variables backend nécessaires déclarées, valeurs non exposées.

### Pile `lca-recette`

- Compose principal déclaré par les services applicatifs : `docker-compose.recette.yml` avec un override temporaire historique ;
- backend : sain, `127.0.0.1:3004` ;
- frontend : sain, `127.0.0.1:4176` ;
- MySQL : sain, `127.0.0.1:33321` ;
- base : `lca_recette` ;
- version MySQL : 8.4.11 ;
- migrations : 9 entrées, plage 071 à 079 ;
- tables `provider_profiles`, `provider_contracts` et `provider_remunerations` absentes.

Les labels Docker rattachent les deux piles au répertoire local du dépôt. Aucun hôte distant, VPS ou endpoint de production n'a été utilisé.

## 3. État initial des migrations et données

La pile `lca` est structurellement compatible avec les Prestataires jusqu'à la migration 101. Avant recette, elle contenait zéro prestataire, zéro contrat prestataire et zéro rémunération prestataire. Elle contenait déjà quatre dépenses budgétaires et deux décaissements historiques, qui n'ont pas été modifiés.

La pile `lca-recette` n'est pas compatible avec le périmètre Prestataires. Conformément à la mission, aucune migration 096 à 101 n'y a été appliquée.

## 4. Comptes et rôles de test

Deux comptes locaux préexistants ont été observés ; aucun nouveau compte n'a été créé. Les identifiants ne sont pas reproduits dans ce rapport.

Le provisionneur officiel `seed-admin` a été appelé avec un identifiant fictif `REC02-2026` et un secret éphémère hors dépôt. Il a refusé l'opération avec le contrôle attendu : un Super Admin système existe déjà avec un autre email. La transaction a été annulée. Le fichier temporaire contenant le secret non utilisé a été supprimé.

Le compte Super Admin existant possède un facteur TOTP actif. Il n'a pas été réinitialisé, déchiffré ou contourné. Les utilisateurs Responsable RH, Gestionnaire Prestataires, Responsable financier, Approbateur, Trésorier, agences/concessions A/B et sans permission n'ont donc pas pu être créés par l'API normale.

## 5. Matrice RBAC et scénarios HTTP

### Réellement exécutés sur `http://127.0.0.1`

| Scénario | Résultat |
|---|---|
| santé API | HTTP 200 |
| login avec le secret administrateur configuré | HTTP 401, identifiants invalides |
| `GET /api/hr/providers` sans JWT | HTTP 401, jeton manquant |
| même endpoint avec JWT syntaxiquement invalide | HTTP 401, jeton invalide ou expiré |
| même endpoint avec JWT expiré | HTTP 401, jeton invalide ou expiré |

Le JWT expiré n'accordait aucun accès et utilisait une session inexistante. Aucun jeton autorisé n'a été fabriqué.

### Bloqués

Les scopes `GLOBAL`, `CONCESSION`, `AGENCY` et `OWN`, les permissions absentes, l'inter-agence, l'inter-concession et l'IDOR direct n'ont pas été exercés en HTTP réel avec des utilisateurs dédiés. Ils restent couverts par les suites ordinaires, mais cette couverture ne remplace pas la recette intégrée demandée.

## 6. Prestataires, contrats et rémunérations

Les parcours de création d'identité, profil Prestataire, rattachements, modification, suspension/réactivation, contrats, transitions contractuelles, trois modalités de rémunération, retenue et net n'ont pas été exécutés via HTTP sur la base locale. Aucun enregistrement fictif Prestataire n'a été créé.

Les tests ordinaires correspondants sont verts et confirment statiquement les protections, mais ne sont pas requalifiés en preuve E2E.

## 7. Scénario financier principal

Le scénario `REC02-2026-PRESTATAIRE-FINANCE` à 1 500 000 XAF brut, 50 000 XAF de retenue, 1 450 000 XAF net, puis décaissements de 500 000 et 950 000 XAF n'a pas été exécuté.

Motif : absence de session administrateur normale permettant de créer les acteurs indépendants et leurs permissions. L'exécuter avec une identité forgée, une insertion SQL directe ou un contournement TOTP aurait invalidé la preuve RBAC et enfreint la mission.

Aucune rémunération, dépense, approbation, réservation, écriture de trésorerie ou snapshot de moyen de paiement REC02 n'a donc été créé.

## 8. GED et moyens de règlement

Les scénarios GED Prestataires, facture obligatoire, exceptions documentaires et moyens de règlement n'ont pas été exécutés en HTTP réel. Aucune clé de chiffrement n'a été modifiée et aucune coordonnée existante n'a été relue ou rechiffrée.

Les variantes clé absente, invalide et valide restent non exécutées dans REC-02.

## 9. Concurrence et idempotence

Les sept scénarios REC-02 de concurrence financière n'ont pas été exécutés sur le parcours Prestataires, car leurs préconditions HTTP authentifiées n'étaient pas disponibles.

La suite backend ordinaire confirme les contrats unitaires de verrouillage et d'idempotence. Les campagnes B.3.1 antérieures apportent une preuve MySQL réelle sur d'autres domaines, mais elles ne sont pas comptées comme exécution REC-02 du scénario financier Prestataires.

## 10. Tests conditionnels et migrations

### Exécutés pendant REC-02

| Test isolé MySQL 8.4 | Résultat | Couverture |
|---|---|---|
| migration 094, cas principal | PASS | reprise et divergence |
| migration 094, baseline conforme | PASS | adoption stricte sans perte |
| migration 097 | PASS | 096→097, interruption DDL, interruption DML, backfill, unicité et divergence |
| migration 101 | PASS | six étapes, schéma financier Prestataires et reprise |

Les tests ont créé leurs propres schémas temporaires dans le MySQL local publié en loopback. Le contrôle final indique `temporary_databases_remaining=0`. Ni `concession_erp` ni `lca_recette` n'ont reçu ces migrations pendant la campagne.

### Classification des 91 SKIP de la suite ordinaire

Les 91 cas conditionnels appartiennent aux familles MySQL/migrations, concurrence transactionnelle, HTTP avec MySQL, WSS/TLS et dépendances de stockage. Leur inventaire est piloté par des variables explicites telles que `MIGRATION_*_MYSQL_TEST`, `FIN*_MYSQL_TEST`, `LCA_*_DB_TEST`, `*_CONCURRENCY_MYSQL_TEST`, `SHOWROOM_INTEGRITY_MYSQL_TEST` et `LCA_WSS_PROXY_TEST`.

REC-02 a réexécuté les quatre tests Node critiques relatifs aux migrations 094/097/101. Les autres cas n'ont pas été rejoués intégralement : la preuve exhaustive 59/59 fichiers, 111/111 tests existe dans B.3.1, mais elle est antérieure et n'est pas présentée comme une nouvelle campagne REC-02.

## 11. Non-régression

| Contrôle | Résultat |
|---|---|
| frontend complet | 959 PASS, 0 FAIL, 0 SKIP, 145 679,95 ms |
| backend complet | 1 923 PASS, 0 FAIL, 91 SKIP conditionnels, 236 838,84 ms |
| lint frontend | PASS |
| build frontend | PASS, 2 516 modules transformés |
| lint backend | PASS |
| build backend | PASS |
| `git diff --check` | PASS |

Ces résultats reproduisent exactement la campagne finale REC-01 pour les tests (959 et 1 923), avec des durées nouvelles REC-02.

## 12. Comptage par domaine

| Domaine | Prévus par la mission | Exécutés | Réussis | Échoués | Bloqués | Non exécutés |
|---|---:|---:|---:|---:|---:|---:|
| preuve environnement et santé | 2 | 2 | 2 | 0 | 0 | 0 |
| authentification négative | 4 | 4 | 3 | 1 | 0 | 0 |
| matrice RBAC multi-profils | 10 | 0 | 0 | 0 | 10 | 0 |
| Prestataires et contrats | 12 | 0 | 0 | 0 | 12 | 0 |
| rémunérations | 7 | 0 | 0 | 0 | 7 | 0 |
| scénario financier principal | 13 | 0 | 0 | 0 | 13 | 0 |
| GED et exceptions | 10 | 0 | 0 | 0 | 10 | 0 |
| moyens de règlement | 9 | 0 | 0 | 0 | 9 | 0 |
| concurrence Prestataires | 7 | 0 | 0 | 0 | 7 | 0 |
| budgets et trésorerie REC-02 | 10 | 0 | 0 | 0 | 10 | 0 |
| migrations isolées 094/097/101 | 4 | 4 | 4 | 0 | 0 | 0 |
| suites globales | 2 | 2 | 2 | 0 | 0 | 0 |

Le login configuré est compté comme échec de précondition et non comme anomalie fonctionnelle de l'API.

## 13. Anomalies

### REC02-001 — Compte de recette privilégié indisponible

- module : Authentification / préparation REC-02 ;
- profil : Super Admin local ;
- endpoint : `POST /api/auth/login` ;
- méthode : POST ;
- attendu : authentification normale permettant de créer les acteurs fictifs ;
- obtenu : HTTP 401, identifiants invalides ;
- état MySQL : compte actif, rôle système Super Admin, TOTP actif ;
- provisionnement alternatif : refus correct d'un second Super Admin système ;
- sévérité : critique pour REC-02 ;
- bloquant : oui ;
- correction automatique : aucune.

Ce constat peut provenir d'une rotation locale légitime non reflétée dans le secret Compose. Il ne démontre pas une régression du code d'authentification.

## 14. Risques résiduels

- aucune preuve HTTP positive multi-profils ;
- aucune preuve E2E du scénario financier Prestataires ;
- aucune preuve REC-02 de concurrence sur le solde net ;
- aucune vérification REC-02 des snapshots chiffrés de paiement ;
- aucune preuve HTTP des scopes et refus IDOR Prestataires ;
- 87 des 91 tests conditionnels ordinaires n'ont pas été rejoués pendant cette campagne ;
- `lca-recette` reste structurellement à 079 et ne peut pas servir de cible Prestataires sans autorisation de migration distincte.

## 15. Conditions de reprise

Fournir ou provisionner, par une procédure officielle autorisée, un compte local de recette authentifiable permettant l'enrôlement 2FA normal. À défaut, autoriser explicitement une rotation contrôlée du mot de passe et une réinitialisation 2FA du compte local existant avec preuve forte et audit.

Après authentification, créer les rôles et utilisateurs fictifs via les API normales, puis reprendre la campagne à la matrice RBAC avant toute opération financière. Ne pas appliquer 096 à 101 sur `lca_recette` sans autorisation distincte.

## 16. Verdict final

**NON VALIDÉ.**

L'environnement local, le schéma 101 de la pile `lca`, les migrations isolées et la non-régression sont démontrés. Toutefois, la mission interdit explicitement un verdict positif lorsqu'un scénario financier critique ou une recette HTTP authentifiée reste non exécuté. Les deux conditions sont présentes.

Aucun commit, push, déploiement, accès VPS, changement de branche, reset, restore, stash, clean, suppression de volume, réinitialisation de base ou démarrage de REC-03 n'a été effectué.
