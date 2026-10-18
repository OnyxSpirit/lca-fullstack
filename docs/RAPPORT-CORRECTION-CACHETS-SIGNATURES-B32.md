# Rapport de correction — Cachets et signatures documentaires B.3.2

Date de qualification : 18 octobre 2026  
Périmètre : environnement local et tests isolés uniquement  
Production, VPS et base métier : non consultés et non modifiés

## Verdict

La cause applicative est identifiée et la correction ciblée est implémentée. Les compilations, le lint, les contrats ciblés et le rendu PDF réel sont conformes.

Le verdict de livraison reste **VALIDÉ AVEC RÉSERVE D'EXÉCUTION MYSQL/NAVIGATEUR** : la session courante interdit l'accès au socket Docker et l'ouverture de ports locaux (`EPERM`). La migration 092 et les parcours HTTP réels n'ont donc pas été exécutés sur MySQL 8.4 pendant cette campagne. Aucune validation MySQL ou navigateur n'est revendiquée sans preuve.

## Causes exactes

### Affectations apparemment perdues après actualisation

Les politiques étaient bien persistées par `PUT /api/document-marks/policies/:documentType`. En revanche, les champs React utilisaient `defaultChecked` et `defaultValue`. Quand la liste des types arrivait avant la requête des politiques, le formulaire était monté avec des valeurs vides puis ne se resynchronisait plus avec la réponse asynchrone. Une invalidation React Query était en outre déclenchée sans être retournée par le callback de succès.

La correction remonte chaque formulaire à partir de la version persistée (`policyKey`) et attend désormais l'invalidation React Query avant de terminer le succès.

### Affectation limitée à un document

`service_stamps.document_context` ne permettait qu'un seul type documentaire. Cette structure ne pouvait pas représenter « un ou plusieurs documents ». La migration additive 092 introduit `service_stamp_document_types` avec une clé primaire `(stamp_id, document_type)` et rétroalimente chaque cachet historique depuis `document_context`. La colonne historique est conservée comme contexte principal de compatibilité.

La création et la modification des affectations sont transactionnelles, contrôlées par `stamp.manage`, limitées au périmètre RBAC de l'acteur et journalisées. Les snapshots des documents déjà émis ne sont pas modifiés.

### Types affichés mais non intégrés

L'interface proposait huit types alors que le moteur automatique de politiques est relié uniquement à `QUOTATION`, `SALE_ORDER`, `INVOICE` et `PAYMENT_RECEIPT`. `DELIVERY_REPORT` utilise son workflow explicite de signature de livraison. Les trois autres types ne possèdent pas encore de chemin de rendu de cachet.

Le référentiel expose désormais séparément `policyManaged` et `stampSupported`. L'administration n'autorise une politique automatique que pour les quatre générateurs intégrés, et les cachets ne peuvent être affectés qu'aux cinq workflows réellement compatibles, livraison comprise. Une tentative de politique automatique sur un workflow explicite reçoit HTTP 409.

## Chemin fonctionnel corrigé

1. Le frontend envoie `documentContexts` avec des codes stables.
2. Le backend valide chaque code et sa compatibilité réelle.
3. La transaction crée ou remplace les lignes de `service_stamp_document_types` et écrit l'audit.
4. `GET /api/document-marks/stamps` relit l'ensemble des affectations depuis MySQL.
5. React Query attend l'invalidation puis recharge les valeurs persistées.
6. Le moteur de résolution joint la table d'affectation au type du document demandé.
7. Il applique ensuite les contrôles existants : politique active, rôle autorisé, `stamp.use`, périmètre territorial, cachet/version actifs et non révoqués.
8. Le buffer image résolu est incorporé au PDF et son identité/version est figée dans le snapshot documentaire.

## Sécurité et traçabilité

- Aucun accès direct public aux fichiers n'a été ajouté.
- Les permissions existantes restent inchangées : `stamp.view`, `stamp.manage`, `stamp.use`, `signature.view.self`, `signature.manage.self`, `document.signature.apply`.
- Les contrôles `GLOBAL`, `CONCESSION` et `AGENCY` restent appliqués ; `OWN` demeure refusé pour la gouvernance des cachets.
- La sélection par défaut vérifie maintenant l'affectation exacte dans `service_stamp_document_types`.
- Les modifications d'affectations et de politiques sont écrites dans l'audit avec ancien et nouvel état.
- La suppression d'un cachet inutilisé supprime d'abord ses seules lignes d'affectation ; les contrôles historiques existants restent en place.
- Aucun timestamp, document historique, snapshot, rôle ou permission n'a été réécrit.

## Migration 092

