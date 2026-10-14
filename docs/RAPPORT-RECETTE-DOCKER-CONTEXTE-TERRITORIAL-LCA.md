# Rapport de recette Docker — contexte territorial LCA

Date : 14 octobre 2026  
Environnement : Docker local `lca`, frontend `http://127.0.0.1:3001`.

## 1. Périmètre et précautions

La recette a porté uniquement sur l'environnement Docker local. Aucun déploiement distant, aucune suppression de volume, aucune réinitialisation MySQL et aucune modification de donnée métier n'ont été effectués.

Le rapport source `RAPPORT-CORRECTION-CONTEXTE-TERRITORIAL-LCA.md` a été relu avant l'intervention. Les fichiers Compose existants ont été conservés sans modification.

## 2. Contrôles préalables

Avant reconstruction :

- `backend`, `frontend` et `mysql` étaient `healthy` ;
- le frontend publiait déjà `0.0.0.0:3001->80/tcp` ;
- MySQL utilisait le volume persistant `lca_mysql_data` ;
- les volumes applicatifs `lca_ged_data` et `lca_uploads_data` étaient montés sur le backend ;
- la migration maximale était `81 — 081_activity_territorial_context.sql` ;
- `audit_logs` contenait 105 lignes, toutes classées `LEGACY` ;
- 102 lignes avaient une agence nulle et 102 une concession nulle ;
- l'archive officielle avait l'empreinte attendue.

## 3. Services reconstruits

Commandes exécutées :

```text
docker compose build backend frontend
docker compose up -d --no-deps backend frontend
```

Seuls `backend` et `frontend` ont été reconstruits et recréés. Le service `mysql` n'a été ni reconstruit, ni recréé, ni redémarré par cette opération. Son conteneur conservait une date de création antérieure de deux semaines et le même volume `lca_mysql_data`.

Les builds ont réussi : compilation TypeScript backend et bundle Vite frontend, 2 490 modules transformés.

## 4. État final des conteneurs

| Service | État | Exposition |
|---|---|---|
| backend | healthy | réseau privé, port interne 3001 |
| frontend | healthy | port local 3001 vers Nginx 80 |
| mysql | healthy | réseau privé, volume `lca_mysql_data` |

Le bootstrap backend a annoncé : `Database VERSIONED; niveau >= 81`. Aucun problème de migration n'est apparu après reconstruction.

## 5. Résultats API

La recette authentifiée via le frontend local a produit HTTP 200 pour :

- `/api/health` ;
- `/api/auth/login` ;
- `/api/activity/filters` ;
- `/api/activity?page=1&pageSize=25` ;
- les filtres `UNKNOWN`, `GLOBAL` et `CONTEXTUALIZED` ;
- un détail d'activité ;
- le PDF filtré ;
- le PDF individuel.

Le compte de recette disposait du scope `GLOBAL`. L'API a retourné 105 événements au total, 105 dans le filtre sans contexte, zéro activité globale et zéro activité contextualisée au sens de la nouvelle classification. Ce résultat est attendu : les événements historiques demeurent `LEGACY` même lorsque leurs anciennes colonnes agence/concession sont renseignées.

Aucun HTTP 500, `MIGRATION_SCHEMA_DIVERGED`, échec de migration ou message d'erreur backend/frontend n'a été détecté dans les journaux de la fenêtre de recette.

## 6. Recette navigateur

Recette effectuée dans l'application réellement servie sur le port 3001 :

- navigation vers **Activité utilisateurs** réussie ;
- 105 événements et scope `GLOBAL` affichés ;
- libellé **Contexte territorial non enregistré** visible pour les événements historiques ;
- rendu **Agence : Agence Brazzaville · Concession : LCA Concession** visible sur les lignes historiquement rattachées ;
- filtre **Tout mon périmètre** et réinitialisation fonctionnels ;
- filtre **Sans contexte territorial** fonctionnel ;
- filtre **Administration globale** fonctionnel et résultat vide cohérent avec la base ;
- filtre agence fonctionnel, avec trois événements pour l'agence de Brazzaville ;
- filtre concession fonctionnel, avec les trois événements correspondants ;
- détail d'une activité ouvert sans erreur et contexte affiché ;
- aucune erreur ni alerte console navigateur.

