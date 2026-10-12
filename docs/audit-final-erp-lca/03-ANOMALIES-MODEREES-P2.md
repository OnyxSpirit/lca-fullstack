# Anomalies modérées — P2

Catalogue canonique des douze anomalies P2. Les scénarios de charge restent théoriques : aucune mesure dynamique n'a été effectuée.

## AUD-LCA-008 — Un PATCH prospect peut supprimer les derniers éléments d'identité ou de contact

- **Module / catégorie / gravité / certitude :** CRM / Backend, métier / **P2** / **Confirmée par analyse du code**.
- **Localisation :** `backend-node/src/modules/crm/crm.routes.ts`, création lignes 73-77 et mise à jour lignes 82-87.
- **Description et cause technique :** la création exige identité et téléphone ou email ; le PATCH valide chaque champ isolément mais ne fusionne pas la ressource persistée avec le payload pour réappliquer ces invariants.
- **Scénario :** effacer successivement email puis téléphone, ou les champs d'identité correspondant au type de prospect.
- **Conséquences :** prospect inexploitable, recherche/qualification et rapprochement client dégradés.
- **Impact sous charge :** non spécifique.
- **Preuves :** règles de création absentes du chemin UPDATE.
- **Correction recommandée :** verrouiller/recharger, fusionner état et patch, puis valider tous les invariants avant écriture.
- **Risques de régression :** imports et édition partielle CRM.
- **Tests recommandés :** suppressions séquentielles et combinées des dernières coordonnées/identité.
- **Statut :** **NON CORRIGÉ — AUDIT UNIQUEMENT**.

## AUD-LCA-009 — La recherche de rattachement GED applique le scope après une limite globale

- **Module / catégorie / gravité / certitude :** GED / Backend, RBAC, performance / **P2** / **Confirmée par analyse du code**.
- **Localisation :** `backend-node/src/modules/documents/document-access.ts`, `searchEntities`, ligne 33.
- **Description et cause technique :** la requête prend 50 résultats toutes agences, puis le code filtre le scope et s'arrête à 15. Le filtrage d'autorisation est donc postérieur au tri/limit.
- **Scénario :** plus de 50 homonymes hors périmètre précèdent une cible autorisée.
- **Conséquences :** faux résultat vide et rattachement documentaire bloqué.
- **Impact sous charge :** le défaut apparaît avec la croissance des référentiels.
- **Preuves :** `LIMIT 50` avant boucle de filtrage.
- **Correction recommandée :** injecter le prédicat de scope en SQL avant tri et limite, ou paginer jusqu'à obtenir 15 autorisés.
- **Risques de régression :** recherche multi-types et scopes concession/global.
- **Tests recommandés :** 50 hors scope puis une cible autorisée, pour chaque scope.
- **Statut :** **NON CORRIGÉ — AUDIT UNIQUEMENT**.

## AUD-LCA-010 — Versionnage, archivage et audit GED ne sont pas atomiques

- **Module / catégorie / gravité / certitude :** GED / Backend, MySQL, métier / **P2** / **Confirmée par analyse du code**.
- **Localisation :** `backend-node/src/modules/documents/document.routes.ts`, routes upload/version/archive/restore, lignes 17 et 22-24.
- **Description et cause technique :** une nouvelle version est insérée sans journal métier équivalent à l'upload ; archive/restore modifient puis auditent via écritures autocommit séparées.
- **Scénario :** l'UPDATE réussit puis l'audit échoue ; l'API renvoie 500 mais la ressource est déjà mutée. Le rejeu peut répondre 409 sans recréer la trace.
- **Conséquences :** traçabilité documentaire incomplète et état ambigu pour l'utilisateur.
- **Impact sous charge :** contention/pannes partielles augmentent la probabilité d'une coupure entre écritures.
- **Preuves :** absence de transaction commune et omission d'audit sur `/version`.
- **Correction recommandée :** transactionner métadonnée et audit ; émettre les événements uniquement après commit.
- **Risques de régression :** stockage fichier/DB et rejeu idempotent.
- **Tests recommandés :** injection d'échec audit, rollback attendu, audit obligatoire d'une version.
- **Statut :** **NON CORRIGÉ — AUDIT UNIQUEMENT**.