Fichier : `backend-node/database/migrations/092_service_stamp_document_types.sql`

Propriétés vérifiées statiquement :

- additive uniquement ;
- clés étrangères vers `service_stamps` et `users` ;
- unicité par cachet et type documentaire ;
- index de recherche par type ;
- reprise des affectations historiques ;
- aucun `DROP`, `TRUNCATE` ni effacement de données métier.

Le gestionnaire résilient exécute les étapes séparément et vérifie leur schéma. Une table existante non conforme doit donc produire une divergence, et non être masquée par `IF NOT EXISTS`.

## Qualification PDF réelle

Cinq PDF ont été créés sous `/tmp/pdfs/lca-b32` :

| Cas | Pages | Images PDF | Résultat visuel |
|---|---:|---:|---|
| A — avec cachet | 2 | 1 | cachet visible, proportion conservée |
| B — sans cachet | 1 | 0 | aucune marque ajoutée |
| C — avec signature | 2 | 1 | signature visible, proportion conservée |
| D — sans signature | 1 | 0 | aucune marque ajoutée |
| E — multipage avec les deux | 5 | 2 | pagination intacte, deux marques sur la page finale |

Contrôles utilisés : en-tête `%PDF`, terminaison `%%EOF`, `pdfinfo`, `pdfimages -list`, rendu PNG de toutes les pages avec Poppler et inspection visuelle des pages de validation. Le PDF multipage reste en A4 et les images utilisent la zone bornée existante de 180 × 85 points.

## Tests exécutés

### Conformes

- Backend `npm run lint` : PASS.
- Backend `npm run build` : PASS.
- Frontend `npm run lint` : PASS.
- Frontend `npm run build` : PASS.
- `document-marks-lot2.test.ts` : PASS.
- `document-marks-b32-pdf.test.ts` : PASS.
- `document-marks-lot13.test.ts` : PASS.
- `document-marks-lot13-mysql.integration.test.ts` : fichier PASS, scénarios MySQL opt-in non activés faute d'instance accessible.
- `document-logo-delivery.test.ts` : PASS.
- Contrat frontend `document-marks-lot13.behavior.test.ts` après adaptation multi-documents : PASS.
- Campagne frontend complète initiale : 171/172 fichiers PASS ; l'unique échec était l'ancien contrat mono-document corrigé, puis rejoué PASS.
- `git diff --check` : PASS.

### Limitations environnementales observées

- Docker : accès au socket refusé par l'environnement de la session ; aucun conteneur n'a été démarré, arrêté ou modifié.
- Tests Supertest nécessitant une écoute réseau : `listen EPERM 0.0.0.0`. Les deux scénarios purement documentaires du fichier concerné passent ; les quatre scénarios HTTP ne peuvent pas ouvrir de port.
- La campagne backend globale a été interrompue après blocage prolongé lié à cette interdiction réseau. Les échecs observés avant interruption concernent le même mécanisme d'écoute, pas une assertion métier B.3.2 démontrée.

## Fichiers modifiés

- `backend-node/database/migrations/092_service_stamp_document_types.sql`
- `backend-node/src/modules/document-marks/document-mark.routes.ts`
- `backend-node/src/modules/document-marks/document-mark-policy.service.ts`
- `backend-node/src/modules/document-marks/stamp-lifecycle.routes.ts`
- `backend-node/src/modules/deliveries/delivery.routes.ts`
- `backend-node/test/document-marks-lot2.test.ts`
- `backend-node/test/document-marks-b32-pdf.test.ts`
- `frontend/src/api/documentMarkHooks.ts`
- `frontend/src/modules/settings/DocumentMarksSettings.tsx`
- `frontend/src/modules/deliveries/DeliveryDetailPage.tsx`
- `frontend/test/document-marks-lot13.behavior.test.ts`

## Procédure de levée de réserve

Sur une instance MySQL 8.4 temporaire neuve et isolée :

1. Exécuter le bootstrap normal jusqu'à la migration 092.
2. Vérifier la clé primaire, les deux clés étrangères et l'index de `service_stamp_document_types`.
3. Créer un cachet affecté à `QUOTATION` et `INVOICE`, puis contrôler les deux lignes SQL.
4. Recharger la page, fermer la session, se reconnecter et vérifier les deux affectations.
5. Modifier l'affectation en transaction et vérifier l'audit `stamp.document_types.updated`.
6. Autoriser le cachet à un rôle de test doté de `stamp.use` dans le bon périmètre.
7. Émettre un devis inclus et un reçu exclu ; vérifier respectivement présence et absence du cachet.
8. Tester un cachet inactif, révoqué, hors concession et non autorisé : tous doivent être refusés.
9. Exécuter ensuite les suites frontend/backend complètes dans un environnement autorisant Supertest.

