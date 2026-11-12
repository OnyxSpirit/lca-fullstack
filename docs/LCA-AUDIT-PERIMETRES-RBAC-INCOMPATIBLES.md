# ERP LCA — Audit des périmètres RBAC incompatibles

Date de clôture technique : 11 novembre 2026  
Environnement de données audité : recette autorisée (`lca_recette`)  
Périmètre : base RBAC, backend Node.js, interface « Rôles et permissions »

## 1. Synthèse et statut

L'anomalie d'interface est corrigée et validée. Une permission métier enregistrée avec une ancienne portée `CONCESSION` ou `GLOBAL` conserve désormais cette valeur dans l'état interne, affiche une alerte en français et propose, sans conversion automatique, uniquement les portées métier encore admises par le catalogue : `OWN` (« Mes données ») et/ou `AGENCY` (« Agence »). L'enregistrement reste impossible tant qu'une incompatibilité subsiste.

L'audit en lecture seule de la recette a trouvé **555 attributions historiques incompatibles** sur neuf rôles métier. Parmi elles, **546 peuvent être corrigées explicitement** vers une portée métier proposée par le catalogue. **Neuf n'ont actuellement aucune portée métier valide** et doivent être retirées des rôles concernés, ou faire l'objet d'une décision de gouvernance backend distincte.

Aucun droit effectif, aucune donnée RBAC et aucune migration n'ont été modifiés en recette. Aucun commit, push ou déploiement n'a été effectué.

## 2. Cause exacte du message

Le backend renvoie légitimement la portée persistée d'un rôle existant afin de ne pas altérer silencieusement ses droits. Il fournit séparément, dans le catalogue, les portées que l'administrateur courant peut déléguer.

Dans l'ancien rendu de `RoleManagementPanel.tsx`, la condition d'incompatibilité était vraie lorsque la portée persistée n'était pas incluse dans `allowedScopes`. Pour `CONCESSION` ou `GLOBAL`, cette branche signalait l'erreur mais rendait la correction impraticable ou ambiguë : l'ancienne valeur pouvait être présentée dans le sélecteur, et certains cas sans option valide bloquaient également la désactivation. L'état incohérent bloquait correctement la sauvegarde, mais l'administrateur ne disposait pas toujours du chemin de correction attendu.

La cause n'est donc ni une conversion automatique du backend, ni la migration 117. C'est la rencontre entre des attributions historiques toujours persistées et le modèle de délégation actuel, aggravée par un rendu frontend incomplet du cas de transition.

## 3. Étendue constatée en recette

### 3.1 Répartition globale des portées

| Portée enregistrée | Nombre d'attributions |
|---|---:|
| `OWN` | 77 |
| `AGENCY` | 103 |
| `CONCESSION` | 226 |
| `GLOBAL` | 329 |

### 3.2 Rôles métier concernés

| Rôle | Ancienne portée | Attributions incompatibles | Corrigeables vers une portée métier | Sans portée métier valide |
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
| **Total** |  | **555** | **546** | **9** |

`RECETTE_AUTONOME` est un rôle métier/de recette et non le rôle système protégé, malgré sa portée historique `GLOBAL`.

### 3.3 Permissions sans portée métier valide

Pour `RECETTE_AUTONOME` :

- `auth.2fa.policy.manage`
- `auth.2fa.settings.manage`
- `auth.2fa.settings.view`
- `delivery.checklist.config.manage`
- `delivery.checklist.config.view`
- `delivery.checklist.manage`
- `delivery.checklist.view`
- `hr.leave.type.manage`

Pour `RESPONSABLE_RH` :

- `hr.leave.type.manage`

L'interface indique désormais qu'il faut désactiver ces permissions pour corriger le rôle. Une autre solution exigerait une décision explicite de politique RBAC ; elle n'a pas été inventée ni appliquée pendant cette mission.

### 3.4 Véritable Super Administrateur

Le rôle système `SUPER_ADMIN` a été distingué des rôles métier. Il possède 2 attributions `OWN` et 327 attributions `GLOBAL`. Ces valeurs ne sont pas classées comme anomalies métier : le rôle est identifié comme système, protégé contre l'édition dans cette interface et conserve son comportement privilégié prévu par le backend.

## 4. Audit backend

- Le catalogue expose `allowedScopes` à partir des métadonnées de délégation calculées pour l'administrateur courant.
- Les anciennes portées restent connues du moteur backend pour la compatibilité d'exécution, les contrôles multi-agences et le véritable rôle système. Elles ne sont pas proposées comme nouvelles portées métier.
- La création et la modification d'un rôle métier valident strictement les nouvelles attributions contre `OWN` et `AGENCY`.
- Le calcul des permissions effectives continue de lire la portée persistée. Il n'existe donc aucune réduction ou extension silencieuse avant la décision administrative.
- Les restrictions multi-agences restent appliquées dans les services d'autorisation ; la correction frontend ne les contourne pas.
- La migration 117 n'est pas appliquée dans la base de recette auditée. Son contenu porte sur l'unicité technique du nom des rôles (suppression d'un index unique puis ajout d'un index non unique) et ne modifie ni les attributions, ni les permissions, ni les portées. Aucune régression RBAC liée à cette migration n'a été identifiée.