La base principale ne contenait aucun événement `GLOBAL`, `RESOURCE`, `EXPLICIT` ou `UNKNOWN` nouveau. Les libellés **Administration globale** et concession seule ne pouvaient donc pas être observés sur une ligne réelle sans créer artificiellement une activité. Ils ont été vérifiés dans les tests isolés, conformément à l'interdiction de créer des données métier fictives.

## 7. Tests PDF

- PDF filtré : HTTP 200, document PDF 1.3 de 33 pages ;
- PDF individuel : HTTP 200, document PDF 1.3 d'une page ;
- déclenchement de l'impression filtrée depuis l'interface : réussi ;
- déclenchement de l'impression individuelle depuis le détail : réussi ;
- aucune erreur navigateur pendant ces opérations.

## 8. Écritures et classifications isolées

La campagne ciblée a été exécutée hors données métier principales :

```text
activity-final-corrections
activity-lot12a
activity-targeted-adjustments
activity-territorial-context
final-corrections-lot1
```

Résultat : **5 tests réussis, 0 échec**.

Elle couvre notamment :

- activité territoriale par ressource (`RESOURCE`) ;
- activité explicitement territoriale (`EXPLICIT`) ;
- activité globale (`GLOBAL`) ;
- activité de concession seule ;
- ressource introuvable ou non territoriale (`UNKNOWN`) ;
- rejet d'un couple agence/concession contradictoire ;
- affichages global, agence/concession, concession seule et contexte inconnu ;
- scopes `GLOBAL`, `OWN`, `AGENCY` et `CONCESSION` ;
- sanitation et restriction des détails.

Aucune activité de test n'a été insérée dans la base ERP principale.

## 9. Vérification RBAC

Le parcours réel a validé le scope `GLOBAL`, la consultation, les détails, les filtres et les impressions. Les scopes `OWN`, `AGENCY` et `CONCESSION` ont été validés par les suites isolées existantes, sans modifier les rôles ou comptes de la base principale.

Les paramètres agence et concession restent intersectés avec le scope résolu. Un identifiant territorial nul n'élargit jamais le périmètre.

## 10. Intégrité historique et archive

Après reconstruction, appels API, navigation et impressions :

- nombre d'événements historiques : 105 ;
- classification `LEGACY` : 105 ;
- agence nulle : 102 ;
- concession nulle : 102 ;
- identifiant maximal : 105 ;
- empreinte historique : `b360bc37385c86ecb0c55187f34cb2e02cdfb1cf60d8bcb965aabeb5890ff209`.

L'empreinte correspond exactement à la référence demandée. Aucun événement historique n'a été créé, supprimé ou modifié.

Archive officielle :

`7a05ce52ace2033a5beb0b1f8ff967e346f4e63c8c0fe20bf29b91b0500ea3cc  livrables/LCA-ERP-LIVRAISON-FINALE.zip`

Elle est intacte.

## 11. Anomalies et réserves

- Une première invocation de la commande NPM a lancé par erreur la campagne complète au lieu des cinq fichiers ciblés. Elle a été interrompue sans modification de données ; plusieurs tests historiques hors périmètre avaient signalé des échecs. La commande directe ciblée a ensuite terminé avec 5/5 succès. Ces échecs globaux préexistants ne sont pas attribués au contexte territorial dans cette recette.
- Les journaux MySQL historiques contiennent d'anciens messages `Out of sort memory`, antérieurs à cette reconstruction. Aucun nouveau message de ce type n'a été observé pendant la fenêtre de recette.
- La présence visuelle d'une ligne globale ou concession seule n'a pas été provoquée dans la base principale afin de respecter l'interdiction de données fictives ; ces cas sont couverts par tests isolés.

## 12. Verdict final

**RECETTE DOCKER LOCALE DU CONTEXTE TERRITORIAL : CONFORME AVEC RÉSERVES DOCUMENTÉES.**

Le code corrigé est en service local, les trois conteneurs sont sains, le frontend est accessible sur le port 3001, les APIs et PDF fonctionnent, aucune erreur HTTP 500 ou migration n'a été constatée, le RBAC ciblé ne régresse pas et l'intégrité des 105 événements historiques ainsi que celle de l'archive officielle sont préservées.

Aucun commit, push, tag, reset, restore, stash, clean ou changement de branche n'a été effectué.
