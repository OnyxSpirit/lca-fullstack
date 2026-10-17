# RAPPORT D'IMPLÉMENTATION — SUPPRESSION DES APPAREILS DE CONFIANCE — LOT A.3

## 1. Résumé de l'évolution

Le lot ajoute une suppression physique, administrative et explicite des appareils de confiance 2FA déjà révoqués. La suppression est séparée de la révocation, protégée par une permission RBAC dédiée, limitée territorialement, soumise à un step-up récent et journalisée avant disparition de la ligne.

Aucune migration n'a été appliquée, aucune base métier n'a été modifiée, et aucune opération Docker, de déploiement ou Git destructive n'a été exécutée.

## 2. Architecture retenue

Le parcours réutilise les composants existants : middleware d'authentification et de permission, carte RBAC dynamique attachée à la requête, moteur de scopes territorial, contrôle de step-up, transaction MySQL et `writeAudit`. Aucun moteur parallèle de permissions, de scopes ou d'audit n'a été créé.

Le backend verrouille la ligne ciblée avec `SELECT ... FOR UPDATE`, vérifie sa visibilité territoriale et son état révoqué, écrit l'audit, puis exécute une suppression conditionnelle `DELETE ... WHERE id = ? AND revoked_at IS NOT NULL` dans la même transaction.

## 3. Nouvelle permission

Permission : `auth.2fa.devices.delete`.

Elle est distincte de `auth.2fa.devices.view` et `auth.2fa.devices.revoke`. La migration n'accorde aucun droit aux rôles personnalisés. Elle amorce uniquement le véritable rôle système actif `SUPER_ADMIN`, avec une portée `GLOBAL`. Les rôles personnalisés pourront recevoir la permission depuis la matrice RBAC dynamique après application autorisée de la migration.

## 4. Scopes compatibles

Les scopes autorisés sont :

- `AGENCY` : appareils des utilisateurs de l'agence de l'acteur ;
- `CONCESSION` : appareils des utilisateurs rattachés à la concession de l'acteur ;
- `GLOBAL` : périmètre global autorisé.

Le scope `OWN` est explicitement refusé pour cette permission administrative. Le filtrage est inclus dans la requête SQL qui verrouille l'appareil. Un appareil inexistant ou hors périmètre produit la même réponse 404 afin d'éviter la divulgation.

## 5. Endpoint ajouté

`DELETE /api/auth/2fa/devices/:id/permanent`

Le routeur exige `auth.2fa.devices.delete`. Le service exige ensuite un step-up récent, applique le scope, protège le véritable `SUPER_ADMIN`, exige `revoked_at IS NOT NULL`, journalise et supprime. Une réussite renvoie 200 avec `{ "success": true }`. Un appareil accessible mais non révoqué renvoie 409 ; un appareil absent, déjà supprimé, hors scope ou protégé contre l'acteur renvoie 404. L'absence d'authentification ou de permission reste traitée par les middlewares existants.

## 6. Protections de sécurité

- permission de suppression indépendante de la révocation ;
- scope calculé depuis le contexte RBAC serveur ;
- rejet explicite du scope `OWN` ;
- step-up obligatoire avant accès et suppression ;
- verrouillage pessimiste de la ligne ;
- précondition de révocation contrôlée sous verrou ;
- clause de suppression répétant `revoked_at IS NOT NULL` ;
- réponse anti-divulgation 404 pour les ressources invisibles ;
- aucune journalisation du jeton brut, du cookie, de son hash, du secret TOTP ou des codes de récupération ;
- rollback automatique si l'audit ou la suppression échoue.

## 7. Politique SUPER_ADMIN

La protection existante est réutilisée via `targetHasSystemSuperAdmin` et `isSuperAdmin`. Elle repose sur l'identité système du rôle, pas sur son libellé affiché. Un administrateur délégué ne peut pas supprimer l'appareil d'un utilisateur détenteur du véritable rôle système `SUPER_ADMIN`; la réponse est 404. Le véritable Super Administrateur conserve la capacité dans le cadre de sa permission et de son step-up.

