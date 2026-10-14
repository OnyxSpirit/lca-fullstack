# Rapport de corrections — Activité utilisateurs LCA

Date : 14 octobre 2026. Le rapport `docs/AUDIT-ACTIVITE-UTILISATEURS-LCA.md` a été lu intégralement et utilisé comme référence. Aucun événement historique, snapshot, volume ou paramètre MySQL n'a été modifié.

## 1. Résumé et état initial

Les trois services principaux étaient sains avant la reproduction : `lca-mysql-1`, `lca-backend-1`, `lca-frontend-1`. ACT-01 a été reproduit par la véritable API sur le port 3001 avec le mécanisme de connexion officiel et un compte autorisé. Aucun jeton ni secret n'est consigné.

### Reproduction HTTP avant correction

| Cas | Paramètres | HTTP | Résultat / erreur |
|---|---|---:|---|
| A global | `page=1&pageSize=25` | 500 | `ER_OUT_OF_SORTMEMORY`, HY001 |
| B super-admin | `userId=1` | 200 | 25/53 lignes |
| C utilisateur 2 | `userId=2` | 500 | `ER_OUT_OF_SORTMEMORY`, HY001 |
| D module | `module=sales` | 200 | 14/14 lignes |
| E module + utilisateur | `module=sales&userId=1` | 200 | 1/1 ligne |
| F agence | `agencyId=1` | 200 | 2/2 lignes |
| G période | `from=2026-10-01&to=2026-10-14` | 500 | `ER_OUT_OF_SORTMEMORY`, HY001 |
| H recherche | `search=sale` | 200 | 14/14 lignes |
| I pages 1 et 2 | pagination globale | 500 / 500 | `ER_OUT_OF_SORTMEMORY`, HY001 |

Les logs backend et MySQL ont simultanément consigné l'erreur 1038 « Out of sort memory ». Ce résultat confirme la preuve fournie par la mission.

## 2. Cause exacte et correction ACT-01

L'ancien SELECT joignait utilisateurs, agences et concessions puis triait des lignes contenant `old_values` et `new_values` JSON avant `LIMIT`. `EXPLAIN FORMAT=TREE` montrait un scan de `audit_logs`, plusieurs jointures, un tri et jusqu'à 174 lignes intermédiaires pour 87 lignes estimées. Avec `sort_buffer_size=262144`, le tri des tuples élargis dépassait la mémoire disponible. Le filtre super-admin réduisait assez le jeu ; les filtres globaux ne le faisaient pas.

Correction : requête en deux étapes, sans migration ni nouvel index.

1. `SELECT al.id ... ORDER BY al.created_at, al.id LIMIT ? OFFSET ?` avec uniquement les jointures nécessaires au filtre de recherche.
2. Récupération des détails des identifiants retenus par `WHERE al.id IN (...)`.
3. Rétablissement de l'ordre en mémoire sur au plus 100 lignes.
4. Même stratégie pour le PDF, limité à 1 000 lignes.
5. Suppression des jointures `actor_agency` et `actor_concession` inutilisées dans la liste.

Après correction, `EXPLAIN FORMAT=TREE` montre un `Covering index scan ... idx_audit_created (reverse)` limité à 25 lignes. Aucun index ni réglage mémoire n'a été ajouté.

### Reproduction après correction

Tous les cas A à I retournent HTTP 200. Mesures observées : global 151 ms, super-admin 31 ms, utilisateur 2 102 ms, module 23 ms, agence 24 ms, période 216 ms, recherche 62 ms, pages globales 74/99 ms. Aucun nouvel `ER_OUT_OF_SORTMEMORY` n'apparaît dans les logs.

## 3. ACT-02 — présentation métier

Un modèle backend commun a été ajouté : `title`, `operationLabel`, `moduleLabel`, `sections`, `changes`. Le registre combine `entity_type + action` et couvre les familles observées ; un fallback français lisible traite les événements inconnus.

- créations : informations créées, sans « Avant : null » ;
- modifications : uniquement les valeurs réellement différentes quand avant/après existent ;
- identifiants métier secondaires exclus de l'affichage principal ;
- montants formatés en français et FCFA ;
- aucune exposition principale de JSON brut ;
- même modèle utilisé par l'écran et les PDF.

