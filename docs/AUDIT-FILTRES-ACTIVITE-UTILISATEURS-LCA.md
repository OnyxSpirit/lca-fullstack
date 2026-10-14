# Audit complet des filtres — Activité utilisateurs LCA

Date de l'audit : 14 octobre 2026  
Branche et révision observées : `main`, `ea70020`  
Nature : audit strict, sans correction applicative ni écriture métier

## 1. Résumé exécutif

La chaîne de filtrage est globalement cohérente : l'écran transmet ses critères, TanStack Query inclut l'objet de filtres dans sa clé, le backend applique un prédicat unique au `COUNT`, à la sélection paginée et au PDF, et le scope `activity.view` est toujours ajouté par conjonction. Aucun contournement RBAC ni fuite de données par un filtre n'a été démontré.

Quatre anomalies majeures sont cependant confirmées par le code : les cinq modes territoriaux stockés ne sont pas filtrables séparément ; les dates sont interprétées comme des journées UTC et non comme des journées `Africa/Brazzaville` ; une période inversée n'est pas refusée ; le champ de recherche local peut réécrire une valeur restaurée par l'historique du navigateur. Deux anomalies mineures concernent les options d'actions statiques et les sélections territoriales dépendantes.

Verdict : **CONFORME AVEC CORRECTIONS MAJEURES REQUISES**. Aucun défaut critique de confidentialité n'a été identifié. L'audit n'a modifié ni le code applicatif, ni MySQL, ni les migrations, ni les événements historiques, ni les PDF.

## 2. Inventaire complet des filtres

| Filtre affiché | Composant / état | Source des options | Valeur initiale | Paramètre HTTP | Traitement backend / SQL | Constat |
|---|---|---|---|---|---|---|
| Recherche « Action, module, ressource, acteur… » | `input`, état local `search`, debounce 400 ms | texte libre | `search` de l'URL ou vide | `search` | `LIKE` sur `action`, `module`, `entity_type`, nom complet acteur | transmis ; limité à 100 caractères |
| Tous les utilisateurs | `select`, `userId` dans l'URL | `/activity/filters`, auteurs visibles du journal | vide | `userId` | `al.user_id=?` | auteurs actifs et inactifs conservés s'ils ont un journal visible |
| Tous les modules | `select`, `module` dans l'URL | modules distincts visibles | vide | `module` | `al.module=?` | conforme |
| Toutes les actions | `select`, `category` dans l'URL | liste statique de 11 catégories | vide | `category` | égalité sur un `CASE` dérivé de `action` | ce n'est pas une action exacte mais une catégorie calculée |
| Tout mon périmètre | `select`, `contextMode` dans l'URL | trois agrégats statiques | vide | `contextMode` | `RESOURCE/EXPLICIT`, `GLOBAL`, ou `UNKNOWN/LEGACY` | perte de distinction entre les cinq modes stockés |
| Toutes les agences autorisées | `select`, `agencyId` dans l'URL | agences présentes dans les journaux visibles | vide | `agencyId` | `al.agency_id=?` | strictement intersecté avec le scope |
| Toutes les concessions autorisées | `select`, `concessionId` dans l'URL | concessions présentes dans les journaux visibles | vide | `concessionId` | `al.concession_id=?` | strictement intersecté avec le scope |
| Date de début | `input type=date`, `from` dans l'URL | saisie | vide | `from` | `al.created_at>=?` à `00:00:00` UTC | journée métier incorrecte |
| Date de fin | `input type=date`, `to` dans l'URL | saisie | vide | `to` | `al.created_at<=?` à `23:59:59` UTC | journée métier incorrecte |
| Type de ressource | aucune commande dans l'interface | — | — | `entityType` accepté par le hook et l'API | `al.entity_type=?` | capacité API non exposée à l'écran |

Le bouton **Réinitialiser** vide le texte, tous les paramètres d'URL et remet la page à 1.

## 3. Architecture frontend / backend

