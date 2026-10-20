# REC-02.3 — Harnais HTTP authentifié et clôture technique

Date : 20 octobre 2026  
Environnement : Docker local `lca` uniquement  
Verdict provisoire : **NON VALIDÉ — IDOR HTTP démontré, finance et GED encore bloqués par l’authentification des rôles historiques**

Ce rapport ne contient aucun mot de passe, code TOTP, JWT, cookie, en-tête `Authorization` ou secret applicatif. Il n’autorise ni REC-03 ni un déploiement.

## 1. Résumé exécutif

Un harnais HTTP explicitement opt-in a été ajouté dans `backend-node/test/rec02-http-integration.ts`. Il utilise exclusivement les routes réelles derrière `http://127.0.0.1`, le login officiel, des jetons conservés en mémoire et des lectures MySQL via le conteneur local. Il ne s’enregistre pas dans la suite ordinaire tant que `REC02_HTTP_TEST=1` n’est pas fourni.

Le harnais a démontré l’authentification officielle séparée des trois comptes territoriaux REC02-2 et les refus IDOR directs sur `GET /api/hr/providers/:id`. Une tentative `PATCH` sans permission a été refusée et n’a produit aucune modification MySQL.

Le compte trésorier historique ne s’authentifie pas avec le secret administratif local ni avec le secret des comptes territoriaux. Aucun secret correspondant aux rôles historiques trésorier, gestionnaire Prestataires, financier, demandeur et approbateur n’est disponible par un canal conforme. Conformément à la mission, aucune session n’a été forgée, aucun jeton/cookie du navigateur n’a été extrait et aucune nouvelle donnée financière n’a été créée. Les scénarios d’idempotence et de concurrence restent donc non exécutés.

## 2. Environnement Docker

Les contrôles en lecture ont établi :

- `lca-backend-1` : running, healthy, port 3001 interne uniquement ;
- `lca-frontend-1` : running, healthy, port hôte 80 ;
- `lca-mysql-1` : running, healthy, MySQL 8.4, aucun port publié ;
- réseau backend/MySQL : `lca_private` ;
- base : `concession_erp` ;
- dernière migration : `101_provider_remuneration_finance.sql` ;
- 12 comptes REC02 actifs, 3 prestataires, 2 contrats et 1 rémunération avant REC-02.3.

Aucun conteneur, volume, schéma ou historique n’a été supprimé ou réinitialisé.

## 3. Audit d’authentification

Le contrat réel est `POST /api/auth/login` avec `email` et `password`. Une connexion sans obligation 2FA renvoie `status=authenticated`, un jeton d’accès, un jeton de renouvellement et le profil. Un compte protégé renvoie un challenge officiel et n’est pas contournable par le harnais.

Résultats :

- les comptes `rec02-2.agency`, `rec02-2.concession` et `rec02-2.global` s’authentifient officiellement et séparément ;
- le compte `rec02.tresorier` retourne HTTP 401 avec les deux secrets locaux disponibles sans exposition ;
- le secret du Super Administrateur n’est pas réutilisable pour le trésorier ;
- aucun autre secret historique n’est présent dans le dépôt, les rapports ou la mémoire navigateur disponible.

Le transfert interne du secret territorial vers le processus de test a employé une enveloppe RSA-OAEP éphémère. Seul le texte chiffré a transité ; le secret a été déchiffré dans une variable de processus, puis supprimé avec la clé privée temporaire.

## 4. Architecture et protections du harnais

Le harnais :

- ne s’active qu’avec `REC02_HTTP_TEST=1` ;
- accepte les secrets uniquement dans l’environnement du processus ;
- n’affiche jamais les corps d’authentification ni les en-têtes sensibles ;
- force `redirect: manual` et refuse toute redirection ;
- refuse le changement d’origine ;
- autorise seulement HTTP vers loopback, ou les services Docker `frontend`/`backend` explicitement activés ;
- vérifie les adresses issues de la résolution DNS ;
- limite ses contrôles SQL à des requêtes commençant par `SELECT` ;
- utilise `docker compose -p lca exec -T mysql` sans publier MySQL ;
- n’ajoute aucune route de test, aucun mécanisme d’authentification alternatif et aucune modification frontend.

Une cible publique HTTPS a été testée : le harnais l’a refusée avant toute tentative réseau.

## 5. Endpoints, payload et permissions relevés

### Décaissement Prestataire

- méthode : `POST` ;
- endpoint : `/api/hr/provider-remunerations/:id/disburse` ;
- clé idempotente : `clientRequestId` ;
- champs : `instrumentId`, `accountId`, `categoryId`, `paymentMethodId`, `amount`, `valueDate`, `beneficiary`, `reference`, `description`, `clientRequestId` ;
- permissions cumulées : `hr.provider.remuneration.disburse`, `hr.expense.disburse`, `treasury.disbursement.create` ;
- premier succès : HTTP 201 avec `duplicate=false` ;
- rejeu identique : HTTP 200 avec `duplicate=true` ;
- même clé et payload différent : HTTP 409.

Le service verrouille la dépense (`FOR UPDATE`), relit la clé par `(created_by, client_request_id)`, contrôle compte, concession, agence, devise, solde dû et solde de trésorerie, puis crée décaissement, mouvement, snapshot et audit dans la même transaction.

### Prestataires et GED

- lecture directe : `GET /api/hr/providers/:id`, permission `hr.providers.view` ;
- modification : `PATCH /api/hr/providers/:id`, permission `hr.providers.manage` ;
- téléchargement : `GET /api/documents/:id/download`, permissions `ged.view` et politique de l’entité ;
- exceptions : demande, approbation et refus sont implémentés sur `/api/hr/provider-remunerations/:id/document-exceptions...`, avec séparation demandeur/décideur.

