# Rapport B.3.4.2.1 — Photographies des employés RH

## 1. État initial

La fiche Personnel exposait uniquement `users.avatar_path` par jointure avec le compte ERP. Un employé autonome (`employee_profiles.user_id IS NULL`) ne disposait ni de colonne, ni de stockage, ni de route d’import photographique. L’avatar de remplacement du composant `EmployeeRecordModal` était déjà opérationnel.

## 2. Composants réutilisés

- `DocumentFileDropField`, zone d’import de la GED : dépôt, sélection clavier/souris, remplacement, retrait, validation de type et de taille.
- `documentMultipart`, parseur multipart backend existant.
- `apiRequest` et `apiDownload`, avec authentification, rafraîchissement de session et isolation de session.
- Les contrôles `requirePermission`, `employeePredicate` et `employee(...)` du module RH.
- Le mécanisme d’audit RH et les invalidations TanStack Query existantes.

## 3. Architecture retenue

Une photographie RH est stockée dans le répertoire privé calculé côté serveur `UPLOAD_DIR/private/hr-employees`. La base ne conserve qu’une référence interne générée (`hr-employee-photo:<uuid>.<extension>`), jamais un chemin fourni par le frontend.

Les fichiers ne sont pas exposés par `express.static`. La lecture utilise `GET /hr/employees/:id/photo`, protégée par `hr.employees.view` et le scope territorial de la fiche. L’ajout/remplacement et le retrait utilisent respectivement `POST` et `DELETE` sur la même ressource, protégés par `hr.employees.manage`.

## 4. Modifications frontend

- Ajout facultatif de « Photo de l’employé » dans « Nouvel employé ».
- Réutilisation visuelle et fonctionnelle de la zone d’import GED.
- Prévisualisation ronde avant enregistrement.
- Ajout, remplacement et retrait dans « Modifier employé » lorsque la fiche n’est pas liée.
- Message en lecture seule pour un employé lié : sa photographie est gérée depuis le profil utilisateur.
- Chargement authentifié de la photographie privée dans la fiche Personnel.
- Conservation de l’avatar de remplacement lorsque la photographie est absente ou illisible.

## 5. Modifications backend

- Nouveau stockage borné et privé `hr-employee-photo.ts`.
- Validation JPEG, PNG et WebP par MIME déclaré **et signature binaire**.
- Limite de 3 Mo.
- Nom UUID généré par le serveur et résolution confinée au répertoire privé.
- Routes de lecture, remplacement et suppression avec permission et scope RH.
- Verrouillage transactionnel de la fiche pendant remplacement/suppression.
- Compensation du nouveau fichier si la mise à jour SQL échoue.
- Suppression de l’ancien fichier uniquement après persistance du remplacement.
- Audit `employee.photo_updated` et `employee.photo_removed` sans contenu binaire.

## 6. Modification SQL

La migration additive `096_hr_employee_photos.sql` ajoute `employee_profiles.photo_path VARCHAR(255) NULL`.

Cette migration est nécessaire. Elle ne réalise aucun backfill, ne touche aucune photographie existante et ne modifie aucune relation. Elle n’a pas été exécutée sur une base métier.

## 7. Règles de photographie

- Fiche liée à un compte ERP : `users.avatar_path` est toujours prioritaire et constitue l’unique source affichée.
- Fiche RH autonome : `employee_profiles.photo_path` désigne la photographie privée affichée.
- Aucune copie de l’avatar ERP n’est créée.
- Aucun upload RH n’est accepté tant que `user_id` est renseigné.
- L’absence de photographie n’empêche jamais la création ou la modification du dossier.

## 8. Liaison ultérieure à un compte ERP

La liaison conserve `photo_path`, mais la sélection SQL retourne immédiatement `users.avatar_path`. La photographie RH historique n’est donc ni supprimée, ni fusionnée, ni affichée tant que le compte reste lié. La contrainte et le verrouillage existants empêchant deux fiches pour un même utilisateur sont inchangés.

## 9. RBAC et scopes

- Lecture : `hr.employees.view` avec scopes `OWN`, `AGENCY`, `CONCESSION` ou `GLOBAL` selon la politique RH existante.
- Écriture : `hr.employees.manage` avec la même résolution territoriale.
- Le scope `OWN` ne peut modifier qu’une fiche liée à l’acteur ; il ne donne donc pas accès à la photographie d’une fiche RH autonome.
- Aucun rôle, aucune permission et aucun bypass Super Administrateur n’ont été ajoutés.

## 10. Sécurité et concurrence

Le frontend filtre pour l’ergonomie, mais le backend réexécute toutes les validations. Les signatures binaires empêchent un fichier arbitraire simplement renommé. Les références non gérées sont refusées. Le remplacement conserve l’ancien fichier jusqu’au succès SQL. Une liaison concurrente est détectée après verrouillage et entraîne la suppression compensatoire du nouveau fichier, sans toucher à l’avatar ERP ni à l’ancienne photo RH.

## 11. Tests exécutés et résultats

- Backend ciblé B.3.4.2.1, B.3.4.2.0, administration RH et continuité des migrations : PASS.
- Frontend ciblé B.3.4.2.1 et B.3.4.2.0 : **8 tests PASS, 0 échec** sur le rejeu final ciblé.
- Suite frontend complète : **927 tests PASS, 0 échec, 0 ignoré** (`duration_ms 104809.724829`).
- Lint TypeScript backend : PASS.
- Lint TypeScript frontend : PASS.
- Build backend : PASS.
- Build frontend : PASS.
- Continuité des migrations jusqu’à 096 : PASS via `database-baseline.test.ts`.
- `git diff --check` : PASS.

Les tests couvrent notamment : absence de photo, sélection facultative, aperçu, remplacement, retrait, fallback, formats interdits, dépassement de taille, signature falsifiée, permission/scope, priorité ERP, absence de copie, conservation à la liaison, absence de doublon et non-régression B.3.4.2.0.

## 12. Réserves

- La migration 096 n’a pas été exécutée, conformément à l’interdiction de modifier une base métier.
- Aucun test MySQL réel ni recette navigateur complète n’a été exécuté ; ils restent à effectuer dans l’environnement isolé/final autorisé.
- La création du dossier et l’import facultatif sont deux requêtes successives : si l’import est refusé, le dossier créé reste valide sans photo et aucun fichier orphelin n’est conservé.

## 13. Verdict

Le lot B.3.4.2.1 est implémenté et qualifié au niveau code. Les employés RH autonomes disposent d’une photographie privée gérable, tandis que les collaborateurs ERP continuent d’utiliser exclusivement leur avatar utilisateur. L’activation en environnement nécessite l’application autorisée de la migration additive 096 avant le démarrage du nouveau code.
