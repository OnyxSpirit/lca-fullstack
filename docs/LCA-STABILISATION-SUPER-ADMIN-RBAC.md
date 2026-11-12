# ERP LCA — Stabilisation RBAC du Super Administrateur

Date : 11 novembre 2026

## 1. Cause exacte

Le backend distinguait déjà correctement le véritable rôle système avec `roles.is_system=TRUE`, le code réservé `SUPER_ADMIN` et les protections de mutation associées. Le calcul des permissions effectives du compte système conservait également ses attributions natives.

L'anomalie se trouvait dans `RoleManagementPanel.tsx` :

- `hasIncompatibleScope` évaluait toutes les portées du brouillon selon les règles de présentation des rôles métier avant de vérifier le statut système du rôle sélectionné ;
- chaque ligne calculait également `bad=isIncompatibleBusinessScope(...)` pour le rôle système ;
- `GLOBAL` ou `CONCESSION` déclenchait donc le message « Ancien périmètre incompatible » ;
- la ligne étant non modifiable lorsque `selected.is_system` était vrai, `canCorrect` devenait faux et provoquait le second message sur une prétendue insuffisance de droits.

Il ne s'agissait pas d'une perte de privilèges backend : l'interface appliquait à tort une politique de correction métier à un rôle système correctement protégé.

## 2. Différence entre rôle système et rôles métier

### Véritable Super Administrateur

- identifié par les métadonnées fiables `is_system` et le rôle système réservé ;
- permissions natives calculées par le moteur RBAC ;
- attributions historiques `GLOBAL`/`CONCESSION` conservées ;
- rôle non modifiable, non désactivable et non supprimable depuis l'interface métier ;
- aucune normalisation vers `OWN` ou `AGENCY`.

### Rôles métier

- nouvelles portées limitées visuellement à `OWN` (« Mes données ») et `AGENCY` (« Agence ») ;
- anciennes portées signalées comme incompatibles ;
- correction explicite uniquement vers une valeur admise par le catalogue backend ;
- sauvegarde bloquée tant qu'une incohérence demeure ;
- aucune conversion, désactivation ou élévation automatique.

## 3. Correction frontend

Fichier modifié : `frontend/src/modules/users/RoleManagementPanel.tsx`.

- `hasIncompatibleScope` est maintenant désactivé lorsque le rôle sélectionné est système ;
- le calcul de ligne `bad` est réservé aux rôles non système ;
- les avertissements de délégation insuffisante et d'absence de portée métier ne sont jamais rendus pour le rôle système ;
- les permissions système sont présentées en lecture seule ;
- chaque permission affiche « Privilège système natif · lecture seule » ;
- l'en-tête affiche « Rôle système protégé — Accès administrateur complet » ;
- aucun sélecteur modifiable n'est rendu pour le rôle système ;
- les protections de modification, suppression et désactivation restent inchangées.

Quand un véritable Super Administrateur consulte un rôle métier historique, le rôle consulté reste soumis aux règles métier. Le catalogue backend détermine la délégabilité, le frontend propose uniquement `OWN`/`AGENCY`, et la correction demeure explicite.

## 4. Audit backend

Fichiers contrôlés :

- `backend-node/src/modules/rbac/agency-rbac.service.ts` ;
- `backend-node/src/modules/rbac/rbac.service.ts` ;
- `backend-node/src/modules/rbac/permission-scope-policy.ts` ;
- `backend-node/src/modules/users/user.service.ts` ;
- `backend-node/src/modules/users/user-access.ts`.

Constats :

- le Super Administrateur réel est déterminé par une jointure vers un rôle actif `SUPER_ADMIN` avec `is_system=TRUE`, et non par son nom affiché ;
- son contexte effectif utilise les attributions du rôle système ;
- le catalogue est construit à partir de la politique de portées et du contexte de délégation réel ;
- les rôles système sont protégés contre la modification, le statut et la suppression ;
- un rôle système ne peut pas être attribué comme rôle local d'agence ;
- un nom ressemblant à « Super Administrateur » ne confère aucun privilège.

Aucune correction backend n'était nécessaire dans le périmètre de cette anomalie.

## 5. Données et privilèges

- aucune ligne RBAC modifiée ;
- aucune portée convertie ;
- aucune permission désactivée ou supprimée ;
- aucun script de normalisation exécuté ;
- aucune modification des 555 attributions historiques métier ;
- aucune modification des privilèges natifs du Super Administrateur.

## 6. Tests

| Validation | Résultat |
|---|---|
| Tests frontend RBAC ciblés | 20/20 réussis |
| Tests backend ciblés protection/contexte | réussis, 0 échec |
| Lint frontend | réussi |
| Build frontend | réussi, 2 527 modules transformés |
| Suite frontend complète | 1 005/1 005 réussis, 0 échec, 0 ignoré |
| `git diff --check` | réussi, aucune erreur d'espacement |

Les tests ajoutés vérifient explicitement :

- l'exclusion du rôle système de `hasIncompatibleScope` ;
- l'absence des deux avertissements métier pour ce rôle ;
- l'indicateur système en français ;
- la lecture seule des privilèges natifs ;
- le maintien du parcours de correction explicite pour les rôles métier ;
- le respect des options fournies par le catalogue backend.

## 7. Comportement final

### Consultation de `SUPER_ADMIN`

Les permissions sont visibles en lecture seule, sans faux message d'incompatibilité, sans invitation à les désactiver et sans sélecteur laissant croire qu'une correction manuelle est nécessaire.

### Consultation d'un rôle métier par le Super Administrateur

Une portée historique reste signalée. Si `OWN` ou `AGENCY` est admis et délégable, le Super Administrateur peut sélectionner explicitement la nouvelle portée. Les anciennes valeurs ne sont pas proposées et les validations serveur restent autoritaires.

### Administrateur non système

Les métadonnées `delegable` et `allowedScopes` continuent de borner les choix. Aucun droit supplémentaire n'est accordé et le véritable rôle système reste non modifiable.

## 8. Risques résiduels et opérations restantes

- Une validation fonctionnelle manuelle avec le véritable compte système reste du ressort du responsable de recette.
- Les données historiques des rôles métier restent à traiter dans le processus séparé de normalisation approuvée.
- Aucun déploiement n'a été effectué ; la correction devra suivre le processus normal de livraison.

## 9. Conclusion

Les deux messages étaient de faux avertissements frontend, sans incidence sur le moteur d'autorisation. La correction distingue désormais explicitement le rôle système protégé des rôles métier, sans masquer les véritables incompatibilités de ces derniers et sans toucher aux données ou aux privilèges du Super Administrateur.
