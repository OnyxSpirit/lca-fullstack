# Rapport B.3.4.2.0 — Régression Collaborateurs / RH

## 1. Fonctionnement historique retrouvé

Le commit `2ca72fa5b8f3dbe8b10565c8f75cc524c8a1383e` (`correctif global`) introduisait une intégration explicite dans la modale Utilisateurs & Habilitations :

- choix « Employé de l’entreprise » Oui/Non ;
- section visible uniquement avec `hr.employees.manage` ;
- matricule facultatif avec génération automatique ;
- fonction RH ;
- date d’embauche ;
- statut RH `active`, `inactive` ou `departed` ;
- création ou mise à jour transactionnelle de `employee_profiles` via `user_id` ;
- passage à Non conservant la fiche et la marquant `departed` ;
- journalisation utilisateurs et RH.

La création d’un employé directement depuis RH restait un parcours distinct. L’intégration Collaborateurs ne créait ni second utilisateur ni second profil pour un `user_id` déjà lié.

## 2. Commits et fichiers pertinents

### Introduction

Commit `2ca72fa5b8f3dbe8b10565c8f75cc524c8a1383e` :

- `frontend/src/modules/users/UsersManagementPage.tsx` ;
- `frontend/src/api/userHooks.ts` ;
- `backend-node/src/modules/users/user.service.ts` ;
- `backend-node/src/modules/hr/hr-employee.service.ts`.

### Suppression responsable de la régression

Commit `33c0da9eba04f212be5593405cafaf0d670cbf42` (`Lot-10`) :

- suppression complète de `backend-node/src/modules/hr/hr-employee.service.ts` ;
- retrait des champs RH de `CreateUserPayload` ;
- retrait de la section RH de `UsersManagementPage.tsx` ;
- retrait de `syncEmployeeProfile` des créations et modifications utilisateurs ;
- retrait du contrôle `hr.employees.manage` et de l’audit RH associé.

La disparition n’est donc pas une hypothèse : elle correspond à un diff Git explicite. Le Lot-10 rendait parallèlement les profils RH autonomes des comptes ERP via la migration 064. Cette évolution de schéma devait être préservée lors de la restauration.

## 3. État avant correction

Le backend conservait encore :

- la jointure `users` / `employee_profiles` par `employee_profiles.user_id` ;
- les champs `isEmployee`, `employeeProfileId`, matricule, fonction, date et statut dans les réponses utilisateurs ;
- la relation unique `employee_profiles.user_id` ;
- la photographie RH provenant dynamiquement de `users.avatar_path` ;
- les routes RH autonomes de création, modification, liaison et dissociation.

En revanche, l’API utilisateurs ignorait tout payload RH et le frontend ne pouvait plus le produire. La régression concernait donc à la fois l’affichage frontend, le contrat API, le traitement backend et la synchronisation transactionnelle. Elle ne concernait pas la lecture RH ni la source de photographie.

## 4. Correction effectuée

La section historique a été restaurée dans la modale actuelle sans remettre en cause l’autonomie RH du Lot-10.

Le nouveau service ciblé `hr-employee-sync.service.ts` :

- détecte uniquement les champs RH historiques ;
- exige `hr.employees.manage` et vérifie son scope territorial ;
- verrouille la fiche existante par `user_id` ;
- crée une seule fiche avec `user_id`, concession, agence et identité actuelles ;
- met à jour la fiche existante au lieu d’en créer une seconde ;
- conserve le matricule existant lorsqu’aucune nouvelle valeur n’est fournie ;
- utilise la fonction ERP comme valeur par défaut de fonction RH ;
- marque la fiche `departed` lors du passage à Non, sans suppression ni dissociation ;
- réactive explicitement à `active` lorsqu’une ancienne fiche sortie repasse à Oui ;
- écrit les traces utilisateurs et RH dans la transaction existante.

Le formulaire propose les quatre champs historiquement démontrés : matricule, fonction RH, date d’embauche et statut RH. Aucun champ RH supplémentaire n’a été inventé.

## 5. Photographie

Aucune colonne, route d’import ou copie de photographie RH n’a été ajoutée. La fiche Personnel charge toujours `u.avatar_path` par `LEFT JOIN users u ON u.id=ep.user_id`. Une modification de la photographie ERP est donc reflétée après invalidation/rechargement RH, sans second stockage.

Les employés créés directement dans RH restent sans fonctionnalité d’import photographique spécifique, conformément au périmètre.

## 6. RBAC et sécurité

- Les permissions utilisateurs existantes restent inchangées.
- La section RH n’est visible qu’avec `hr.employees.manage`.
- Le backend refuse aussi un payload RH sans cette permission.
- Les scopes `AGENCY`, `CONCESSION` et `GLOBAL` sont contrôlés sur l’agence du collaborateur ; `OWN` n’autorise pas cette gestion collective.
- Les protections du Super Administrateur, l’attribution de rôles, les sessions, la 2FA et la Matrice RBAC n’ont pas été modifiées.
- Aucune permission, aucun rôle et aucune migration n’ont été ajoutés.

## 7. Fichiers modifiés

- `backend-node/src/modules/hr/hr-employee-sync.service.ts`
- `backend-node/src/modules/users/user.service.ts`
- `backend-node/test/collaborator-hr-regression-b3420.test.ts`
- `backend-node/test/hr-administration.test.ts`
- `frontend/src/api/userHooks.ts`
- `frontend/src/modules/users/UsersManagementPage.tsx`
- `frontend/test/collaborator-hr-regression-b3420.test.ts`
- `frontend/test/hr-administration.test.ts`
- `frontend/test/hr-employee-lot10.behavior.test.ts`

## 8. Tests exécutés

- Backend ciblé B.3.4.2.0, contrat photographie, administration RH, RBAC utilisateurs, concurrence utilisateurs et conformité : **6 fichiers PASS, 0 échec**.
- Frontend ciblé B.3.4.2.0, administration RH et non-régression Lot-10 : **3 fichiers PASS, 0 échec**.
- Suite frontend complète : **923 tests PASS, 0 échec, 0 ignoré** (`duration_ms 104732.820623`).
- Lint TypeScript backend : PASS.
- Build backend : PASS.
- Lint TypeScript frontend : PASS.
- Build Vite frontend : PASS.
- `git diff --check` : PASS.

Les scénarios couvrent : création liée, identité territoriale, fonction, mise à jour sans doublon, passage à Non sans suppression, source photographique ERP, permission backend, champs conditionnels et invalidation du cache Personnel.

## 9. Réserves

- Aucune base métier, aucun conteneur et aucun volume n’ont été modifiés.
- La recette navigateur complète et une intégration MySQL réelle restent reportées à la campagne finale, comme demandé.
- Le passage Oui vers Non reprend la règle historique démontrée (`employment_status='departed'`). La fiche et son historique sont conservés et le lien ERP n’est pas supprimé automatiquement.

## 10. Verdict

La cause Git est identifiée avec précision et la fonctionnalité historique est restaurée en compatibilité avec le modèle RH autonome actuel. Le correctif est qualifié côté code et tests ciblés, sans extension du périmètre RBAC ni gestion de photographies RH indépendantes.