## 6. Matrice IDOR HTTP réelle

Jeu utilisé : prestataires 1 (Brazzaville), 2 (Pointe-Noire, même concession) et 3 (Dolisie, autre concession).

| Scénario | Méthode et endpoint | Attendu | Obtenu | Verdict |
|---|---|---:|---:|---|
| AGENCY lit son agence | `GET /api/hr/providers/1` | 200 | 200 | PASS |
| AGENCY lit autre agence | `GET /api/hr/providers/2` | refus | 404 | PASS |
| AGENCY lit autre concession | `GET /api/hr/providers/3` | refus | 404 | PASS |
| CONCESSION lit agence principale | `GET /api/hr/providers/1` | 200 | 200 | PASS |
| CONCESSION lit autre agence de sa concession | `GET /api/hr/providers/2` | 200 | 200 | PASS |
| CONCESSION lit autre concession | `GET /api/hr/providers/3` | refus | 404 | PASS |
| GLOBAL lit les trois territoires | trois `GET` directs | 200 | 200/200/200 | PASS |
| AGENCY tente un PATCH | `PATCH /api/hr/providers/3` | 403 | 403 | PASS fonctionnel |

La preuve MySQL avant/après du prestataire 3 (`service_nature`, statut et `updated_at`) est identique : aucune modification interdite.

Réserve : le PATCH démontre l’absence de permission fonctionnelle, pas encore un refus territorial avec `hr.providers.manage`. La mission exige un rôle d’écriture minimal pour distinguer ces deux causes ; sa création nécessite une session administrative officielle actuellement indisponible au harnais.

## 7. Idempotence et concurrence

Le code du harnais contient les scénarios réels suivants, mais ils n’ont pas été activés faute d’authentification du trésorier :

- premier décaissement, rejeu exact, comparaison d’identifiant et snapshot MySQL ;
- même clé avec montant différent, attendu HTTP 409 ;
- trois courses distinctes, chacune avec une barrière de lancement, deux requêtes de 400 000 XAF sur un solde de 600 000 XAF et deux clés distinctes ;
- preuve attendue par course : un HTTP 201, un HTTP 409, un décaissement de 400 000 XAF, un mouvement et un solde final de 200 000 XAF.

**Résultat réel : non exécuté.** Aucune opération financière REC-02.3 n’a été créée.

## 8. GED et exceptions documentaires

Le code confirme que le workflow existe : exigence `PAYMENT`, exception demandée, rejetée ou approuvée par une identité distincte, facture typée obligatoire pour une personne morale, téléchargement protégé et hash vérifié.

Le document REC-02.2 ID 19 n’a été ni supprimé ni modifié. Les compléments HTTP autorisés n’ont pas été exécutés faute de secret pour le gestionnaire Prestataires/GED et l’approbateur. Une identité territoriale sans `ged.view` reste correctement refusée, mais cela ne remplace pas le téléchargement autorisé et son contrôle d’intégrité.

## 9. Anomalies et risques résiduels

### REC02-3-001 — Secrets des rôles historiques indisponibles

- impact : authentification HTTP impossible pour trésorier, Prestataires, financier, demandeur et approbateur ;
- preuve : HTTP 401 du trésorier avec les secrets locaux disponibles ;
- sécurité : aucun contournement réalisé ;
- résolution conforme : rotation officielle contrôlée des mots de passe des seuls comptes fictifs, ou fourniture éphémère de leurs secrets au processus sans passage par la conversation.

### REC02-3-002 — PATCH territorial non isolé

Le refus PATCH acquis est fonctionnel (`hr.providers.manage` absent). Il reste à créer officiellement une identité AGENCY d’écriture minimale, prouver un PATCH local autorisé puis un PATCH hors territoire refusé.

### Risques résiduels

- aucune preuve HTTP réelle du rejeu idempotent ;
- aucune preuve HTTP réelle des trois courses concurrentes ;
- aucune preuve GED autorisée/téléchargement/hash pendant REC-02.3 ;
- workflow d’exception documentaire non exercé ;
- secrets des comptes de recette historiques à gouverner ou faire tourner officiellement.

## 10. Tests et non-régression

Résultats finaux :

- tests frontend complets : **959 PASS**, 0 FAIL, 0 SKIP, 131 175,46 ms ;
- tests backend complets : **1 924 PASS**, 0 FAIL, 91 SKIP conditionnels, 203 605,59 ms ;
- lint backend : PASS ;
- build backend : PASS ;
- lint frontend : PASS ;
- build frontend : PASS, 2 516 modules transformés ;
- harnais désactivé : aucune opération métier et aucune dépendance sur les secrets ;
- garde de cible publique : PASS (refus avant réseau) ;
- IDOR HTTP + MySQL : 1 test PASS, 0 FAIL ;
- comparaison REC-02.2 : résultats globaux strictement identiques (959 frontend, 1 924 backend, 91 skips) ;
- `git diff --check` : PASS.

## 11. Fichiers modifiés

- `backend-node/test/rec02-http-integration.ts` — harnais HTTP opt-in sécurisé ;
- `docs/RAPPORT-REC02-3-CLOTURE-TECHNIQUE.md` — présent rapport.

## 12. Verdict

**REC-02.3 : NON VALIDÉ.**  
**REC-02 consolidé : NON VALIDÉ.**

La preuve IDOR HTTP en lecture est réelle et nouvelle. Les deux critères critiques de clôture — rejeu HTTP idempotent et concurrence HTTP réelle répétée trois fois — ne sont pas exécutés. Les règles de verdict interdisent donc une conclusion positive.

Recommandation : ne pas démarrer REC-03. Débloquer uniquement l’authentification officielle des comptes fictifs concernés, puis relancer les blocs déjà codés du harnais sans migration, reconstruction Docker ni changement de données historiques.