## AUD-LCA-011 — Le rapport budgets omet les budgets de concession

- **Module / catégorie / gravité / certitude :** Reporting financier / Backend, métier / **P2** / **Fortement probable**.
- **Localisation :** `backend-node/src/modules/reports/financial-report.service.ts`, `budgetReport`, lignes 21 et 51; référence correcte `backend-node/src/modules/hr/hr.routes.ts`, lignes 40-42.
- **Description et cause technique :** le filtre générique porte sur `b.agency_id`, alors que les budgets concession utilisent `b.concession_id` et un `agency_id` nul.
- **Scénario :** directeur CONCESSION consulte un exercice contenant budgets agence et concession.
- **Conséquences :** enveloppes/engagements incomplets et décision financière faussée ; le GLOBAL voit davantage de données.
- **Impact sous charge :** non spécifique.
- **Preuves :** divergence avec le `COALESCE(b.concession_id, ba.concession_id)` utilisé par RH.
- **Correction recommandée :** prédicat dédié au budget et règle explicite pour le filtre agence d'un budget concession.
- **Risques de régression :** agrégations budget/dépense et exports.
- **Tests recommandés :** budgets agence+concession sous AGENCY/CONCESSION/GLOBAL.
- **Statut :** **NON CORRIGÉ — AUDIT UNIQUEMENT**.

## AUD-LCA-012 — La politique GED facture utilise une permission différente des routes facture

- **Module / catégorie / gravité / certitude :** GED, Facturation / RBAC, Backend / **P2** / **Confirmée par analyse du code**.
- **Localisation :** `backend-node/src/modules/documents/document-access.ts`, politique facture, ligne 4; `backend-node/src/modules/billing/billing.routes.ts`, routes facture, lignes 63, 79 et 99.
- **Description et cause technique :** la GED vérifie `billing.view` tandis que les routes métier utilisent `billing.invoice.view`.
- **Scénario :** profil doté de l'une mais pas de l'autre.
- **Conséquences :** facture métier accessible mais dossier GED refusé, ou accès documentaire plus large que le droit facture prévu.
- **Impact sous charge :** aucun.
- **Preuves :** littéraux de permissions contradictoires.
- **Correction recommandée :** aligner la politique sur la permission fonctionnelle décidée, avec compatibilité explicite si nécessaire.
- **Risques de régression :** profils historiques et documents associés.
- **Tests recommandés :** matrice des quatre combinaisons de permissions.
- **Statut :** **NON CORRIGÉ — AUDIT UNIQUEMENT**.

## AUD-LCA-013 — Le pool MySQL n'a ni backpressure ni délai d'acquisition borné

- **Module / catégorie / gravité / certitude :** Infrastructure DB / Performance, MySQL / **P2** / **Risque potentiel**.
- **Localisation :** `backend-node/src/config/database.ts`, création du pool, lignes 4-8; `backend-node/src/config/env.ts`, pool par défaut, ligne 33; `deploy/mysql.cnf`, `max_connections`, ligne 5.
- **Description et cause technique :** pool de 10 connexions, `waitForConnections:true`, `queueLimit:0`, sans timeout d'acquisition/requête. Une requête lente ou verrouillée crée une file de promesses non bornée.
- **Scénario :** 25 à 100 utilisateurs déclenchent rapports, tableaux de bord ou écritures alors que les connexions sont occupées.
- **Conséquences :** latence en cascade, mémoire accrue et indisponibilité sans rejet rapide.
- **Impact sous charge :** directement croissant ; aucune capacité maximale n'a été mesurée.
- **Preuves :** options du pool et limite MySQL statiques.
- **Correction recommandée :** queue et délais bornés, budgets par endpoint, réponses 429/503 et observabilité.
- **Risques de régression :** erreurs transitoires et politique de retry.
- **Tests recommandés :** charge contrôlée hors production, saturation et requêtes lentes, stabilité mémoire.
- **Statut :** **NON CORRIGÉ — AUDIT UNIQUEMENT**.

