# Qualification technique finale après corrections — ERP LCA

Date d'exécution : 12 octobre 2026  
Périmètre : état courant du dépôt, sans navigateur, sans modification de code métier, migration, configuration, secret ou donnée existante.

## 1. Résumé exécutif

Les sept corrections P1 ont été revérifiées. Six disposent d'une preuve automatisée ciblée et d'une preuve dynamique complémentaire pour les risques les plus importants (RBAC, sessions, Socket.IO et concurrence CRM). La correction HTTPS est cohérente statiquement, mais n'a pas été instanciée avec une terminaison TLS temporaire ou réelle.

Une base indépendante **MySQL 8.4.11** a été créée sous le projet Docker unique `lca-finalqa-20261012-a91f`, sur `127.0.0.1:13384`, avec stockage `tmpfs`, identifiants synthétiques et aucun volume. Le schéma a été migré de 71 à 79. Après les tests, le conteneur et le réseau appartenant à ce projet ont été supprimés. Aucun des projets interdits (`lca`, `lca-recette`, `lca-qualification`, `lca-requalification`, `lca-restauration`) n'a été modifié.

Les builds et typechecks sont réussis. La campagne complète, exécutée fichier par fichier pour éviter le défaut IPC de `tsx`, donne 203/227 fichiers backend et 139/153 fichiers frontend réussis. Les échecs sont principalement des attentes historiques textuelles ou des fixtures incompatibles avec les contrats de sécurité actuels. Leur volume, et l'absence de rejouage dynamique complet de GED/PDF/reporting, empêchent néanmoins de déclarer une qualification complète.

**Verdict final : C. QUALIFICATION INCOMPLÈTE.** Aucun P0/P1 applicatif nouveau n'est confirmé, mais les preuves essentielles ne sont pas toutes complètes.

## 2. Contexte

Cette qualification intervient après `docs/CORRECTION-FINALE-ERP-LCA.md`, qui annonce 21 corrections sur 24 constats, dont 7/7 P1. La mission présente vérifie l'efficacité des corrections et les risques résiduels sans ouvrir une nouvelle campagne de développement.

## 3. Références documentaires

- `docs/CORRECTION-FINALE-ERP-LCA.md` ;
- les treize rapports de `docs/audit-final-erp-lca/` ;
- les bilans `STABILISATION-ERP-21`, `STABILISATION-ERP-22` ;
- les bilans et contrôles `LIVRAISON-LCA-01`, `02` et `03` ;
- `docs/FRESH_RBAC_VALIDATION.md` et `docs/FRESH_RBAC_TEST_DEBT.md`.

Les conclusions historiques ont servi à sélectionner les contrôles, pas à déclarer les résultats présents.

## 4. État initial

- `git status --short` : vide au démarrage de la qualification.
- Aucun fichier source, test, migration, Compose ou `.env` n'a été modifié.
- Docker contenait les cinq projets protégés actifs ; ils ont uniquement été inventoriés en lecture.
- Le port 3001 était occupé par `lca-frontend-1`. Le backend temporaire a donc utilisé 13082.

## 5. Environnement de qualification

| Élément | Valeur |
|---|---|
| OS/exécution | environnement local Codex, sans navigateur |
| Node.js | 24.11.1 |
| npm | 11.7.0 |
| Docker | 29.8.0 |
| Docker Compose | 5.5.1 |
| MySQL | 8.4.11 |
| Projet temporaire | `lca-finalqa-20261012-a91f` |
| Port MySQL | `127.0.0.1:13384` |
| Backend temporaire | `127.0.0.1:13082` |
| Stockage MySQL | `tmpfs`, aucun volume Docker |
| Schéma | baseline 71 puis migrations 72 à 79 réussies |

## 6. Précautions prises

- Inventaire préalable des projets, conteneurs, réseaux, volumes et ports.
- Nom de projet inédit et port non conflictuel.
- Secrets, comptes et données exclusivement synthétiques.
- Démarrage du seul service MySQL de la définition jetable ; aucun build de conteneur.
- Backend exécuté localement, distinct des services existants.
- Nettoyage limité au projet dont la création par cette mission est certaine.
- Aucun navigateur, test de charge, commit, push, tag, changement de branche ou commande Git destructive.

## 7. Inventaire synthétique des tests