- Écran : `frontend/src/modules/activity/ActivityPage.tsx`.
- Sérialisation et requêtes : `frontend/src/api/activityHooks.ts`.
- Liste, options, détail et deux PDF : `backend-node/src/modules/activity/activity.routes.ts`.
- Présentation métier : `activity-presentation.ts` ; rendu PDF : `activity-document.ts`.
- Source autoritative : `audit_logs`, enrichie par la migration 081 avec `context_mode`.
- Le tri reste stable : `created_at DESC, id DESC` pour la liste ; l'export complet utilise l'ordre chronologique ASC.
- La pagination est effectuée sur les seuls identifiants avant le chargement des snapshots JSON. L'index `idx_audit_created(created_at,id)` est utilisé en lecture arrière dans l'`EXPLAIN`; le correctif contre `ER_OUT_OF_SORTMEMORY` reste donc effectif.
- `COUNT` et sélection utilisent exactement `filter.base` et `filter.params`. Aucun écart COUNT/SELECT n'est démontré.

## 4. Résultats par filtre

| Filtre | Résultat |
|---|---|
| Utilisateur | conforme et borné par le scope ; un identifiant hors scope produit zéro ligne |
| Module | conforme ; options dérivées des modules réellement visibles |
| Action/catégorie | fonctionnel, mais options statiques et sémantique catégorielle insuffisamment explicite |
| Recherche | fonctionnelle ; caractères `%` et `_` conservent leur sens SQL, risque ergonomique non exploitable comme élargissement RBAC |
| Agence | conforme sur les résultats ; n'inclut pas les lignes dont `agency_id` est nul |
| Concession | conforme sur les résultats ; n'inclut pas les lignes dont `concession_id` est nul |
| Contexte | filtrage agrégé fonctionnel, détail des cinq modes indisponible |
| Dates | format et calendrier validés, mais fuseau et inversion incorrects |
| Pagination | remise à la page 1 lors d'un changement via `update`; total et pages cohérents |
| Réinitialisation | conforme |

## 5. Résultats des combinaisons

Toutes les combinaisons utilisateur/date/module/catégorie/agence/concession/contexte/recherche sont assemblées avec `AND`. Les regroupements de la recherche textuelle sont parenthésés. Une combinaison impossible retourne un ensemble vide et ne peut pas élargir le périmètre.

Les couples agence + concession ne sont toutefois pas validés ni synchronisés dans l'interface : après changement d'agence, une concession incompatible peut rester sélectionnée. Le résultat est vide, donc sûr, mais l'expérience n'explique pas la contradiction. La page est bien remise à 1 pour chaque changement commandé par l'écran.

La période inversée est un cas distinct : `from > to` produit deux prédicats contradictoires et donc zéro résultat, au lieu d'un HTTP 400 explicite.

## 6. Analyse territoriale

Le schéma autorise `LEGACY`, `GLOBAL`, `RESOURCE`, `EXPLICIT`, `UNKNOWN`. Le contrat public n'accepte que :

- `CONTEXTUALIZED` → `RESOURCE` ou `EXPLICIT` ;
- `GLOBAL` → `GLOBAL` ;
- `UNKNOWN` → `UNKNOWN` ou `LEGACY`.

La base observée était active pendant l'audit. Un premier relevé comptait 117 lignes (`LEGACY` 105, `RESOURCE` 10, `EXPLICIT` 2), puis un relevé ultérieur 123 lignes (`LEGACY` 105, `RESOURCE` 11, `EXPLICIT` 2, `UNKNOWN` 5). Ces nouvelles écritures provenaient de l'application en cours d'utilisation, pas de l'audit. Les 105 événements historiques `LEGACY` sont restés inchangés.

Les états réels observés sont : 102 `LEGACY` sans territoire, 3 `LEGACY` agence + concession, 11 `RESOURCE` agence + concession, 2 `EXPLICIT` concession seule et 5 `UNKNOWN` sans territoire. Aucun `RESOURCE/EXPLICIT` totalement vide n'a été observé.

Les prédicats agence et concession exigent une valeur réellement enregistrée. Les événements globaux, legacy ou unknown ne sont donc jamais artificiellement rattachés à Brazzaville. En revanche, l'affichage écran/PDF traite tout mode non global sans concession comme « Contexte territorial non enregistré » : un contexte explicite **agence seule**, permis par le type et par `explicitContext`, serait présenté à tort comme non enregistré. Ce scénario n'existe pas dans les données actuelles mais est démontré possible par le code.