## AUD-LCA-014 — Les uploads GED sont intégralement tamponnés en mémoire

- **Module / catégorie / gravité / certitude :** GED / Performance, Backend / **P2** / **Risque potentiel**.
- **Localisation :** `backend-node/src/modules/documents/document-multipart.ts`, parseur, lignes 5-7; `frontend/nginx/default.conf`, limite, ligne 12; `docker-compose.yml`, mémoire backend, ligne 69.
- **Description et cause technique :** le parseur accumule les chunks puis appelle `Buffer.concat`, avec environ 15 Mio acceptés par requête ; Nginx accepte 50 Mio et le conteneur backend est limité à 768 Mio.
- **Scénario :** plusieurs utilisateurs téléversent simultanément près de la limite.
- **Conséquences :** pics mémoire, GC et OOM/restart possible.
- **Impact sous charge :** approximativement proportionnel au nombre d'uploads, avec duplication temporaire lors de la concaténation ; aucune mesure réelle.
- **Preuves :** tableau de chunks et concaténation complète.
- **Correction recommandée :** streaming vers staging, limite unique alignée, nettoyage sur abort.
- **Risques de régression :** signatures, hash, atomicité fichier/SQL.
- **Tests recommandés :** uploads concurrents proches limite et abandons, mémoire surveillée hors production.
- **Statut :** **NON CORRIGÉ — AUDIT UNIQUEMENT**.

## AUD-LCA-015 — Un état d'authentification local corrompu bloque le démarrage React

- **Module / catégorie / gravité / certitude :** Authentification frontend / Frontend / **P2** / **Confirmée par analyse du code**.
- **Localisation :** `frontend/src/stores/authStore.ts`, initialisation, lignes 36-39.
- **Description et cause technique :** `JSON.parse` est exécuté au chargement du module sans capture ni validation de schéma.
- **Scénario :** valeur `lca-auth-user` tronquée, ancienne ou écrite par une extension.
- **Conséquences :** exception avant rendu, page de connexion et ErrorBoundary potentiellement inaccessibles.
- **Impact sous charge :** aucun.
- **Preuves :** parse direct dans l'initialiseur global.
- **Correction recommandée :** parse sûr, schéma minimal et purge atomique des clés de session.
- **Risques de régression :** restauration de session et migrations de stockage.
- **Tests recommandés :** JSON invalide, forme obsolète et types erronés ; retour attendu à Login.
- **Statut :** **NON CORRIGÉ — AUDIT UNIQUEMENT**.

## AUD-LCA-016 — La recherche globale ne respecte pas le socle modal accessible

- **Module / catégorie / gravité / certitude :** Navigation / Frontend, accessibilité / **P2** / **Confirmée par analyse du code**.
- **Localisation :** `frontend/src/components/layout/GlobalSearchModal.tsx`, composant, lignes 21-124; référence `frontend/src/components/ui/Modal.tsx`, lignes 31-67.
- **Description et cause technique :** Escape et autofocus existent, mais ni piège Tab, ni restauration du focus, ni verrouillage du scroll ; le composant commun qui les fournit n'est pas réutilisé.
- **Scénario :** navigation clavier avec la recherche ouverte puis fermeture.
- **Conséquences :** focus derrière le dialogue ou perdu, action sur l'arrière-plan et parcours clavier dégradé.
- **Impact sous charge :** aucun.
- **Preuves :** comparaison structurelle des deux composants.
- **Correction recommandée :** composer `Modal` ou mutualiser son gestionnaire de focus.
- **Risques de régression :** raccourci global et navigation résultats.
- **Tests recommandés :** Tab/Shift+Tab, Escape, focus initial/final et scroll.
- **Statut :** **NON CORRIGÉ — AUDIT UNIQUEMENT**.