| ID | Domaine | Scénario / méthode | Attendu | Obtenu | Statut | Preuve / limite |
|---|---|---|---|---|---|---|
| QF-01 | Backend | `npm run lint` | TypeScript valide | sortie 0 | RÉUSSI | `tsc --noEmit` |
| QF-02 | Backend | `npm run build` | compilation valide | sortie 0 | RÉUSSI | `tsc -p tsconfig.json` |
| QF-03 | Frontend | `npm run lint` | TypeScript valide | sortie 0 | RÉUSSI | `tsc --noEmit` |
| QF-04 | Frontend | `npm run build` | bundle valide | 2 488 modules transformés | RÉUSSI | Vite 6.4.3 |
| QF-05 | P1 | `audit-final-corrections.test.ts` | 10 contrôles verts | 10/10 | RÉUSSI | test ciblé isolé |
| QF-06 | RBAC | recette HTTP MySQL réelle | OWN/AGENCY, retrait, désactivation, protections système | conforme | RÉUSSI | 252 permissions ; script adapté en mémoire, fichier inchangé |
| QF-07 | RBAC | utilisateur à deux rôles actifs | refus fail-closed | HTTP 403 `MULTIPLE_ACTIVE_ROLES` | RÉUSSI | insertion synthétique puis login |
| QF-08 | Sessions | login/me/rotation/logout | ancienne session et ancien refresh refusés | conforme | RÉUSSI | scénario HTTP jetable |
| QF-09 | Socket.IO | retirer les permissions d'un utilisateur connecté | événement puis déconnexion ciblée | utilisateur déconnecté, témoin admin connecté | RÉUSSI | client Socket.IO sans navigateur |
| QF-10 | CRM | deux transitions `new -> contacted` concurrentes | un gagnant, un conflit, une activité | HTTP `[200,409]`, état `contacted`, 1 activité | RÉUSSI | MySQL 8.4/API réelle |
| QF-11 | Reporting | suite MySQL historique | cinq scénarios verts | 0/5, tous dérivés d'un JWT sans `sid` | NON CONCLUANT | fixture incompatible avec le contrôle de session courant |
| QF-12 | Backend complet | un processus par fichier, 30 s max | tous les fichiers verts | 203/227 réussis, 24 en échec | ÉCHOUÉ | aucun timeout ; voir section 22 |
| QF-13 | Frontend complet | un processus par fichier, 30 s max | tous les fichiers verts | 139/153 réussis, 14 en échec | ÉCHOUÉ | aucun timeout ; voir section 22 |
| QF-14 | HTTPS | revue des deux configurations Nginx | redirection, TLS, proxy API/WSS, headers | cohérent statiquement | RÉUSSI | niveau statique uniquement |
| QF-15 | GED/PDF dynamique | upload/download après révocation | refus après invalidation | pas de campagne HTTP complète | NON EXÉCUTÉ | contrôles ciblés/statique seulement |
| QF-16 | Performance | charge/saturation | comportement mesuré | non lancée par prudence | NON EXÉCUTÉ | mission interdit la charge sur services existants |

## 8. Résultats RBAC

`AUD-LCA-001`, `002` et `004` sont confirmées par les tests ciblés. Sur MySQL réel :

- un rôle dynamique a été créé et ses permissions ont été appliquées sans dépendre de son nom ;
- OWN n'a exposé que la ressource affectée à l'utilisateur ;
- AGENCY a exposé les ressources de l'agence et masqué l'agence étrangère ;
- l'absence de permission a produit 403, y compris après retrait à chaud ;
- les rôles système et le dernier Super Administrateur sont protégés ;
- deux rôles actifs produisent explicitement 403 `MULTIPLE_ACTIVE_ROLES`.

CONCESSION et GLOBAL sont couverts par les contrôles unitaires de portée et par l'inspection des prédicats. Le test reporting destiné à les confirmer bout en bout est non concluant à cause d'une fixture JWT sans session. Ils ne sont donc pas marqués dynamiquement réussis dans ce rapport.

## 9. Résultats multi-agences

OWN et AGENCY sont réussis sur la base jetable. Les accès directs hors scope ont renvoyé 404/403 sans divulgation de contenu. Le principe « permission puis périmètre » est respecté : un scope GLOBAL ne crée pas une permission absente. La preuve dynamique complète AGENCY/CONCESSION/GLOBAL sur un même jeu reporting reste incomplète.

## 10. Résultats Socket.IO

Un utilisateur autorisé et un administrateur témoin ont été connectés au namespace `/realtime`. Après retrait des permissions du rôle :

- l'utilisateur a reçu `rbac:updated` ;
- le serveur l'a déconnecté avec `io server disconnect` ;
- l'administrateur témoin est resté connecté.