L'interface ne possède pas actuellement, dans le contrat `TrustedDevice`, un indicateur fiable permettant d'identifier ce rôle système. Elle ne tente donc pas de reproduire imparfaitement cette décision : le backend reste l'autorité finale.

## 8. Transaction SQL

La séquence est atomique : début de transaction, sélection sous verrou avec scope, contrôles, insertion dans `audit_logs`, suppression conditionnelle, puis commit. Toute exception provoque le rollback via l'utilitaire transactionnel existant.

L'audit préalable a confirmé qu'aucune table ne possède de clé étrangère vers l'identifiant de `two_factor_trusted_devices`. Les seules clés étrangères portées par cette table ciblent les utilisateurs (`user_id` avec cascade, `revoked_by` avec mise à NULL). La suppression physique d'une ligne révoquée ne supprime donc ni utilisateur ni journal d'activité.

## 9. Journalisation

L'événement `auth.2fa.trusted_device_permanently_deleted` est écrit par le système d'audit existant. Il conserve l'identifiant de l'appareil, l'administrateur (fourni par la requête), le propriétaire, le nom informatif de l'appareil, ses dates utiles, son état révoqué et son contexte agence/concession.

L'entrée est autonome dans `audit_logs` et ne possède pas de clé étrangère vers l'appareil : elle reste disponible après suppression. Le filtre central de `writeAudit` exclut en outre les champs sensibles correspondant notamment à `token`, `secret`, `cookie` et `hash`.

## 10. Interface frontend

La page et la navigation existantes sont conservées. Dans le tableau administratif :

- l'action « Supprimer » n'apparaît qu'avec `auth.2fa.devices.delete` ;
- elle n'est jamais proposée dans « Mes appareils » ;
- elle est désactivée tant que l'état n'est pas `REVOKED`, avec l'explication demandée ;
- elle utilise une confirmation explicite et irréversible ;
- un besoin de step-up ouvre la fenêtre existante, puis reprend automatiquement la suppression après validation ;
- la réussite invalide la liste des appareils et le résumé du centre de sécurité ;
- les erreurs API restent visibles et la liste n'est pas masquée.

Les états de chargement, d'erreur réseau et de liste vide déjà présents sont préservés.

## 11. Migration RBAC

La migration additive `091_two_factor_trusted_device_deletion.sql` enregistre la permission et son amorçage `SUPER_ADMIN`. Elle utilise les conventions MySQL 8.4 et d'idempotence du dépôt (`ON DUPLICATE KEY UPDATE`). Elle ne modifie aucune attribution de rôle personnalisé et ne supprime aucune attribution existante.

État : créée mais volontairement non appliquée. L'endpoint restera naturellement inaccessible jusqu'à son application autorisée et au rechargement normal des permissions.

## 12. Fichiers modifiés pour le lot A.3

- `backend-node/database/migrations/091_two_factor_trusted_device_deletion.sql`
- `backend-node/src/modules/auth/trusted-device.service.ts`
- `backend-node/src/modules/auth/two-factor-admin.routes.ts`
- `backend-node/src/modules/rbac/permission-scope-policy.ts`
- `backend-node/test/trusted-device-management.test.ts`
- `frontend/src/api/twoFactorHooks.ts`
- `frontend/src/components/ui/BusinessDialog.tsx`
- `frontend/src/modules/auth/TrustedDevicesPanel.tsx`
- `frontend/test/trusted-device-management.test.ts`
- `docs/RAPPORT-IMPLEMENTATION-SUPPRESSION-APPAREILS-LOT-A3.md`

Les modifications locales antérieures du lot A.1 ont été conservées sans reset, restore, stash ou clean.

## 13. Tests exécutés

- Tests backend ciblés 2FA, appareils de confiance, step-up et scopes RBAC : **PASS**, 6 fichiers sur 6.
- Tests frontend ciblés appareils de confiance, 2FA, RBAC et navigation : **PASS**, 7 fichiers sur 7.
- Lint backend : **PASS**.
- Build backend : **PASS**.
- Lint frontend : **PASS**.
- Build frontend : **PASS** (2 505 modules transformés).
- Test frontend RBAC `rbac-role-edit` : **PASS**.
- Test frontend `trusted-device-management` : **PASS**.
- `git diff --check` : **PASS**.

