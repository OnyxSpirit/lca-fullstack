# ERP LCA — Finalisation multi-agences et normalisation RBAC

Date : 11 novembre 2026

## 1. Résultat exécutif

Le formulaire de création ne repose plus sur un sélecteur unique « agence + rôle ». Il permet de cocher plusieurs agences actives, de désigner l'agence principale et de cocher plusieurs rôles métier distincts pour chaque agence. Le backend enregistre l'ensemble dans une transaction unique dans les tables existantes `user_agencies` et `user_agency_roles`.

La modification d'un utilisateur présente les mêmes affectations sous forme de cases à cocher. L'ajout, la réactivation, le retrait et les changements de rôles sont explicites. Une agence inactive ne peut pas être nouvellement attribuée ; une affectation historique inactive reste visible.

Le sélecteur de la barre de navigation utilise désormais le contexte backend autoritaire. Un changement d'agence recalcule les rôles et permissions, purge les caches du contexte précédent et resynchronise la session temps réel.

La correction frontend des anciennes portées reste active. Un mécanisme manuel de normalisation RBAC a été préparé hors du runner automatique. Aucune attribution historique n'a été convertie dans la recette.

## 2. Modifications frontend

### Création d'un utilisateur

Composant concerné : `frontend/src/modules/users/UsersManagementPage.tsx`.

- section « Agences d'affectation » ;
- une case à cocher par agence active et éligible ;
- sélection d'une ou plusieurs agences ;
- choix explicite de l'agence principale par bouton radio ;
- cases à cocher pour un ou plusieurs rôles métier dans chaque agence ;
- exclusion des rôles système de la sélection locale ;
- validation française lorsqu'aucune agence ou aucun rôle n'est sélectionné ;
- envoi d'un contrat `agencyAssignments[]` au backend.

Les listes déroulantes d'affectation initiale ont été supprimées.

### Modification d'un utilisateur

Composant concerné : `frontend/src/modules/users/UserAgencyAssignments.tsx`.

- toutes les agences visibles dans le périmètre de l'administrateur sont présentées par cases à cocher ;
- les affectations existantes sont rechargées depuis l'API ;
- les rôles de chaque agence sont présentés par cases à cocher ;
- une désactivation d'affectation ou un retrait de rôle nécessite une action explicite ;
- l'agence principale historique reste protégée contre une désactivation incompatible avec le backend actuel ;
- les agences inactives sont identifiées et ne sont pas proposées comme nouvelles affectations ;
- les erreurs API sont affichées en français.

Les opérations de modification réutilisent les routes existantes d'ajout, statut, ajout de rôle et retrait de rôle. Aucune architecture parallèle n'a été créée.

### Contrats API frontend

`frontend/src/api/userHooks.ts` expose maintenant `UserAgencyInput` et accepte :

```text
agencyAssignments: [{ agencyId, roles[], isPrimary }]
```

Les invalidations existantes des utilisateurs, annuaires, techniciens et données RH sont conservées.

## 3. Backend multi-agences

Composants concernés :

- `backend-node/src/modules/users/user.service.ts` ;
- `backend-node/src/modules/users/user-access.ts`.

La création :

1. exige au moins une agence et un rôle métier par agence ;
2. refuse les doublons d'agence et de rôle ;
3. exige exactement une agence principale ;
4. contrôle `users.create`, `users.assign_agency` et `users.assign_role` ;
5. contrôle chaque agence dans le périmètre de l'acteur ;
6. refuse une agence inactive ou inexistante ;
7. refuse le rôle système dans une affectation d'agence ;
8. vérifie que chaque rôle est actif et délégable ;
9. crée le compte et toutes ses affectations dans une transaction unique ;
10. journalise la matrice d'affectation créée.

La compatibilité avec le champ historique `users.agency_id` est conservée pour l'agence principale, sans en faire la source des permissions effectives.

## 4. Sélecteur d'agence de la barre de navigation

Composants concernés :

