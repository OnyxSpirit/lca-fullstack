# Rapport de correction RBAC et scopes — ERP LCA

Date : 15 octobre 2026  
Périmètre : code source et test MySQL 8.4 isolé. La base métier et les conteneurs applicatifs existants n’ont pas été modifiés.

## 1. Cause initiale

La permission signalée `workshop.vehicle.view` n’existe pas; le code canonique est `workshop.vehicles.view`. Les migrations 071 et 083 avaient créé douze permissions actives sans les attribuer au rôle système `SUPER_ADMIN`. Or `assertDelegablePermissions` interdit à un administrateur de déléguer une permission qu’il ne possède pas avec un scope suffisant. Le blocage était donc déterministe et ne provenait ni du JWT ni du cache.

## 2. Corrections réalisées

- Migration additive 084 attribuant uniquement les douze permissions concernées au rôle `SUPER_ADMIN` authentique (`code='SUPER_ADMIN'`, `is_system=TRUE`, actif).
- Amorçage durable et transactionnel dans le bootstrap : après les migrations, toute permission active absente du rôle système est ajoutée en `GLOBAL` avec `INSERT IGNORE`.
- Aucun bypass ajouté à `requirePermission`, `assertPermission` ou au calcul des droits effectifs.
- Politique centralisée des scopes compatibles côté backend.
- Validation du scope compatible avant toute création ou mise à jour de rôle.
- Catalogue `/permissions` enrichi avec scopes autorisés, délégabilité et scope maximal délégable.
- Interface de rôles pilotée par les métadonnées backend, sans seconde liste de scopes métier.

## 3. Permissions amorcées

Atelier :

- `workshop.vehicles.view`
- `workshop.external_vehicle.create`
- `workshop.vehicle.associations.create`
- `workshop.vehicle.associations.view`
- `workshop.vehicle.associations.close`

Finance :

- `hr.budget.fund.request`
- `hr.budget.fund.request.view`
- `hr.budget.fund.approve`
- `treasury.reservation.submit`
- `treasury.reservation.approve`
- `treasury.reservation.cancel`
- `treasury.reservation.expire`

Aucun rôle métier n’est mentionné ou ciblé par la migration.

## 4. Stratégie future d’amorçage

`ensureSystemPermissionAdministration` s’exécute dans `database-bootstrap.ts` après application des migrations. Il :

1. ouvre une transaction;
2. verrouille et vérifie l’unique rôle actif dont le code est `SUPER_ADMIN` et `is_system=TRUE`;
3. refuse de poursuivre si ce rôle authentique est absent ou ambigu;
4. ajoute avec `INSERT IGNORE` toutes les permissions actives manquantes en `GLOBAL`;
5. conserve toutes les attributions existantes;
6. n’attribue rien aux rôles métier.

Ce mécanisme crée de vraies associations RBAC vérifiables; il ne transforme pas le nom `SUPER_ADMIN` en bypass d’exécution.

## 5. Scopes autorisés

Source unique : `backend-node/src/modules/rbac/permission-scope-policy.ts`.

- Par défaut, une permission dont les routes savent traiter les quatre périmètres expose `OWN`, `AGENCY`, `CONCESSION`, `GLOBAL`.
- Les ressources financières collectives (`treasury.*`, budgets, dépenses, reporting RH, rapprochement et finance fournisseur) exposent `AGENCY`, `CONCESSION`, `GLOBAL`.
- Les configurations explicitement limitées à la concession, notamment modèles de checklist Livraison et types de congé, exposent `CONCESSION`, `GLOBAL`.
- Les autres opérations collectives explicitement identifiées (cachets, certaines configurations Atelier, autorisation financière Livraison) excluent `OWN`.
- `GLOBAL` reste compatible avec toutes les permissions afin de permettre l’administration complète par le rôle système.

La politique ne remplace pas les prédicats territoriaux des routes; elle empêche en amont les scopes que ces routes rejettent explicitement.

## 6. Interface Super Administrateur

Le catalogue affiche toujours le nom métier et le code exact. Pour chaque permission :

- seules les valeurs de `allowedScopes` sont proposées;
- `AGENCY` n’est choisi par défaut que s’il est compatible;
- sinon, le premier scope compatible est utilisé lors d’une nouvelle sélection;
- une attribution historique incompatible est conservée visuellement, signalée en rouge et bloque la sauvegarde jusqu’à décision explicite;
- une permission non délégable reste visible avec une explication;
- les erreurs parlent désormais de permission ou périmètre incompatible.

## 7. Validations backend

Lors de la création ou modification d’un rôle, le serveur contrôle :

- format et unicité du rôle;
- permission existante et active;
- permission `roles.permissions.manage`;
- absence de doublon dans le payload;
- scope appartenant à l’enum;
- compatibilité métier du scope;
- possession de la permission par l’acteur;
- délégation limitée au scope détenu par l’acteur.

Les protections des rôles système, du dernier Super Administrateur, des sessions, des scopes territoriaux et des audits sont conservées.

## 8. Catalogue RBAC

`GET /permissions` renvoie désormais, en plus des champs existants :

- `allowedScopes`;
- `delegable`;
- `maxDelegableScope`.

La délégabilité est calculée depuis le contexte RBAC effectif de l’appelant et l’intersection entre son scope et la politique métier.

## 9. Migration 084

Fichier : `backend-node/database/migrations/084_rbac_system_permission_bootstrap.sql`.