## 7. Analyse RBAC

| Scope | Prédicat obligatoire | Effet des filtres supplémentaires |
|---|---|---|
| OWN | `al.user_id = utilisateur connecté` | uniquement restrictif |
| AGENCY | `al.agency_id = agence du compte` | uniquement restrictif |
| CONCESSION | concession de l'événement = concession de l'agence du compte | uniquement restrictif |
| GLOBAL | `1=1` | les filtres demandés deviennent les seules restrictions |

Les options utilisateurs, modules, agences et concessions sont calculées sous le même scope. Un paramètre falsifié est ajouté avec `AND`. Les détails sensibles sont ensuite contrôlés par la permission métier et son propre scope, sans bypass `SUPER_ADMIN`. Les PDF utilisent les mêmes contrôles.

Le modèle courant porte une seule `agency_id` sur l'utilisateur ; aucune multi-affectation territoriale n'est gérée par ce module. La base principale ne fournit pas assez de profils pour une preuve HTTP réelle des quatre scopes ; la matrice est couverte par les tests contractuels et l'inspection du prédicat. Risque potentiel : un détenteur GLOBAL sans agence peut lire la liste mais le PDF appelle `getBusinessIdentity(String(undefined))` et peut répondre 500. Ce cas n'a pas été reproduit sur un compte réel.

## 8. Analyse des dates

MySQL 8.4.11 a déclaré `@@session.time_zone=SYSTEM`, `@@global.time_zone=SYSTEM`, avec `NOW() = UTC_TIMESTAMP()` lors du contrôle : le stockage observé est UTC. Le métier et le PDF utilisent `Africa/Brazzaville` (UTC+1).

Pour `2026-10-14`, l'API génère `[2026-10-14 00:00:00, 2026-10-14 23:59:59]` UTC. Une journée métier correcte à Brazzaville correspond à `[2026-10-13 23:00:00, 2026-10-14 22:59:59]` UTC. Le filtre actuel exclut donc la première heure locale et inclut la première heure locale du lendemain. Le frontend affiche par ailleurs les dates dans le fuseau du navigateur (`toLocaleString`) plutôt que dans le fuseau métier explicite.

Les formats impossibles sont rejetés. L'absence de dates est supportée. Aujourd'hui, hier, sept jours, mois courant et journée précise héritent tous du même décalage de borne. Une période sans activité retourne correctement zéro ligne. Une période inversée n'est pas validée.

## 9. Analyse des options dynamiques

- Utilisateurs : tous les auteurs visibles encore présents dans `users`, y compris inactifs ; conforme. Un auteur supprimé apparaît dans les lignes mais ne peut pas devenir une option, puisque son identifiant joint est nul.
- Modules : valeurs distinctes des journaux visibles ; conforme.
- Agences/concessions : valeurs distinctes des journaux visibles ; conformes au scope, mais non dépendantes entre elles.
- Actions : les 11 catégories sont toujours proposées, même si aucune ligne visible ne les utilise. Les 39 actions exactes observées ne sont pas exposées comme options.
- Modes de contexte : trois agrégats statiques sont proposés au lieu des cinq valeurs stockées.

## 10. Analyse des exports PDF

L'écran retire `page` et `pageSize` puis transmet tous les autres critères au PDF. Le backend réutilise `filtered`, le même `COUNT`, le même scope et la même politique de divulgation. L'export représente donc l'ensemble filtré, pas seulement la page visible. Au-delà de 1 000 lignes, il refuse explicitement l'export avec HTTP 413.

Le contenu est trié ASC, contrairement à l'écran DESC, mais l'ensemble et le total restent identiques. Les anomalies de contexte agrégé, de fuseau et de période inversée sont héritées. Le PDF individuel revalide le scope sur l'identifiant.

## 11. Anomalies confirmées

### ACT-FLT-001 — modes territoriaux non distinguables — MAJEURE