Tant que ces étapes réelles ne sont pas exécutées, la réserve MySQL/navigateur demeure ouverte. Aucune intervention sur la base métier n'est requise ni autorisée dans le cadre de ce rapport.

---

# LOT B.3.2.1 — LEVÉE DES RÉSERVES

## Environnement isolé utilisé

La qualification réelle a été exécutée le 18 octobre 2026 sur une infrastructure locale exclusivement jetable :

- MySQL `8.4.11` dans le conteneur dédié `lca-b321-mysql` ;
- réseau Docker dédié `lca-b321-network` ;
- port hôte temporaire `127.0.0.1:33332` ;
- stockage MySQL en `tmpfs`, sans volume métier ni volume persistant ;
- bases fictives `lca_b321_fresh` et `lca_b321_legacy` ;
- backend de recette temporaire sur `127.0.0.1:3105` ;
- frontend Vite temporaire sur `127.0.0.1:4184` ;
- Chromium headless avec profil temporaire et port de débogage local `9225` ;
- GED de test sous `/tmp/lca-b321-ged`.

Aucun service préexistant, aucune base métier, aucun volume existant, aucun VPS et aucune archive de livraison n'ont été modifiés.

## Migration 092 sur MySQL 8.4 réel

### Base vierge

Le bootstrap officiel a créé le schéma jusqu'au niveau 092. Les contrôles `information_schema` ont confirmé :

- table `service_stamp_document_types` présente ;
- clé primaire composite `(stamp_id, document_type)` ;
- index de recherche `(document_type, stamp_id)` ;
- clés étrangères vers `service_stamps(id)` et `users(id)` ;
- marqueur `schema_migrations` : `92 / 092_service_stamp_document_types.sql` ;
- second passage du runner sans mutation ni divergence : base reconnue `VERSIONED`, niveau `>= 92`.

### Reprise depuis 091

Une seconde base isolée a été initialisée au niveau 091. Un cachet historique fictif a été créé avec `document_context=QUOTATION`, puis le bootstrap officiel a appliqué 092. Après migration :

- le cachet historique et ses données ont été conservés ;
- l'association `(cachet historique, QUOTATION)` a été créée exactement une fois ;
- `document_context` est resté `QUOTATION` ;
- le marqueur de migration 092 est présent ;
- une association dupliquée est refusée par la clé primaire (`ER_DUP_ENTRY`) ;
- une association vers un cachet inexistant est refusée par la clé étrangère (`ER_NO_REFERENCED_ROW_2`).

La lecture finale a confirmé la table et la migration 092 dans les deux bases, ainsi qu'une seule ligne historique `QUOTATION` pour le cachet de reprise.

## Persistance MySQL et API HTTP

Le test permanent `backend-node/test/document-marks-b321-mysql.integration.test.ts`, activé par `LCA_B321_MARKS_TEST=1`, a été exécuté sur MySQL réel et a réussi : **1/1 test, 0 échec**.

Il couvre par HTTP authentifié et contrôle directement MySQL :

- création d'un cachet affecté à `QUOTATION` et `INVOICE` ;
- relecture des deux associations ;
- modification transactionnelle en présence d'une valeur dupliquée dans le payload ;
- absence de doublon en base ;
- cohérence de la colonne historique `document_context` avec le premier contexte canonique ;
- audit de la modification ;
- conservation après nouvelle session authentifiée ;
- refus d'un type documentaire non pris en charge ;
- refus d'une politique automatique pour `DELIVERY_REPORT` ;
- refus si permission insuffisante ;
- isolation territoriale entre agences ;
- refus d'un cachet par défaut inactif ou révoqué.

La compatibilité ascendante du POST a aussi été préservée : lorsqu'aucun champ multi-document ni champ historique n'est fourni, le contexte historique `DELIVERY_REPORT` reste la valeur par défaut. Cela évite une régression des consommateurs existants sans affaiblir la validation des structures persistées.

Le fichier d'intégration historique `document-marks-lot13-mysql.integration.test.ts` a également été rejoué sur la même base isolée : **11/11 tests réussis, 0 échec**. Il confirme notamment les contrôles MIME/raster, l'idempotence et la concurrence, l'immuabilité des PDF archivés, les scopes `OWN`, `AGENCY`, `CONCESSION`, `GLOBAL`, l'absence de bypass par nom de rôle, les rollbacks et les nouvelles tentatives sûres.

## Recette navigateur réelle

Un compte fictif limité aux permissions documentaires a été utilisé dans Chromium. Le parcours demandé a été exécuté de bout en bout :

