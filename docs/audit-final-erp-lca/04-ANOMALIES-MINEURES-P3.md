# Anomalies mineures — P3

## AUD-LCA-020 — Les comptes sans agence partagent artificiellement la room `agency:null`

- **Module / catégorie / gravité / certitude :** Temps réel / Sécurité / **P3** / **Confirmée par analyse du code**.
- **Localisation :** `backend-node/src/realtime/socket.ts`, authentification et join, lignes 27-28.
- **Description et cause technique :** `String(active.agency_id)` transforme SQL NULL en chaîne truthy `"null"`, ensuite rejointe comme room agence.
- **Scénario :** au moins deux comptes sans agence et une émission accidentelle vers `agency:null`.
- **Conséquences :** mutualisation imprévue d'événements ; aucune émission active vers cette room n'a été démontrée.
- **Impact sous charge :** nombre de destinataires erronés croissant.
- **Preuves :** conversion avant test de vérité.
- **Correction recommandée :** préserver `null` avant conversion et ne jamais joindre de room agence.
- **Risques de régression :** comptes globaux sans agence.
- **Tests recommandés :** deux comptes sans agence, inventaire des rooms, aucune réception croisée.
- **Statut :** **NON CORRIGÉ — AUDIT UNIQUEMENT**.

## AUD-LCA-021 — Le login peut laisser une session active après une erreur tardive

- **Module / catégorie / gravité / certitude :** Authentification / Backend, MySQL / **P3** / **Confirmée par analyse du code**.
- **Localisation :** `backend-node/src/modules/auth/auth.service.ts`, `issueTokens` et `login`, lignes 37-50.
- **Description et cause technique :** insertion du refresh token, mise à jour `last_login_at` et construction du profil sont séparées.
- **Scénario :** échec SQL/profil après l'INSERT ; le client reçoit 500 mais la session persiste.
- **Conséquences :** sessions orphelines et répétitions inutiles ; l'exploitation directe requiert la possession d'un jeton non renvoyé.
- **Impact sous charge :** accumulation lors d'une panne partielle répétée.
- **Preuves :** trois étapes non transactionnelles.
- **Correction recommandée :** valider le profil avant émission et transactionner INSERT + last_login.
- **Risques de régression :** rotation et journalisation des connexions.
- **Tests recommandés :** injection d'erreur après INSERT, absence de refresh token résiduel.
- **Statut :** **NON CORRIGÉ — AUDIT UNIQUEMENT**.

## AUD-LCA-022 — Le composant Tabs n'implémente pas la navigation clavier ARIA complète

- **Module / catégorie / gravité / certitude :** Composants partagés / Frontend, accessibilité / **P3** / **Confirmée par analyse du code**.
- **Localisation :** `frontend/src/components/ui/Tabs.tsx`, composant, lignes 26-137.
- **Description et cause technique :** rôles et `aria-selected` existent, mais pas de roving `tabIndex`, flèches, Home/End ni association complète `aria-controls`.
- **Scénario :** navigation sans souris dans un écran à plusieurs onglets.
- **Conséquences :** ordre Tab long et comportement différent du pattern ARIA attendu.
- **Impact sous charge :** aucun.
- **Preuves :** absence des gestionnaires clavier et relations de panneaux.
- **Correction recommandée :** implémenter le pattern WAI-ARIA Tabs complet.
- **Risques de régression :** trois variantes visuelles et focus.
- **Tests recommandés :** clavier sur chaque variante, focus et panneau actif.
- **Statut :** **NON CORRIGÉ — AUDIT UNIQUEMENT**.

## AUD-LCA-023 — La route Notifications n'applique pas son garde de module

- **Module / catégorie / gravité / certitude :** Notifications / Frontend, RBAC / **P3** / **Confirmée par analyse du code**.
- **Localisation :** `frontend/src/App.tsx`, route notifications, ligne 92; `frontend/src/App.tsx`, mapping permission, ligne 57; `frontend/src/modules/notifications/NotificationsPage.tsx`, lignes 18-20.
- **Description et cause technique :** `/notifications` est accessible sans `ModuleGuard` alors qu'une permission `notifications.view` existe ; la page neutralise seulement sa requête.
- **Scénario :** navigation URL directe sans permission.
- **Conséquences :** page vide ou contrôles visibles au lieu du refus cohérent ; aucune fuite API n'est démontrée.
- **Impact sous charge :** aucun.
- **Preuves :** divergence avec les autres routes protégées.
- **Correction recommandée :** ajouter le garde de module et conserver le contrôle backend.
- **Risques de régression :** accès aux notifications personnelles.
- **Tests recommandés :** utilisateur avec/sans permission, navigation directe.
- **Statut :** **NON CORRIGÉ — AUDIT UNIQUEMENT**.

## AUD-LCA-024 — Les images de base Docker ne sont pas figées par digest

- **Module / catégorie / gravité / certitude :** Infrastructure / Reproductibilité, sécurité supply-chain / **P3** / **Risque potentiel**.
- **Localisation :** `docker-compose.yml`, ligne 7; `docker-compose.recette.yml`, ligne 5; `backend-node/Dockerfile`, lignes 1 et 9; `frontend/Dockerfile`, lignes 1 et 10 (références `mysql:8.4`, `node:22-bookworm-slim`, `nginx:1.27-alpine`).
- **Description et cause technique :** des tags mobiles peuvent pointer vers un runtime différent à source identique.
- **Scénario :** reconstruction après publication amont d'une nouvelle image sous le même tag.
- **Conséquences :** dérive reproductibilité, comportement ou vulnérabilités différents.
- **Impact sous charge :** non applicable.
- **Preuves :** absence de digest dans les références d'images.
- **Correction recommandée :** figer patch+digest et automatiser les mises à jour vérifiées/SBOM.
- **Risques de régression :** maintenance des correctifs de sécurité.
- **Tests recommandés :** build reproductible et scan d'image dans un environnement dédié.
- **Statut :** **NON CORRIGÉ — AUDIT UNIQUEMENT**.
