# Anomalies critiques et majeures — P0/P1

Audit statique du 12 octobre 2026. Aucun P0 n'a été démontré. Les sept constats ci-dessous sont les seules anomalies P1 du catalogue ; ils ne sont pas dupliqués dans les rapports thématiques.

## AUD-LCA-001 — Résolution RBAC non déterministe en présence de plusieurs rôles

- **Module / catégorie / gravité / certitude :** Utilisateurs et RBAC / Sécurité, MySQL / **P1** / **Confirmée par analyse du code**.
- **Localisation :** `backend-node/database/baseline/001_initial_schema.sql:157-166`; `backend-node/database/legacy-migrations/023_dynamic_rbac.sql:19-32`; `backend-node/src/modules/rbac/rbac.service.ts`, `resolveRbacContext`, lignes 10-15; `backend-node/src/modules/users/user.service.ts`, `validRoles`, lignes 17-22 et créations/mises à jour lignes 29-37.
- **Description et cause technique :** la migration historique impose un utilisateur par rôle alors que la baseline accepte la clé composée `(user_id, role_id)`. Le service courant refuse bien les nouvelles affectations multiples, mais le résolveur sélectionne un rôle par `LIMIT 1` sans ordre et ne charge que ses permissions. Une base fraîche, une donnée importée ou une écriture hors service peut donc contenir plusieurs rôles, dont un seul est choisi arbitrairement.
- **Scénario :** un utilisateur possède deux lignes `user_roles`; deux authentifications ou plans SQL différents peuvent retenir des rôles différents.
- **Conséquences :** habilitations et profil JWT incohérents, refus indus ou privilège involontaire, divergence installation fraîche/ancienne.
- **Impact sous charge :** aucun volume n'est requis ; la concurrence rend seulement le diagnostic plus difficile.
- **Preuves :** absence d'unicité mono-rôle dans la baseline, contre `UNIQUE(user_id)` historique et `LIMIT 1` sans `ORDER BY`.
- **Correction recommandée :** décider formellement mono-rôle ou multi-rôle. Au vu du service actuel, ajouter un préflight de doublons puis une contrainte mono-rôle, et faire échouer explicitement le résolveur si plusieurs lignes sont rencontrées.
- **Risques de régression :** création/mise à jour d'utilisateurs, authentification, techniciens, délégation RBAC.
- **Tests recommandés :** installation fraîche/upgrade, donnée à deux rôles dans les deux ordres, authentification, scopes, technicien et migration de préflight.
- **Statut :** **NON CORRIGÉ — AUDIT UNIQUEMENT**.

## AUD-LCA-002 — Le filtre générique d'agence neutralise des scopes CONCESSION/GLOBAL

- **Module / catégorie / gravité / certitude :** Transverse multi-agences / Backend, RBAC, métier / **P1** / **Confirmée par analyse du code**.
- **Localisation :** `backend-node/src/middleware/agency-scope.ts`, middleware exporté, lignes 10-14; `backend-node/src/app.ts`, montage des routes authentifiées, ligne 59.
- **Description et cause technique :** avant les contrôles métier, le middleware refuse un `agencyId` différent de celui du jeton, sauf une liste blanche limitée. Il ignore le scope de la permission effective. Les routes ventes, livraisons, atelier, pièces et autres peuvent donc annoncer CONCESSION/GLOBAL tout en étant ramenées à AGENCY.
- **Scénario :** un directeur CONCESSION envoie une opération autorisée vers une agence sœur avec le paramètre naturel `agencyId` ; le middleware répond 403 avant le prédicat de ressource.
- **Conséquences :** parcours multi-agence bloqués et contrat API incohérent ; certains endpoints contournent par des alias de paramètres, ce qui augmente le risque d'erreur.
- **Impact sous charge :** pas d'aggravation directe ; les reprises manuelles et appels répétés augmentent le bruit opérationnel.
- **Preuves :** comparaison directe du filtre avec les scopes dynamiques des services aval.
- **Correction recommandée :** retirer le filtre générique au profit des contrôles de ressource, ou le rendre conscient de la permission et de son scope.
- **Risques de régression :** toute route recevant un identifiant d'agence ; risque de fuite si le remplacement est incomplet.
- **Tests recommandés :** matrice OWN/AGENCY/CONCESSION/GLOBAL, lecture et écriture, agences sœur/hors concession, paramètres body/query en camelCase et snake_case.
- **Statut :** **NON CORRIGÉ — AUDIT UNIQUEMENT**.