L'authentification initiale avec session persistée est réussie. Les changements d'agence, désactivation et mot de passe sont couverts statiquement/ciblés mais n'ont pas chacun été rejoués dynamiquement.

## 11. Résultats CRM

`AUD-LCA-005` est confirmé sur API et MySQL réels. Deux requêtes simultanées ont tenté la même transition : une seule a réussi, l'autre a reçu 409, l'état final est `contacted` et une seule activité « Étape CRM mise à jour » a été créée. Aucun écrasement silencieux ni activité contradictoire n'a été observé.

Le script RBAC historique envoyait un particulier sans `firstName`; il reçoit désormais correctement 400. Le scénario a été rejoué avec un payload conforme uniquement en mémoire. Cela constitue une dette de test, pas une modification du contrat.

## 12. Résultats GED

Les tests ciblés valident permissions séparées, intersection avec le scope métier, refus OWN non fiable, validation de signature, taille maximale, traversal, nettoyage sur échec d'INSERT, stockage privé, pagination et transactions d'archive/version. La campagne HTTP complète avec fichiers synthétiques, révocation de session en cours de transfert et erreur SQL n'a pas été exécutée : statut global GED dynamique **NON EXÉCUTÉ**.

## 13. Résultats PDF

Le frontend utilise `apiDownload`, qui partage le mécanisme de refresh et rejette les réponses appartenant à une session devenue ancienne. Cette propriété est couverte par les tests ciblés. Aucun téléchargement PDF réel pendant une révocation de session n'a été rejoué dans l'environnement jetable : **NON EXÉCUTÉ** au niveau bout en bout.

## 14. Résultats des transactions

- Transition CRM compare-and-swap : RÉUSSI sur MySQL réel.
- Migrations 72 à 79 : RÉUSSI.
- GED archive/version + audit : RÉUSSI en test ciblé, non rejoué en MySQL réel.
- Erreur SQL/rollback générique et réception pièces : non rejoués dans cette campagne.

## 15. Résultats du reporting

Le code de portée budgétaire corrigé et les agrégations sont couverts par les tests ciblés. La suite `reporting-mysql.integration.test.ts` a créé ses données, mais ses JWT ne contiennent pas de `sid` et aucune ligne `refresh_tokens`; le middleware actuel les refuse à 401. Les cinq scénarios sont donc **NON CONCLUANTS**, et non des échecs fonctionnels du reporting.

## 16. Résultats de l'authentification

Login, `/auth/me`, rotation du refresh, rejet de l'ancien refresh, logout et révocation de l'access token sont réussis sur MySQL réel. La création de session et `last_login` atomiques est confirmée par le test ciblé.

## 17. Résultats frontend

Typecheck et build réussis. Les six contrôles de correction finale frontend sont réussis. Sur 153 fichiers de tests lancés isolément, 139 réussissent et 14 échouent. Les échecs sont majoritairement des regex couplées à la forme du code plutôt qu'au comportement rendu.

## 18. Résultats backend

Typecheck et build réussis. Les dix contrôles de correction finale backend sont réussis. Sur 227 fichiers de tests lancés isolément avec sockets locales autorisées, 203 réussissent et 24 échouent. Aucun timeout. Des fixtures et mocks ne fournissent plus certains exports (`transaction`, `assertAnyPermission`, `assertDelegablePermissions`) ou certaines sessions persistées exigées par le runtime actuel.

## 19. Résultats MySQL

- Version réelle : 8.4.11.
- Baseline : 71 ; migrations 72–79 appliquées avec succès.
- Tables, seed système et 252 permissions disponibles.
- Données exclusivement synthétiques.
- Aucun accès aux bases existantes.
- Aucun volume persistant créé.

## 20. Résultats des tests de concurrence

La concurrence CRM obligatoire est réussie : `[200,409]`, un état final, une activité. Les autres concurrences historiques ne sont pas revendiquées comme rejouées dans cette campagne.

## 21. Résultats des tests de performance contrôlée

Aucun test de charge n'a été lancé. Les protections observées sont `connectionLimit` configurable (10 par défaut), `queueLimit` 40 et `connectTimeout` 10 000 ms. L'upload GED accepte au maximum 15 Mio plus 128 Kio d'enveloppe, mais agrège tous les chunks et fait ensuite `Buffer.concat`, créant au moins deux représentations mémoire transitoires du corps.

## 22. Résultats de la suite complète

