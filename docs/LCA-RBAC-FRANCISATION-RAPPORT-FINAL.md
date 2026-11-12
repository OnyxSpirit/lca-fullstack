# ERP LCA — Rapport final de francisation et finalisation RBAC

Date de validation technique : 11 novembre 2026

## Résultat

Le périmètre demandé est implémenté et validé techniquement. L’interface métier ne demande plus de code de rôle, ne rend plus les codes de permissions dans la matrice et ne propose plus les portées historiques `CONCESSION` et `GLOBAL` pour les rôles métier. Les valeurs internes, les routes et le moteur RBAC restent distincts de leur présentation utilisateur.

## Interfaces corrigées

- Administration → Utilisateurs et habilitations.
- Onglet Rôles et permissions et panneau maître-détail existant conservés.
- Création d’un rôle limitée au nom et à la description ; le code est généré côté serveur.
- Matrice des permissions limitée aux libellés fonctionnels, descriptions, activation et périmètre métier.
- Navigation, sécurité du compte et administration de la double authentification harmonisées en français.
- Présentation de `SUPER_ADMIN` sous le libellé « Super Administrateur », sans modifier sa valeur interne ni son statut système.

## Traductions et présentation centralisée

La couche `frontend/src/modules/users/rbac-presentation.ts` centralise :

- `OWN` → « Mes données » ;
- `AGENCY` → « Agence » ;
- les noms de domaines et groupes techniques (`SETTINGS`, `BILLING`, `WORKSHOP`, `INVENTORY`, etc.) ;
- la déduplication des intitulés composites ;
- la présentation du véritable Super Administrateur système.

Les sigles métier consacrés, notamment CRM, SAV et GED, restent utilisés.

## Identifiants techniques masqués

- Les codes de permissions ne sont plus rendus dans la matrice.
- Les codes de rôles ne sont plus affichés dans la liste et la fiche courantes.
- Le formulaire de création ne contient plus de champ de code.
- Les politiques de double authentification distinguent désormais « Rôle système protégé » et « Rôle métier » sans exposer le code technique.
- Les codes restent présents dans les contrats et données internes nécessaires au fonctionnement.

## Périmètres RBAC

Les mutations de rôles métier acceptent uniquement :

- `OWN`, affiché « Mes données » ;
- `AGENCY`, affiché « Agence ».

Le catalogue backend demeure la source de vérité. L’interface intersecte ses valeurs avec ces deux portées métier et n’invente aucune portée. Une valeur historique incompatible est signalée explicitement et n’est jamais convertie silencieusement vers un droit plus large. Le fonctionnement historique ou système qui consomme encore des scopes techniques ailleurs dans l’ERP n’a pas été réécrit arbitrairement.

## Génération des codes de rôles

Le backend génère le code quand le consommateur ne le fournit pas :

1. suppression des accents ;
2. conversion en majuscules ;
3. remplacement des séparateurs et caractères spéciaux par `_` ;
4. nettoyage des séparateurs multiples ;
5. préfixe alphabétique sûr ;
6. limitation de longueur ;
7. suffixes `_2`, `_3`, etc. en cas de collision.

La contrainte SQL unique sur `roles.code` arbitre les créations concurrentes. La boucle de création réessaie avec le suffixe suivant après un doublon. Les noms de rôle identiques sont maintenant autorisés par la migration additive `117_role_name_collisions.sql` ; un index non unique conserve leur recherche efficace. Un code explicitement fourni par un ancien consommateur reste accepté pour compatibilité et conserve le comportement de conflit existant.

Le code n’est généré qu’à la création. Un renommage ne le régénère pas et les codes existants ne sont pas modifiés.

## Modifications backend

- Code de création rendu facultatif.
- Générateur isolé et testé dans `src/modules/users/role-code.ts`.
- Validation stricte des scopes métier `OWN` et `AGENCY` lors des créations et modifications de rôles.
- Migration 117 levant uniquement l’unicité du libellé métier, sans supprimer de rôle ni de donnée.
- Baseline mise en cohérence avec la migration.
- Compatibilité préservée pour les consommateurs envoyant encore explicitement un code.

## Tests et preuves de non-régression

### Frontend

- `npm run lint` : succès.
- `npm run build` : succès, 2 527 modules transformés.
- Suite complète finale `npm test` : **997/997 réussis**, 0 échec, 0 ignoré.
- Tests RBAC de francisation : libellés, regroupements, masquage des codes et création sans code couverts.
- Un test Livraison intermittent a échoué au premier passage, puis a réussi isolément et lors du second passage complet ; aucune modification fonctionnelle Livraison n’a été nécessaire.

### Backend

- `npm run lint` : succès.
- `npm run build` : succès.
- Suite complète : **2 129 tests découverts**, 2 031 réussis, 97 conditionnels ignorés, 1 assertion historique de texte en échec.
- Après correction du contrat de message, reprise ciblée : **43/43 réussis**, incluant édition RBAC, scopes invalides, baseline et génération des codes.
- Tests dédiés du générateur : accents, espaces, caractères spéciaux, longueur, préfixe sûr et suffixes de collision validés.
- `git diff --check` : succès.

## Limites de validation

Les 97 scénarios backend ignorés sont des intégrations conditionnelles qui exigent un environnement MySQL 8.4 jetable ou des services externes non activés dans cette exécution. La migration et la baseline ont été validées statiquement et par les tests du runner disponibles, mais la migration 117 n’a pas été appliquée à une base de production ni à une base métier existante, conformément aux restrictions de la mission.

La recette fonctionnelle humaine dans un navigateur avec des profils réels reste à réaliser par le responsable du projet ; elle ne remplace pas et n’invalide pas la validation automatisée ci-dessus.

## Respect des restrictions

- Aucun commit.
- Aucun push.
- Aucun déploiement.
- Aucune modification de production.
- Aucune suppression de donnée métier ou de volume Docker.
- Toutes les modifications restent non commitées dans l’espace de travail.