Les tests ajoutés vérifient statiquement le catalogue et l'amorçage de la permission, la séparation de l'endpoint, le step-up, les scopes, le verrouillage, l'obligation de révocation, la transaction, l'ordre audit/suppression, l'absence de secrets dans l'audit, la protection `SUPER_ADMIN`, l'affichage frontend, la confirmation, la reprise après step-up et l'invalidation des données.

## 14. Tests non exécutés

- migration réelle sur une instance MySQL 8.4 isolée ;
- tests d'intégration HTTP avec une base isolée couvrant tous les statuts 401/403/404/409/200 ;
- injection d'un échec SQL réel pour constater le rollback ;
- test de concurrence réel avec deux transactions MySQL ;
- recette navigateur réelle ;
- application de la migration sur la base métier ;
- reconstruction ou redémarrage Docker.

Ces vérifications ne sont pas déclarées réussies. Elles nécessitent un environnement isolé ou une autorisation ultérieure distincte.

## 15. Anomalies éventuelles

Le test élargi `frontend/test/dynamic-permissions.test.ts` obtient 7 succès sur 8 et échoue sur `RBAC-04`. L'assertion recherche textuellement `budgetManagementScope=permissionScope('hr.budget.manage')` alors que le fichier RH est formaté avec espaces et guillemets doubles. Cet échec est étranger au lot A.3 et n'est causé par aucun fichier modifié ici. Le module RH n'a pas été modifié.

Aucune anomalie fonctionnelle propre au lot A.3 n'a été détectée par les validations exécutées.

## 16. Réserves

La migration n'étant pas appliquée, la permission n'existe pas encore dans une base d'exécution. Les scénarios transactionnels réels, de concurrence, de rollback et de recette navigateur restent à confirmer sur un environnement MySQL 8.4 isolé après autorisation. L'absence d'indicateur système `SUPER_ADMIN` dans les lignes du tableau empêche une désactivation préventive fiable du bouton côté frontend ; la protection serveur est toutefois complète et reste la référence de sécurité.

## 17. Réponses explicites et verdict

**A. La suppression est-elle indépendante de la révocation ?** Oui. Elle possède une permission, un endpoint, une mutation et un workflow distincts.

**B. La permission est-elle délégable par le RBAC dynamique ?** Oui, après application autorisée de la migration, sans attribution automatique aux rôles personnalisés.

**C. Les scopes sont-ils respectés ?** Oui dans le code serveur : `AGENCY`, `CONCESSION` et `GLOBAL` sont acceptés ; `OWN` est refusé.

**D. Un appareil non révoqué peut-il être supprimé ?** Non. Le contrôle sous verrou et la clause conditionnelle de suppression l'interdisent ; la réponse attendue est 409.

**E. Le step-up est-il obligatoire ?** Oui, pour toute suppression permanente.

**F. L'audit reste-t-il disponible après suppression ?** Oui. Il est écrit avant la suppression dans `audit_logs`, sans dépendance FK vers l'appareil.

**G. Les appareils SUPER_ADMIN restent-ils protégés ?** Oui. Un acteur délégué reçoit une réponse 404 ; le contrôle repose sur le rôle système réel.

**H. Les mécanismes 2FA existants sont-ils préservés ?** Oui selon le diff, les builds et les tests ciblés exécutés. Aucun contrat de connexion, TOTP, récupération, cookie, rotation, expiration ou révocation existante n'a été remplacé.

**Verdict final : VALIDÉ AVEC RÉSERVES.**

L'implémentation et les validations statiques sont cohérentes avec le contrat du lot. La validation complète demeure conditionnée aux tests d'intégration MySQL/HTTP/concurrence et à la recette navigateur dans un environnement isolé, sans toucher à la base métier.