Le script `npm test` échoue dans le bac à sable sur la création du pipe IPC `tsx` (`listen EPERM /tmp/tsx-1000/...pipe`). L'exécution fiable retenue lance chaque fichier dans son propre processus avec `--experimental-test-isolation=none`, évitant la contamination entre fichiers.

- Backend : **227 fichiers**, 203 réussis, 24 échoués, 0 timeout.
- Frontend : **153 fichiers**, 139 réussis, 14 échoués, 0 timeout.

Cette campagne est objectivement rouge. Elle ne révèle pas à elle seule 38 régressions runtime : beaucoup d'échecs sont des assertions de source obsolètes, mais leur triage exhaustif exige une mission de maintenance des tests.

Échecs frontend recensés : `billing-stabilization`, `commercial-role-alignment`, `concession-workflow-conformity`, `navigation`, `numeric-input-ux.behavior`, `preproduction-corrections`, `quotations-dynamic-rbac`, `receptionist-rbac`, `recette-critique-01`, `recette-critique-02`, `sav-finance-03`, `sav-or-ux04.behavior`, `sav-or19.behavior`, `treasury-flow-integration`.

Échecs backend recensés : `auth-session-revocation`, `commercial-residuals`, `commercial-tax`, `commercial-transversal-routes`, `concession-workflow-conformity`, `crm-appointment-endpoint`, `crm-assignment-endpoint`, `delivery-candidates`, `delivery-document-security`, `delivery-financial-authorization`, `delivery-services`, `fin01-billing-export`, `ged-business-archive`, `ged-ux-03`, `lot14c1-vehicle-foundation`, `sale-direct-tax-01`, `sav-finance-03`, `sav-workshop-suppliers-compliance`, `settings-concession-dynamic`, `showroom-scope-matrix`, `stock-parc-fix`, `super-admin-system`, `treasury-flow-integration`, `vehicle-return-lot9`.

## 23. Analyse de l'échec NIU

`frontend/test/navigation.test.ts` attend littéralement `Identifiant fiscal / NIU`. Le code actuel utilise une autre formulation tandis que `document-identity` confirme la présence du NIU canonique et l'absence de NIF. L'échec est reproductible isolément et antérieur à la correction globale. Gravité retenue : P3 dette de cohérence libellé/test, non bloquante pour les P1.

## 24. Analyse AUD-LCA-013 — timeout SQL métier

Protections présentes : pool borné, file limitée à 40, délai de connexion 10 s, transactions avec rollback et retry de deadlock pour les chemins prévus. Protection absente : budget de temps par requête métier et annulation serveur des requêtes longues/bloquées.

Risque retenu : **MODÉRÉ**. La saturation n'est plus non bornée, mais une poignée de requêtes longues peut occuper le pool ; `connectTimeout` ne limite pas la durée d'une requête déjà envoyée.

## 25. Analyse AUD-LCA-014 — streaming GED

La taille logique est limitée à 15 Mio, mais l'implémentation conserve les chunks puis alloue `Buffer.concat`. Un upload peut donc consommer sensiblement plus que 15 Mio, auquel s'ajoutent les copies de parsing. Plusieurs uploads simultanés multiplient cette pression. Le dépassement est rejeté à 15 Mio + 128 Kio, sans fichier temporaire puisque le corps reste en mémoire.

Risque retenu : **MODÉRÉ**, potentiellement élevé si la concurrence d'upload n'est pas limitée par le proxy/l'exploitation. Aucun test de saturation n'a été mené.

## 26. Analyse AUD-LCA-024 — images Docker

Les Dockerfiles utilisent `node:22-bookworm-slim` et `nginx:1.27-alpine`; Compose utilise `mysql:8.4`. Aucun `FROM`/`image` n'est épinglé par digest dans les fichiers livrés. Les images locales inspectables donnent :

- MySQL : `mysql@sha256:b3b90af2a6552ae30c266fdb7d5dd55f3afb72404bb78d37fe8a23eb857fd3fb` ;
- Node : `node@sha256:48e4b67d85f87bd551df43704e24d252f56cc5f8e9718841aace50f19948f0f9` ;
- `nginx:1.27-alpine` n'était pas présent localement sous ce tag.

Risque retenu : **MODÉRÉ pour la reproductibilité**, P3 sécurité/chaîne de livraison. Les digests doivent être validés, documentés avec SBOM et épinglés par la mission de paquetage, sans recopier aveuglément les valeurs locales.

## 27. État HTTPS