1. Filtre : contexte territorial.
2. Reproduction : demander `contextMode=LEGACY`, `RESOURCE` ou `EXPLICIT`, ou chercher ces choix dans l'écran.
3. Attendu : pouvoir contrôler séparément les cinq classifications introduites par la migration 081.
4. Observé : l'API rejette ces valeurs ; l'écran et `/filters` n'exposent que trois agrégats. `UNKNOWN` mélange `UNKNOWN` et `LEGACY`.
5. Cause : `contextModes` et `filtered()` codent trois valeurs synthétiques.
6. Fichiers : `activity.routes.ts`, `ActivityPage.tsx`, `activityHooks.ts`.
7. Correction : exposer les cinq modes, éventuellement conserver des raccourcis agrégés sous des noms distincts ; tester liste, compteur et PDF.
8. Risque de régression : moyen, car les liens existants utilisent les agrégats actuels.

### ACT-FLT-002 — journée filtrée en UTC au lieu du fuseau métier — MAJEURE

1. Filtre : début/fin.
2. Reproduction : filtrer une journée contenant un événement entre 00:00 et 00:59 heure de Brazzaville, ou entre 23:00 et 23:59 UTC.
3. Attendu : inclure toute la journée `Africa/Brazzaville` et rien du lendemain métier.
4. Observé : bornes `00:00:00` et `23:59:59` UTC.
5. Cause : `isoDate()` ajoute `Z` sans résoudre le fuseau de la concession.
6. Fichiers : `activity.routes.ts`, `ActivityPage.tsx`.
7. Correction : résoudre le fuseau métier puis utiliser un intervalle semi-ouvert `[début local converti UTC, lendemain local converti UTC)` ; afficher dans le même fuseau.
8. Risque de régression : élevé sur les bornes ; couvrir changements de jour et fuseaux configurables.

### ACT-FLT-003 — période inversée acceptée silencieusement — MAJEURE

1. Filtre : début/fin.
2. Reproduction : `from=2026-10-14&to=2026-10-01`.
3. Attendu : HTTP 400 et message explicite.
4. Observé : prédicats contradictoires, HTTP 200 avec zéro résultat.
5. Cause : absence de comparaison après conversion.
6. Fichier : `activity.routes.ts`.
7. Correction : valider `from <= to` avant construction SQL ; aligner écran et PDF.
8. Risque de régression : faible.

### ACT-FLT-004 — recherche désynchronisée avec l'historique URL — MAJEURE

1. Filtre : recherche textuelle.
2. Reproduction : saisir une recherche, attendre le debounce, changer d'URL puis revenir avec Précédent/Suivant.
3. Attendu : le champ reflète la valeur restaurée dans l'URL.
4. Observé : `search` n'est initialisé qu'au montage ; l'effet voit l'écart et peut réécrire l'ancienne valeur locale dans l'URL après 400 ms.
5. Cause : synchronisation unidirectionnelle état local → URL.
6. Fichier : `ActivityPage.tsx`.
7. Correction : synchroniser explicitement les changements externes d'URL ou utiliser un état de brouillon distingué de la valeur appliquée.
8. Risque de régression : moyen (debounce, navigation, liens préfiltrés).

### ACT-FLT-005 — catégories d'action statiques hors données visibles — MINEURE

Les onze catégories sont toujours proposées, y compris celles absentes du périmètre. Le résultat vide est correct mais l'option n'est pas réellement dynamique. Construire les catégories distinctes avec le même `categorySql` et le même scope, ou libeller clairement ce référentiel fixe. Risque faible.

### ACT-FLT-006 — filtres agence/concession non synchronisés — MINEURE

Changer l'agence ne réinitialise ni ne restreint la concession (et inversement). Une combinaison incohérente donne zéro résultat, sans fuite. Fournir des options dépendantes ou effacer la sélection incompatible. Risque moyen sur l'ergonomie, faible sur les données.

## 12. Risques potentiels et comportements non vérifiables