Caractéristiques : additive, ciblée, idempotente et sans modification des migrations 071/083. `ON DUPLICATE KEY UPDATE` préserve le scope d’une attribution déjà existante. La migration n’a pas été appliquée à la base métier.

## 10. Attributions existantes incompatibles

Inventaire effectué par lecture seule de 438 attributions locales. Deux incompatibilités ont été trouvées :

| Rôle | Permission | Scope actuel | Scopes compatibles |
|---|---|---|---|
| `CHARG_TEST` | `delivery.checklist.manage` | `AGENCY` | `CONCESSION`, `GLOBAL` |
| `CHARG_TEST` | `delivery.checklist.view` | `AGENCY` | `CONCESSION`, `GLOBAL` |

Elles n’ont pas été modifiées. Un administrateur habilité devra choisir explicitement un scope compatible ou retirer ces permissions.

## 11. Tests exécutés

- Lint TypeScript backend : succès.
- Lint TypeScript frontend : succès.
- Build backend : succès.
- Build frontend : succès, 2 493 modules transformés.
- Tests backend ciblés : `dynamic-rbac`, `lot14c2-workshop-external-vehicles`, `rbac-role-edit`, `rbac-scope-reliability`, `tres-financial-workflows`, `vehicles-dynamic-rbac` — 6 fichiers réussis, 0 échec.
- Tests frontend `rbac-scope-interface` — succès.
- Migration 084 exécutée deux fois sur MySQL 8.4.11 éphémère — résultat stable : 12 attributions `SUPER_ADMIN`, toutes `GLOBAL`, aucune attribution métier.
- Inventaire de compatibilité sur la base locale — lecture seule.

## 12. Matrice RBAC-01 à RBAC-20

| Scénario | Résultat |
|---|---|
| RBAC-01 Création rôle | Contrôle statique réussi |
| RBAC-02 Permission Atelier | Migration et test ciblé réussis |
| RBAC-03 Permissions financières | Migration et test ciblé réussis |
| RBAC-04 OWN | Politique/test réussi pour droits compatibles |
| RBAC-05 AGENCY | Politique/test réussi |
| RBAC-06 CONCESSION | Politique/test réussi |
| RBAC-07 GLOBAL | Politique/test réussi |
| RBAC-08 Refus incompatible | Test réussi |
| RBAC-09 Délégation Super Admin | Amorçage/test statique réussi; API réelle non exécutée |
| RBAC-10 Acteur non autorisé | Test unitaire réussi |
| RBAC-11 Dernier Super Admin | Protection existante confirmée statiquement |
| RBAC-12 Nouvelle permission amorcée | Bootstrap contrôlé statiquement |
| RBAC-13 Migration idempotente | Double exécution MySQL 8.4 réussie |
| RBAC-14 Aucun rôle métier | Confirmé sur MySQL isolé |
| RBAC-15 Interface filtrée | Test frontend réussi |
| RBAC-16 Permissions effectives | Calcul contrôlé; API réelle non exécutée |
| RBAC-17 Retrait | Mécanisme transactionnel existant confirmé |
| RBAC-18 Atelier | Tests ciblés réussis |
| RBAC-19 RH | Tests financiers ciblés réussis |
| RBAC-20 Treasury | Tests financiers ciblés réussis |

## 13. Anomalies et limites résiduelles

- La politique centralisée encode les incompatibilités explicitement observées dans les routes. Toute nouvelle route qui introduit une restriction particulière devra mettre à jour cette politique et ses tests.
- Les deux attributions `CHARG_TEST` restent incompatibles jusqu’à décision administrative.
- La migration 084 et le bootstrap n’ont pas été exécutés sur la base métier.
- La recette API authentifiée et navigateur avec des rôles réels n’a pas été effectuée, car elle aurait nécessité la migration de la base locale et des écritures RBAC.
- Le bootstrap attribue toutes les permissions actives au seul rôle système authentique. Une permission future ne devant exceptionnellement pas être administrable devra être explicitement désactivée ou faire l’objet d’une politique documentée avant migration.

## 14. Fichiers modifiés ou créés

- `backend-node/database/migrations/084_rbac_system_permission_bootstrap.sql`
- `backend-node/src/modules/rbac/permission-scope-policy.ts`
- `backend-node/src/modules/rbac/rbac.service.ts`
- `backend-node/src/modules/users/user.service.ts`
- `backend-node/src/modules/users/user.routes.ts`
- `backend-node/src/scripts/database-bootstrap.ts`
- `backend-node/test/rbac-scope-reliability.test.ts`
- `frontend/src/api/userHooks.ts`
- `frontend/src/modules/users/RoleManagementPanel.tsx`
- `frontend/test/rbac-scope-interface.test.ts`
- `docs/RAPPORT-CORRECTION-RBAC-SCOPES-LCA.md`

Le rapport d’audit RBAC préexistant a été préservé.

## 15. Verdict final

**CORRECTION IMPLÉMENTÉE ET QUALIFIÉE STATIQUEMENT; MIGRATION MÉTIER EN ATTENTE.**

Le blocage structurel est corrigé sans bypass, sans extension automatique des rôles métier et sans modification silencieuse des scopes historiques. La migration est idempotente sur MySQL 8.4 isolé. Une activation réelle nécessite une autorisation séparée pour appliquer la migration 084, redémarrer le backend avec le nouveau bootstrap et réaliser la recette API/navigation.

Aucun commit, push, tag, reset, restore, stash, clean, changement de branche, rebuild Docker ou déploiement n’a été effectué. L’archive officielle n’a pas été modifiée.