1. connexion ;
2. ouverture de Paramètres puis Cachets et signatures ;
3. sélection du cachet de recette ;
4. affectation à `QUOTATION` et `INVOICE` ;
5. enregistrement et actualisation ;
6. vérification des deux cases après actualisation ;
7. déconnexion puis reconnexion ;
8. nouvelle vérification des deux affectations ;
9. modification vers `INVOICE` et `DELIVERY_REPORT` ;
10. actualisation et vérification de la modification.

Le parcours équivalent des politiques de signature a confirmé :

- état initial enregistré `signature_required=true` ;
- même état après actualisation puis reconnexion ;
- modification vers `signature_required=false` ;
- conservation de la modification après actualisation.

Résultat navigateur : **PASS**. Le défaut React lié aux valeurs non resynchronisées n'est plus reproduit.

## PDF issus d'un workflow applicatif

Le workflow réel de livraison du test d'intégration a généré et archivé des PDF dans la GED jetable. Pour le document de livraison contrôlé :

- fichier PDF valide, A4, une page ;
- trois images embarquées détectées : signature client, signature utilisateur et cachet ;
- cachet bleu et deux signatures visibles après rendu Poppler ;
- positionnement contenu dans les zones prévues, sans recouvrement ni rupture de pagination ;
- `document_context=DELIVERY_REPORT` ;
- identifiants de versions de signature et de cachet figés dans le snapshot ;
- empreinte du fichier conservée et octets historiques inchangés après évolution des marques.

Les scénarios réels ont aussi confirmé qu'un aperçu non finalisé ne crée aucun document GED, qu'un cachet exclu/inactif/révoqué n'est pas appliqué et que l'absence de marque autorisée ne provoque pas de duplication ni de modification d'un document historique.

## RBAC et isolation

Les contrôles réels HTTP/MySQL confirment :

- `stamp.manage` requis pour créer ou modifier les affectations ;
- `stamp.use` requis au moment du rendu ;
- portée territoriale évaluée avant lecture ou mutation ;
- agence sœur non accessible avec un scope agence ;
- `OWN` non accepté pour la gouvernance collective des cachets ;
- cachet inactif ou révoqué non sélectionnable comme valeur par défaut ;
- aucune autorisation dérivée du seul nom `SUPER_ADMIN` ;
- audit conservé pour les mutations autorisées.

## Non-régression finale

| Contrôle | Résultat |
|---|---|
| Tests frontend complets | **876 réussis, 0 échec, 0 ignoré** |
| Tests backend ordinaires complets | **1 824 réussis, 0 échec, 84 opt-in ignorés, 1 908 total** |
| Intégration MySQL/HTTP B.3.2.1 | **1/1 réussi** |
| Intégration documentaire MySQL historique | **11/11 réussis** |
| Lint frontend | **PASS** |
| Build frontend | **PASS** |
| Lint backend | **PASS** |
| Build backend | **PASS** |
| `git diff --check` | **PASS** |

La campagne backend doit ouvrir des sockets locaux pour Supertest. Une tentative sous sandbox a donc produit des arrêts de fichiers sans assertion métier ; elle a été interrompue et remplacée par le rejeu complet autorisé aux ports locaux, dont le résultat définitif est celui du tableau ci-dessus. Une assertion source devenue trop stricte après qualification explicite des colonnes SQL (`st.is_active`, `st.revoked_at`) a été adaptée sans modifier le contrôle fonctionnel, puis le fichier ciblé et la suite complète ont réussi.

Comparaison B.3.1 : le frontend reste à **876/876**. Le backend passe de la référence **1 822 réussis** à **1 824 réussis**, l'écart correspondant aux tests permanents ajoutés, sans nouvel échec.

## Anomalies restantes et risques résiduels

Aucune anomalie fonctionnelle, SQL, HTTP, navigateur, PDF ou RBAC n'a été reproduite sur le périmètre B.3.2.1. Les données de qualification sont exclusivement fictives et jetables. L'application de la migration 092 sur un autre environnement devra toujours suivre le runner officiel et la procédure normale de sauvegarde de cet environnement ; ce rapport n'autorise aucun déploiement.

## Verdict définitif

**VALIDÉ.**

Les réserves d'exécution MySQL 8.4, HTTP/Supertest et navigateur du lot B.3.2 sont levées par des preuves réelles et reproductibles. La migration 092 est additive, idempotente et conservatrice sur une reprise 091 ; les affectations multi-documents persistent après actualisation et reconnexion ; les politiques de signature persistent ; les PDF applicatifs intègrent les marques attendues ; les protections RBAC et territoriales restent actives ; les suites complètes, lint et builds ne présentent aucune régression.