## AUD-LCA-003 — Les rooms Socket.IO survivent aux changements de périmètre et à certaines révocations

- **Module / catégorie / gravité / certitude :** Temps réel, Utilisateurs / Sécurité, concurrence / **P1** / **Confirmée par analyse du code**.
- **Localisation :** `backend-node/src/realtime/socket.ts`, middleware/connexion, lignes 23-29; `backend-node/src/modules/users/user.service.ts`, `update`, `changeOwnPassword`, `resetPassword`, lignes 36-40; `frontend/src/services/realtime.ts`, lignes 12-25; `frontend/src/components/AppBootstrap.tsx`, lignes 67-68.
- **Description et cause technique :** session, agence et rooms sont calculées uniquement au handshake. `rbac:updated` recharge le profil côté client sans reconnecter ; le changement d'agence/rôle et les changements de mot de passe ne déconnectent pas systématiquement le socket.
- **Scénario :** retirer GLOBAL ou changer l'agence d'un utilisateur connecté, puis émettre un événement dans son ancienne room ; ou réinitialiser son mot de passe sans couper sa socket.
- **Conséquences :** réception d'événements de l'ancien périmètre jusqu'à déconnexion, notamment notifications comportant des données métier.
- **Impact sous charge :** davantage de sockets longues durées élargissent la fenêtre d'exposition.
- **Preuves :** `socket.data` et `join()` ne sont exécutés qu'à la connexion ; seules certaines désactivations appellent `disconnectUser`.
- **Correction recommandée :** déconnecter toutes les sockets lors de tout changement de rôle/agence/session sensible, reconnecter après `rbac:updated` et vérifier le scope au moment d'émettre.
- **Risques de régression :** reconnexion, invalidation TanStack Query, notifications et déconnexion multi-onglets.
- **Tests recommandés :** deux agences, changement de scope sans coupure réseau, émissions ancienne/nouvelle room, reset de mot de passe, multi-onglets.
- **Statut :** **NON CORRIGÉ — AUDIT UNIQUEMENT**.

## AUD-LCA-004 — L'annuaire utilisateurs expose des métadonnées RBAC sans permission dédiée

- **Module / catégorie / gravité / certitude :** Utilisateurs / Sécurité, Backend / **P1** / **Confirmée par analyse du code**.
- **Localisation :** `backend-node/src/modules/users/user.routes.ts`, route `/directory`, ligne 11; `backend-node/src/modules/users/user.service.ts`, `SELECT`, `map` et `directory`, lignes 18-19 et 28.
- **Description et cause technique :** la route n'impose pas `users.view`. Pour l'agence courante, tout compte authentifié reçoit noms, rôles, liste des permissions, agence et indicateur Super Admin ; le contrôle n'est déclenché que dans certains filtres.
- **Scénario :** un compte métier sans permission utilisateurs appelle `/api/users/directory` sans filtre inter-agence.
- **Conséquences :** inventaire de l'organisation et de ses habilitations, utile à la reconnaissance interne ; exposition supérieure au besoin d'un simple sélecteur de collègues.
- **Impact sous charge :** la liste non paginée peut en plus devenir coûteuse dans une grande agence.
- **Preuves :** absence de `requirePermission` sur la route et DTO incluant `permissions`/`isSystemSuperAdmin`.
- **Correction recommandée :** permission dédiée d'annuaire, DTO minimal et permission `users.view` pour toute métadonnée d'habilitation.
- **Risques de régression :** sélecteurs technicien/utilisateur/assignation.
- **Tests recommandés :** compte métier sans `users.view`, compte avec permission d'annuaire, agence courante/autre agence, vérification stricte du DTO.
- **Statut :** **NON CORRIGÉ — AUDIT UNIQUEMENT**.

## AUD-LCA-005 — Course concurrente sur les transitions du pipeline CRM