## AUD-LCA-017 — La réception de pièces contourne le client API central

- **Module / catégorie / gravité / certitude :** Pièces / Frontend / **P2** / **Confirmée par analyse du code**.
- **Localisation :** `frontend/src/modules/parts/SparePartsPage.tsx`, `fetchDetail` et `ReceiveModal`, lignes 49-50.
- **Description et cause technique :** `fetchDetail` lit directement le jeton et utilise `fetch`, sans refresh, isolation de génération, abort ni message d'erreur visible.
- **Scénario :** le jeton expire juste avant l'ouverture d'une réception alors que le refresh est valide ; ou la modale change rapidement de commande.
- **Conséquences :** détail vide et réception bloquée/silencieuse, réponse tardive potentiellement obsolète.
- **Impact sous charge :** réponses lentes augmentent les courses d'état.
- **Preuves :** implémentation locale distincte de `apiClient`.
- **Correction recommandée :** client central + AbortController/identité de requête + erreur affichée.
- **Risques de régression :** réception fournisseur et sélection d'agence.
- **Tests recommandés :** refresh 401, changement rapide d'ID, unmount et erreur réseau.
- **Statut :** **NON CORRIGÉ — AUDIT UNIQUEMENT**.

## AUD-LCA-018 — L'avatar public n'est validé que par MIME déclaré

- **Module / catégorie / gravité / certitude :** Utilisateurs / Sécurité, fichiers / **P2** / **Confirmée par analyse du code**.
- **Localisation :** `backend-node/src/modules/users/user-avatar.ts`, `saveAvatar`, lignes 11-19; `backend-node/src/app.ts`, exposition statique, lignes 53-56.
- **Description et cause technique :** taille et MIME multipart sont contrôlés, mais pas la signature ni le décodage, contrairement à la GED et aux images véhicule.
- **Scénario :** fichier arbitraire annoncé comme JPEG/PNG/WebP.
- **Conséquences :** contenu non-image stocké et publiquement servi ; `nosniff` réduit mais n'annule pas tous les risques de fichiers polyglottes.
- **Impact sous charge :** stockage de fichiers invalides ; pas de saturation distincte démontrée.
- **Preuves :** absence de vérification magique dans `saveAvatar`.
- **Correction recommandée :** signature, décodage/réencodage et extension dérivée du contenu.
- **Risques de régression :** formats historiques d'avatars.
- **Tests recommandés :** MIME/extension falsifiés, polyglottes, images valides.
- **Statut :** **NON CORRIGÉ — AUDIT UNIQUEMENT**.

## AUD-LCA-019 — Le healthcheck public consomme le pool SQL à chaque appel

- **Module / catégorie / gravité / certitude :** Exploitation / Performance, sécurité / **P2** / **Risque potentiel**.
- **Localisation :** `backend-node/src/app.ts`, `/api/health`, ligne 57; `frontend/nginx/default.conf`, proxy `/api`, lignes 14-23.
- **Description et cause technique :** liveness public exécute `SELECT 1` sans cache ni limite ; il partage le pool métier non borné.
- **Scénario :** sondes trop fréquentes ou rafale externe sur l'URL publique.
- **Conséquences :** consommation évitable des connexions et amplification d'AUD-LCA-013.
- **Impact sous charge :** concurrence directe avec les requêtes métier.
- **Preuves :** route publique avant authentification et appel SQL par requête.
- **Correction recommandée :** séparer liveness sans DB et readiness interne/protégée ou brièvement cachée.
- **Risques de régression :** orchestration et supervision.
- **Tests recommandés :** sondes configurées, panne DB, rafale contrôlée et priorité trafic métier.
- **Statut :** **NON CORRIGÉ — AUDIT UNIQUEMENT**.