- **Démontré par le code, sans donnée actuelle** : un contexte explicite agence seule est affiché comme « non enregistré ».
- **Potentiel** : le PDF d'un utilisateur GLOBAL sans agence peut échouer lors de la résolution d'identité.
- **Potentiel** : les identifiants BIGINT passent par `Number` dans `integer()` ; au-delà de `Number.MAX_SAFE_INTEGER`, une perte de précision est possible.
- **Non vérifiable sur la base principale** : matrice HTTP réelle OWN/AGENCY/CONCESSION, faute de profils autorisés suffisants et conformément à l'interdiction de modifier les rôles.
- **Non reproduit** : aucune divergence COUNT/liste, aucune duplication, aucun `ER_OUT_OF_SORTMEMORY`, aucun élargissement par valeurs nulles.

## 13. Matrice de tests

| Contrôle | Méthode | Résultat |
|---|---|---|
| État Docker | `docker compose ps`, lecture seule | backend, frontend et MySQL healthy ; frontend publié sur 3001 |
| Schéma et fuseau | `SELECT`, `SHOW CREATE TABLE`, lecture seule | MySQL 8.4.11, UTC système, migration 081 présente |
| Inventaire réel | agrégats `SELECT` | 105 LEGACY intacts ; données actives observées sans mutation par l'audit |
| Index/tri | `EXPLAIN` | `idx_audit_created`, backward index scan, sans filesort observé |
| Backend ciblé activité | 5 fichiers | 4 réussis ; `audit-final-corrections.test.ts` échoue au niveau fichier, suite transversale hors filtres |
| Frontend ciblé activité | 6 tests | 5 réussis ; assertion historique exigeant le littéral `detailsRestricted`, alors que le détail masqué est présenté par le backend |
| TypeScript frontend | `npm run lint` | réussi |
| PDF | inspection contractuelle | mêmes paramètres et prédicats, export complet limité à 1 000 |
| Archive officielle | SHA-256 | `7a05ce52ace2033a5beb0b1f8ff967e346f4e63c8c0fe20bf29b91b0500ea3cc`, conforme |
| Git | `status --short` avant rapport | propre ; aucun commit/push/reset/stash/clean/changement de branche |

Les deux échecs cités ne prouvent pas une anomalie de filtre : le premier couvre plusieurs modules transverses et ne fournit pas de sous-test exploitable dans cette exécution ; le second est une assertion statique devenue obsolète. Ils restent signalés et n'ont pas été modifiés.

## 14. Corrections recommandées

1. Corriger ensemble les bornes temporelles, la période inversée et l'affichage dans le fuseau métier.
2. Définir le contrat fonctionnel des cinq modes et séparer valeurs réelles et raccourcis agrégés.
3. Ajouter des tests d'intégration MySQL sur liste, COUNT et PDF pour toutes les combinaisons territoriales et les quatre scopes.
4. Corriger la synchronisation URL/debounce et couvrir Précédent/Suivant.
5. Rendre les catégories réellement dépendantes du journal visible.
6. Cascader agence/concession sans jamais élargir le prédicat serveur.
7. Ajouter un chemin d'identité documentaire sûr pour GLOBAL sans agence.

## 15. Ordre de priorité

| Priorité | Sujet | Motif |
|---|---|---|
| P1 | ACT-FLT-002 | résultats faux aux bornes de chaque journée métier |
| P1 | ACT-FLT-001 | classification 081 impossible à auditer séparément |
| P1 | ACT-FLT-003 | période invalide masquée comme absence de données |
| P2 | ACT-FLT-004 | filtre restauré pouvant être écrasé silencieusement |
| P3 | ACT-FLT-005 / 006 | ergonomie et précision des options |
| P3 | risques GLOBAL sans agence / BIGINT | durcissement préventif |

## 16. Verdict final

**CONFORME AVEC CORRECTIONS MAJEURES REQUISES.**

La sécurité d'intersection RBAC, la pagination SQL, la cohérence COUNT/SELECT/PDF et l'intégrité des 105 événements historiques sont préservées. Aucun défaut CRITIQUE n'est confirmé. Les anomalies majeures rendent toutefois les filtres temporels et territoriaux insuffisamment fidèles pour une qualification finale sans correction et nouvelle recette ciblée.

Seul le présent rapport a été créé. Aucune correction applicative, migration, écriture SQL, reconstruction ou relance Docker, modification de rôle, modification de PDF, commit ou push n'a été effectué.