- **Module / catégorie / gravité / certitude :** CRM / Concurrence, métier, MySQL / **P1** / **Confirmée par analyse du code**.
- **Localisation :** `backend-node/src/modules/crm/crm.routes.ts`, `PATCH /leads/:id/stage`, lignes 92-110.
- **Description et cause technique :** l'état courant et la transition sont vérifiés hors transaction ; l'UPDATE transactionnel ne relit ni ne verrouille la ligne et ne compare pas l'ancien état.
- **Scénario :** deux commerciaux partent simultanément de `contacted`, l'un vers `qualified`, l'autre vers `lost`. Les deux validations réussissent, le dernier commit gagne et deux activités contradictoires sont écrites.
- **Conséquences :** état final non déterministe, historique trompeur et automatisations métier incohérentes.
- **Impact sous charge :** probabilité accrue avec plusieurs commerciaux ou doubles clics/reprises réseau.
- **Preuves :** contrôle préalable suivi d'un UPDATE sans `FOR UPDATE`, version ou condition sur l'ancien stage.
- **Correction recommandée :** relire et verrouiller dans la transaction, recalculer la règle puis faire un UPDATE conditionnel ; retourner 409 au perdant.
- **Risques de régression :** activités CRM, notifications, conversion prospect/client.
- **Tests recommandés :** deux PATCH réellement concurrents, un seul succès, une seule activité cohérente, essais de transitions interdites.
- **Statut :** **NON CORRIGÉ — AUDIT UNIQUEMENT**.

## AUD-LCA-006 — Un téléchargement de facture peut franchir une bascule de session frontend

- **Module / catégorie / gravité / certitude :** Facturation, authentification frontend / Sécurité, Frontend / **P1** / **Confirmée par analyse du code**.
- **Localisation :** `frontend/src/services/invoicePdf.ts`, `invoicePdfBlob`, lignes 1-17; `frontend/src/services/apiClient.ts`, `apiDownload`, lignes 72-96.
- **Description et cause technique :** le service PDF utilise `fetch` avec un jeton capturé dans `localStorage`, en dehors du client central, de son rafraîchissement single-flight et de son contrôle de génération de session.
- **Scénario :** A lance un PDF lent, se déconnecte, B se connecte avant la réponse ; le blob autorisé par le jeton A peut ensuite être ouvert/téléchargé dans l'interface de B. Un jeton expiré échoue aussi alors que la session est rafraîchissable.
- **Conséquences :** divulgation inter-session sur poste partagé et défaillance fonctionnelle des impressions.
- **Impact sous charge :** les réponses PDF lentes allongent la fenêtre de bascule.
- **Preuves :** écart direct avec les protections présentes dans `apiDownload`.
- **Correction recommandée :** passer exclusivement par `apiDownload` et annuler/rejeter toute réponse appartenant à une génération antérieure.
- **Risques de régression :** aperçu, impression, noms de fichiers, gestion des erreurs 401.
- **Tests recommandés :** 401→refresh→200, réponse différée A puis login B, absence de création d'URL objet pour la réponse périmée.
- **Statut :** **NON CORRIGÉ — AUDIT UNIQUEMENT**.

## AUD-LCA-007 — Le chemin de déploiement fourni n'impose pas TLS

- **Module / catégorie / gravité / certitude :** Infrastructure / Sécurité, Infrastructure / **P1** / **Risque potentiel**.
- **Localisation :** `deploy/nginx-host.conf.example`, serveur, lignes 1-16; `docker-compose.yml`, service frontend/ports, lignes 74-85.
- **Description et cause technique :** la configuration de référence écoute uniquement en HTTP et le Compose publie par défaut le port 80 sur toutes les interfaces. Aucun artefact fourni n'impose une terminaison TLS ou une redirection HTTPS.
- **Scénario :** déploiement conforme aux fichiers fournis, sans reverse proxy TLS externe.
- **Conséquences :** mots de passe, Bearer et refresh tokens exposés à l'interception réseau.
- **Impact sous charge :** sans rapport ; risque conditionné par l'architecture réelle en amont.
- **Preuves :** directives `listen 80` et publication `0.0.0.0:${HTTP_PORT:-80}` ; absence de bloc 443 dans les fichiers examinés.
- **Correction recommandée :** imposer/documenter le point TLS, rediriger 80→443 et activer HSTS au terminateur.
- **Risques de régression :** proxy WebSocket, URLs publiques, healthchecks et certificats.
- **Tests recommandés :** inspection de la configuration effective, redirection HTTP, chaîne de certificat, WebSocket WSS et headers.
- **Statut :** **NON CORRIGÉ — AUDIT UNIQUEMENT**.