- `frontend/src/components/layout/Header.tsx` ;
- `frontend/src/stores/authStore.ts` ;
- `frontend/src/services/realtime.ts` ;
- backend existant `PUT /rbac/agency-context`.

Le nouveau flux est :

1. envoi de l'agence choisie au backend ;
2. validation de l'affectation active ;
3. mise à jour de `refresh_tokens.active_agency_id` et de la version de contexte ;
4. recalcul backend des rôles et permissions applicables ;
5. purge complète du cache TanStack Query et de l'état UI contextuel ;
6. remplacement local des rôles, permissions et agence active par la réponse backend ;
7. resynchronisation des salons temps réel ;
8. rechargement ultérieur des données dans le nouveau contexte.

La liste de la navbar provient de `/rbac/agencies`, donc uniquement des agences accessibles au compte connecté. Le répertoire général ne peut plus élargir cette liste.

## 5. Matrice des attributions historiques

Les chiffres ci-dessous reprennent l'audit en lecture seule de la recette précédemment validé. Le rôle système est volontairement séparé.

| Rôle métier | Ancienne portée | Total | Au moins une cible métier | Sans cible métier |
|---|---|---:|---:|---:|
| `DIRECTION` | `CONCESSION` | 10 | 10 | 0 |
| `RESPONSABLE_COMMERCIAL` | `CONCESSION` | 40 | 40 | 0 |
| `COMPTABLE` | `CONCESSION` | 15 | 15 | 0 |
| `RESPONSABLE_FINANCIER` | `CONCESSION` | 55 | 55 | 0 |
| `RESPONSABLE_SAV` | `CONCESSION` | 29 | 29 | 0 |
| `RESPONSABLE_PIECES` | `CONCESSION` | 26 | 26 | 0 |
| `RESPONSABLE_RH` | `CONCESSION` | 47 | 46 | 1 |
| `REC11_TRANSFERT_INTERAGENCES` | `CONCESSION` | 4 | 4 | 0 |
| `RECETTE_AUTONOME` | `GLOBAL` | 329 | 321 | 8 |
| **Total métier** |  | **555** | **546** | **9** |

La matrice exhaustive ligne par ligne est produite par `backend-node/src/scripts/export-rbac-scope-normalization-matrix.ts` à partir de `role_permissions`, `roles`, `permissions` et de la politique backend courante. Elle fournit exactement les colonnes rôle, permission, ancienne portée, portées métier autorisées, cible proposée et impact. Une nouvelle extraction ligne par ligne de la recette n'a pas été exécutée pendant ce lot, l'accès de lecture à cette base n'ayant pas été autorisé par l'environnement d'exécution. Les chiffres ci-dessus sont ceux du contrôle de recette antérieur, déjà documenté dans `LCA-AUDIT-PERIMETRES-RBAC-INCOMPATIBLES.md`.

### Règle de décision implémentée

| Situation catalogue | Cible proposée | Impact |
|---|---|---|
| `AGENCY` autorisé | `AGENCY` candidate | Réduction de `CONCESSION`/`GLOBAL` vers l'agence active ; validation administrative requise |
| `AGENCY` interdit, `OWN` autorisé | `OWN` ou retrait | Réduction aux données personnelles ; décision métier requise |
| ni `OWN` ni `AGENCY` | retrait ou revue de politique | aucune conversion automatique sûre |
| rôle système | aucune modification | protection intégrale |

Cette décision est centralisée dans `historicalScopeDecision` et dérivée de `allowedScopesForPermission` : aucune liste concurrente de portées n'est inventée.

### Exceptions sans portée métier valide

`RECETTE_AUTONOME` :

- `auth.2fa.policy.manage`
- `auth.2fa.settings.manage`
- `auth.2fa.settings.view`
- `delivery.checklist.config.manage`
- `delivery.checklist.config.view`
- `delivery.checklist.manage`
- `delivery.checklist.view`
- `hr.leave.type.manage`