**CONFIGURATION VALIDÉE STATIQUEMENT** : redirection 80→443, TLS 1.2/1.3, HSTS, certificats génériques, `X-Forwarded-*`, Upgrade WebSocket, proxy API/uploads et headers SPA présents. Aucun secret n'est inclus.

**CONFIGURATION VALIDÉE EN ENVIRONNEMENT ISOLÉ : NON.**  
**CONFIGURATION VALIDÉE EN EXPLOITATION : NON.**

Les cookies de refresh ne pourront être qualifiés `Secure` que dans un déploiement avec `NODE_ENV=production` et terminaison HTTPS effectivement testée.

## 28. Régressions constatées

Aucune régression P0/P1 causale n'a été confirmée sur les sept corrections. Les campagnes complètes contiennent toutefois 38 fichiers rouges qui interdisent une affirmation globale « aucune régression ». Les échecs doivent être triés entre dette de test et défaut fonctionnel avant livraison.

## 29. Tests non exécutés

- Upload GED 15 Mio et concurrence d'uploads.
- PDF réel avec révocation de session pendant le téléchargement.
- Rollback GED réel sur erreur SQL forcée.
- Matrice dynamique complète CONCESSION/GLOBAL pour tous les modules.
- Changement d'agence, désactivation et reset mot de passe chacun avec socket connecté.
- Charge/saturation du pool et mémoire.
- `nginx -t`, HTTPS et WSS en conteneur isolé.
- Parcours fonctionnels navigateur, interdits par la mission.

## 30. Anomalies restantes

1. AUD-LCA-013 : absence de timeout par requête métier.
2. AUD-LCA-014 : upload GED intégralement bufferisé.
3. AUD-LCA-024 : images non épinglées par digest.
4. Suites complètes rouges : 24 fichiers backend et 14 frontend.
5. Fixtures MySQL reporting sans `sid`/session persistée.
6. Script fresh RBAC avec payload CRM devenu incomplet.
7. Activation TLS non testée dynamiquement.

## 31. Risques résiduels

- Disponibilité sous requêtes SQL lentes : modéré.
- Pression mémoire GED concurrente : modérée, dépendante des limites d'exploitation.
- Reproductibilité des images : modérée.
- Dérive des tests et faux négatifs : élevée pour la confiance de livraison.
- HTTPS/WSS réel : non qualifié.

## 32. Actions humaines nécessaires

1. Trier les 38 fichiers rouges sans abaisser les attentes métier.
2. Mettre à jour les fixtures de sécurité avec `sid` et `refresh_tokens`, puis rejouer reporting/scopes.
3. Rejouer GED/PDF bout en bout sur une base jetable.
4. Valider Nginx, HTTPS, cookies Secure et WSS avec certificats de qualification.
5. Décider et documenter le budget de timeout SQL.
6. Planifier le streaming GED et une limite de concurrence.
7. Épingler les images approuvées et produire un SBOM.
8. Obtenir séparément validation fonctionnelle client, autorisation de distribution et mise en production.

## 33. Verdict technique

**C. QUALIFICATION INCOMPLÈTE.** Les corrections P1 ne présentent pas de défaut bloquant confirmé, les builds sont sains et les contrôles critiques RBAC/CRM/Socket/sessions sont favorables. Cependant la suite complète est rouge et des scénarios essentiels restent non exécutés ou non concluants.

## 34. Verdict sécurité

**Favorable sous réserves, non final.** RBAC fail-closed, invalidation Socket.IO, isolation de session et téléchargements centralisés sont probants. TLS réel, GED bout en bout, timeout SQL et images reproductibles restent à qualifier.

## 35. Verdict fonctionnel

**Non concluant pour l'ensemble de l'ERP.** Aucun navigateur n'a été utilisé et les campagnes historiques rouges ne permettent pas de conclure sur tous les modules. La concurrence CRM et les parcours d'authentification testés sont fonctionnels.

## 36. Verdict de préparation à la livraison

Le dépôt est **prêt pour une dernière campagne de requalification ciblée**, pas pour une déclaration de livraison technique définitive. Ce rapport ne constitue ni validation fonctionnelle client, ni autorisation de distribution, ni autorisation de mise en production.

## Traçabilité finale

- Backend temporaire arrêté proprement.
- Projet Docker `lca-finalqa-20261012-a91f` supprimé avec son réseau.
- Aucun conteneur, réseau ou volume temporaire résiduel portant ce nom.
- Aucun environnement historique touché.
- Seul le présent document est ajouté au dépôt.
- Aucun commit, push, tag, reset, restore, stash, clean ou changement de branche.