Aucune incohérence exigeant une correction backend supplémentaire n'a été confirmée dans ce périmètre.

## 5. Corrections frontend réalisées

Les corrections concernent `RoleManagementPanel.tsx`, `rbac-presentation.ts` et les tests associés :

- filtrage centralisé des options métier sur `OWN` et `AGENCY` ;
- détection explicite d'une portée historique ou non admise par le catalogue ;
- conservation de la valeur historique dans le brouillon pour le diagnostic ;
- valeur visuelle vide « Correction requise… » tant que l'administrateur n'a pas choisi ;
- options limitées aux seules portées autorisées par le backend ;
- libellés entièrement français : « Mes données » et « Agence » ;
- aucune valeur de remplacement choisie ou enregistrée automatiquement ;
- sauvegarde bloquée tant qu'une attribution incompatible demeure ;
- permission non désactivée automatiquement ;
- possibilité de désactiver explicitement une permission historique, y compris lorsqu'aucune portée métier valide n'existe ;
- indication spécifique lorsque l'acteur ne peut pas déléguer la nouvelle portée ;
- rôle système toujours protégé ;
- protection existante contre le changement de rôle avec des modifications non enregistrées conservée.

## 6. Données et migration nécessaires

Une correction des 555 attributions historiques reste nécessaire pour supprimer les alertes de tous les rôles métier. Elle n'a volontairement pas été automatisée, car remplacer `CONCESSION` ou `GLOBAL` par `AGENCY` ou `OWN` modifie les droits effectifs et nécessite une décision métier permission par permission.

Pour les 546 attributions corrigeables, l'administrateur habilité doit choisir explicitement `OWN` ou `AGENCY` selon la responsabilité réelle du rôle. Pour les neuf autres, il doit retirer la permission du rôle ou faire approuver une évolution séparée de la politique de périmètre. Toute future migration éventuelle devra être additive, journalisée, réversible et précédée d'une matrice de décision approuvée.

## 7. Tests et validations

| Validation | Résultat |
|---|---|
| Tests frontend ciblés RBAC/francisation | 10/10 réussis |
| Suite frontend complète | 999/999 réussis, 0 ignoré, 0 échec |
| Lint frontend | réussi |
| Build frontend de production | réussi, 2 527 modules transformés |
| Tests backend ciblés rôles/RBAC | 7/7 réussis |
| Lint backend ciblé | réussi |
| Contrôle `git diff --check` | réussi |

Les cas automatisés couvrent `OWN`, `AGENCY`, `CONCESSION`, `GLOBAL`, l'absence de portée métier valide, `AGENCY` seule, `OWN` + `AGENCY`, la correction explicite et l'absence de repli automatique. Les tests existants couvrent également le rôle métier, la création d'un rôle, le rôle système protégé et la protection contre un changement de rôle non enregistré.

La persistance réelle après actualisation et le recalcul effectif après modification n'ont pas été exécutés en écriture sur la recette, car cela aurait changé des droits sans autorisation. Le chemin de sauvegarde, de rechargement et de calcul backend a été contrôlé par le code et les tests ; la validation fonctionnelle finale sur un rôle de recette devra être réalisée par le responsable autorisé après choix des nouvelles portées.

## 8. Risques résiduels

- Tant que les 555 attributions ne sont pas traitées, les rôles concernés continueront d'utiliser leurs portées historiques pour leurs droits effectifs et l'interface exigera une correction avant toute sauvegarde du rôle.
- Une conversion uniforme vers `AGENCY` pourrait être trop large pour certaines permissions et une conversion vers `OWN` trop restrictive pour d'autres ; aucun choix automatique n'est sûr.
- Les neuf permissions sans portée métier valide révèlent une décision de gouvernance incomplète, pas un défaut que l'interface peut résoudre seule.
- La migration 117 restant absente de la recette, son application future devra suivre le processus normal de migration et de validation, même si son contenu n'affecte pas les portées.

## 9. Actions restant à l'administrateur

1. Valider une matrice rôle/permission décidant `OWN`, `AGENCY` ou retrait pour chaque attribution historique.
2. Corriger explicitement les 546 attributions pour lesquelles l'interface propose une portée métier valide.
3. Retirer les neuf permissions sans portée valide, ou faire approuver une évolution backend séparée.
4. Actualiser la page et vérifier la persistance sur un rôle pilote autorisé.
5. Ouvrir une session avec un utilisateur pilote et vérifier les permissions effectives et le cloisonnement d'agence.
6. Appliquer ensuite la même procédure aux autres rôles, avec traçabilité et contrôle avant/après.

## 10. Conclusion

La cause technique du blocage frontend est résolue sans élargissement de droits et sans réintroduction de `CONCESSION` ou `GLOBAL` dans les sélecteurs métier. Le logiciel permet maintenant la correction manuelle attendue et refuse toute sauvegarde ambiguë. La partie restante est une décision administrative sur les droits effectifs historiques ; elle ne peut ni ne doit être exécutée automatiquement dans le cadre des restrictions de cette mission.