`RESPONSABLE_RH` :

- `hr.leave.type.manage`

Le rôle système `SUPER_ADMIN` est exclu de toute proposition et de toute application.

## 6. Mécanisme de normalisation préparé

Fichiers :

- `backend-node/database/manual/rbac_scope_normalization.sql` ;
- `backend-node/database/manual/README.md`.

Le mécanisme :

- se trouve hors du répertoire de migrations automatiques ;
- inventorie les portées historiques ;
- enregistre un lot et chaque décision ;
- exige `approved=TRUE` ;
- contrôle que la portée courante correspond encore à la portée auditée ;
- exclut `roles.is_system=TRUE` ;
- applique uniquement `OWN` ou `AGENCY` ;
- marque chaque ligne appliquée ;
- est idempotent par clés uniques et indicateur `applied` ;
- permet la restauration vers la valeur historique du même lot ;
- ne touche aucune donnée métier.

Le fichier n'a pas été exécuté sur la recette. Sa validation MySQL sur une base jetable reste à réaliser dans un environnement autorisant la connexion au moteur Docker.

## 7. Frontend RBAC historique

Le comportement corrigé lors du lot précédent est conservé :

- `OWN` apparaît sous « Mes données » ;
- `AGENCY` apparaît sous « Agence » ;
- `CONCESSION` et `GLOBAL` ne sont jamais proposés aux rôles métier ;
- la valeur historique reste dans le brouillon jusqu'à une action explicite ;
- l'enregistrement est bloqué si une incohérence subsiste ;
- aucune permission n'est convertie ou retirée automatiquement ;
- une permission sans cible valide peut être désactivée explicitement ;
- le véritable Super Administrateur reste protégé.

## 8. Validations techniques

| Contrôle | Résultat |
|---|---|
| TypeScript frontend | réussi |
| TypeScript backend | réussi |
| Build frontend | réussi, 2 527 modules |
| Build backend | réussi |
| Tests ciblés multi-agences/RBAC frontend | réussis |
| Tests ciblés multi-agences/RBAC backend | réussis |
| Tests d'isolation de session et concurrence agence | réussis |
| Suite frontend complète | 1 003/1 003 réussis, 0 ignoré, 0 échec |
| Suite backend ciblée multi-agences/RBAC | 4 fichiers de tests réussis, 0 échec |
| Suite backend globale | tentative non concluante : plusieurs tests d'intégration hors périmètre ont échoué puis laissé des ressources ouvertes ; exécution interrompue, sans régression ciblée reproduite |
| Validation SQL jetable | non exécutée : accès MySQL non autorisé dans ce lot |

## 9. Risques résiduels et opérations à autoriser

1. Autoriser l'extraction ligne par ligne de la matrice sur la recette et figer son empreinte avant décision.
2. Faire valider chaque cible `AGENCY`, chaque choix `OWN` et chaque retrait par le responsable habilitations.
3. Tester le SQL manuel sur une base MySQL jetable avec une copie des seules tables RBAC nécessaires.
4. Exécuter une recette fonctionnelle : création multi-agences, actualisation, connexion du compte créé, bascule d'agence et contrôle des menus/données.
5. Autoriser séparément l'application du lot approuvé en recette ; cette mission ne l'a pas fait.
6. Contrôler avant/après les permissions effectives et conserver le lot de restauration.

## 10. État des travaux

- **Implémenté :** cases à cocher multi-agences et multi-rôles, contrat transactionnel de création, modification explicite, bascule autoritaire de navbar, purge des caches, resynchronisation temps réel, politique de décision RBAC.
- **Testé :** compilation, builds, contrats ciblés, isolation de session, comportement RBAC frontend.
- **Préparé :** export exhaustif de matrice et SQL manuel idempotent/restaurable.
- **À valider administrativement :** choix de cible pour les 555 attributions historiques.
- **Non exécuté :** conversion de droits en recette, déploiement, commit, push et recette fonctionnelle responsable projet.