Recette navigateur réelle : la liste globale affiche 102 événements, le filtre concession et la pagination 1/5 ; la vente observée affiche « Création d'une vente automobile », « Ventes automobiles », l'acteur, l'agence, la référence, 28 000 000 FCFA, remise, acompte et solde. Après ajustement final, l'identifiant numérique d'agence n'est plus présenté comme information métier.

## 4. ACT-03 — sécurité

- la liste ne charge ni ne transmet plus les snapshots ;
- ajout de `GET /activity/:id` pour charger un détail à la demande ;
- `ipAddress` supprimée des réponses standards ;
- contrôle backend des permissions existantes : `hr.salary.view`, `hr.budget.view`, `hr.expense.view`, `treasury.view`, `billing.invoice.view`, `billing.payment.view` ;
- le scope de la permission métier est recoupé avec agence, concession ou auteur ;
- les dossiers RH/document précédemment masqués restent masqués ;
- la sanitation récursive des secrets reste appliquée ;
- la même projection protégée alimente détail, PDF individuel et PDF filtré.

La base principale ne contient actuellement que le Super Administrateur avec `activity.view`. Une preuve HTTP multi-profils OWN/AGENCY/CONCESSION n'a donc pas pu être exécutée sans modifier le RBAC ; les prédicats et paramètres falsifiés sont couverts par inspection et tests contractuels. Le filtre `concessionId=999999` retourne 200 avec zéro résultat et n'élargit pas le scope.

## 5. ACT-04 à ACT-06

- filtre concession ajouté à l'API, aux options et à l'URL frontend ; il s'ajoute toujours au prédicat RBAC ;
- événements sans contexte conservés, affichés « Agence et concession non renseignées », sans attribution rétroactive et sans élargissement territorial ;
- recherche frontend anti-rebond de 400 ms ;
- bouton « Réessayer » sur erreurs de liste et de détail ;
- chargement différé des snapshots ;
- compteur et liste conservent le même prédicat ;
- tri stable `created_at + id`, limites PDF et pagination A4 conservés.

## 6. PDF

PDF individuel : HTTP 200, `application/pdf`, 330 942 octets. PDF filtré ventes : HTTP 200, `application/pdf`, 662 492 octets. Les documents utilisent les titres, modules, champs et changements métier autorisés. Les filtres agence/concession impriment le nom disponible et gèrent explicitement le contexte absent.

## 7. Tests et validations

- build backend TypeScript : réussi ;
- build frontend Vite : réussi ;
- tests ciblés : `activity-final-corrections`, `activity-lot12a`, `final-corrections-lot1`, 3 suites réussies, 0 échec ;
- campagne API réelle avant/après : exécutée ;
- recette navigateur Super Administrateur : exécutée ;
- PDF individuel et filtré : exécutés ;
- EXPLAIN avant/après MySQL 8.4 : exécuté ;
- `git diff --check` : réussi ;
- archive officielle : inchangée, SHA-256 `7a05ce52ace2033a5beb0b1f8ff967e346f4e63c8c0fe20bf29b91b0500ea3cc`.

## 8. Fichiers concernés

- `backend-node/src/modules/activity/activity.routes.ts`
- `backend-node/src/modules/activity/activity-presentation.ts`
- `backend-node/src/modules/activity/activity-document.ts`
- `frontend/src/api/activityHooks.ts`
- `frontend/src/modules/activity/ActivityPage.tsx`
- `backend-node/test/activity-final-corrections.test.ts`
- adaptation de deux assertions historiques dans `activity-lot12a.test.ts` et `final-corrections-lot1.test.ts`
- présent rapport.

## 9. Anomalies restantes et verdict

**Corrigé et testé** : ACT-01, projection métier principale ACT-02, protections ACT-03, filtre concession ACT-04, contexte historique ACT-05, pagination/projection/anti-rebond ACT-06, écran et PDF.

**Corrigé mais non testé dynamiquement multi-profils** : scopes métier secondaires, faute de compte local possédant `activity.view`. Aucun rôle n'a été modifié pour fabriquer cette preuve.

**Reste améliorable, non bloquant** : quelques événements rares utilisent le fallback français (« Service Stamp », « Quotation ») faute de libellé métier spécifique dans le registre observé. Ils ne présentent plus de JSON brut et restent sécurisés.

Verdict : **module Activité fiable et livrable sur l'environnement local**, avec réserve explicite sur la recette HTTP multi-profils qui nécessite un jeu RBAC autorisé existant.
