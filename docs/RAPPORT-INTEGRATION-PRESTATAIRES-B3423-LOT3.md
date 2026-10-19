# RAPPORT — B.3.4.2.3 LOT 3 — Personnel unifié et rattachements multi-agences

Date de qualification : 19 octobre 2026  
Périmètre : LOT 3 exclusivement  
Verdict : **VALIDÉ SUR LE PÉRIMÈTRE TECHNIQUE DU LOT 3, avec recette navigateur transversale reportée au LOT 7**

## 1. Fichiers modifiés pour le LOT 3

- `backend-node/src/modules/hr/hr-provider.routes.ts`
- `frontend/src/modules/hr/HrAdministrationPage.tsx`
- `frontend/src/modules/hr/ProviderProfileModal.tsx`
- `frontend/src/modules/hr/UnifiedPersonnelTable.tsx` (nouveau)
- `backend-node/test/personnel-unified-b3423-lot3.test.ts` (nouveau)
- `backend-node/test/personnel-unified-b3423-lot3-mysql.integration.test.ts` (nouveau)
- `frontend/test/personnel-unified-b3423-lot3.test.ts` (nouveau)
- `frontend/test/provider-profiles-b3423-lot2.test.ts` (adaptation au déplacement des actions dans la liste unifiée)
- `frontend/test/hr-employee-lot10.behavior.test.ts` (adaptation au déplacement des actions salarié dans la liste unifiée)
- `docs/RAPPORT-INTEGRATION-PRESTATAIRES-B3423-LOT3.md` (présent rapport)

Les fichiers non committés issus des LOTS 1 et 2 ont été préservés. Aucun reset, restore, stash, clean, commit, push ou changement de branche n'a été effectué.

## 2. Fonctionnalités réalisées

### Liste Personnel unifiée

- Une seule liste présente les salariés, les prestataires personnes physiques et les prestataires personnes morales.
- L'identité commune `personnel_identities` constitue la racine du résultat : une identité cumulant les qualités salarié et prestataire produit une seule ligne.
- Les catégories affichées sont `Salarié`, `Prestataire` et `Salarié et prestataire`.
- Les fiches métier restent distinctes : `Fiche salarié` et `Fiche prestataire`.
- Les actions historiques de création et de modification salarié sont conservées et soumises à `hr.employees.manage`.
- Recherche, catégorie, statut, agence, pagination et total sont calculés côté serveur.
- Le frontend ne concatène pas deux listes déjà paginées.
- Les mutations invalident les requêtes RH, ce qui actualise la liste unifiée.

### Rattachements multi-agences

- Consultation de tous les rattachements visibles d'un prestataire.
- Ajout transactionnel d'une agence autorisée.
- Suspension motivée d'un rattachement actif.
- Réactivation motivée et contrôlée d'un rattachement suspendu.
- Rejet explicite d'un rattachement en doublon.
- Aucune suppression physique n'est exposée.
- Chaque transition produit une entrée d'audit dédiée.

## 3. Routes ajoutées

- `GET /api/hr/personnel`
  - paramètres : `search`, `category`, `agencyId`, `status`, `page`, `pageSize` ;
  - réponse : `items`, `total`, `page`, `pageSize` ;
  - agrégation par identité, avec relations salarié/prestataire limitées aux permissions effectives.
- `GET /api/hr/providers/:id/assignments`
- `POST /api/hr/providers/:id/assignments`
- `POST /api/hr/providers/:id/assignments/:assignmentId/suspend`
- `POST /api/hr/providers/:id/assignments/:assignmentId/reactivate`

Les routes salariés existantes sont inchangées et restent utilisées par les fiches et le module Salaires.

## 4. Migrations

Aucune migration supplémentaire n'est nécessaire pour le LOT 3. La table `provider_agency_assignments`, ses contraintes, ses index, sa FK agence et l'unicité `(provider_profile_id, agency_id)` existent déjà dans la migration additive 097.

Les migrations historiques 096, 097 et 098 n'ont pas été modifiées. Elles n'ont pas été appliquées à la base métier. Elles ont uniquement été exécutées, dans cet ordre, dans un MySQL 8.4 temporaire isolé.

## 5. Fonctionnement de la liste unifiée

Le backend construit deux vues relationnelles indépendamment filtrées :

1. relation salarié, selon `hr.employees.view` et son scope ;
2. relation prestataire, selon `hr.providers.view` et son scope.

Ces vues sont jointes à `personnel_identities`. Une relation non autorisée reste absente de la réponse, y compris lorsqu'une autre relation de la même identité est visible. Ainsi, une permission prestataire seule ne renvoie ni profil salarié ni donnée salariale. Les filtres `Salariés` et `Prestataires` incluent chacun l'identité mixte, sans la dupliquer dans un résultat. Le total compte les identités visibles, puis `LIMIT/OFFSET` est appliqué à ce même ensemble.

## 6. Règles multi-agences

- L'identité et le profil prestataire restent uniques.
- Chaque agence est une ligne indépendante de `provider_agency_assignments`.
- Une agence cible doit être active et appartenir au scope de gestion de l'acteur.
- La concession de l'agence cible doit être celle de l'identité prestataire.
- L'unicité SQL et le verrouillage `FOR UPDATE` protègent contre les ajouts concurrents et les doublons.
- Un rattachement existant suspendu doit être réactivé ; il ne peut pas être recréé.
- Les transitions ne sont permises que depuis l'état attendu.
- Suspension et réactivation conservent les autres rattachements.

## 7. Contrôles RBAC et confidentialité

- `hr.providers.view` protège la lecture des prestataires et rattachements.
- `hr.providers.manage` protège l'ajout et les transitions.
- `hr.employees.view/manage` continue de protéger la relation salarié.
- Les scopes `AGENCY`, `CONCESSION` et `GLOBAL` sont traduits en prédicats SQL backend.
- `OWN` est explicitement refusé pour les données collectives prestataires.
- Le scope `AGENCY` restreint les rattachements à l'agence de l'utilisateur.
- Le scope `CONCESSION` compare la concession de chaque agence à celle de l'utilisateur.
- La sélection d'une agence cible est revérifiée au backend lors de chaque ajout.
- Aucun salaire, historique de salaire, montant, contrat prestataire, dépense ou rémunération n'est sélectionné par l'agrégateur.
- Le frontend masque les mutations prestataire sans `hr.providers.manage`, mais le backend reste l'autorité.

## 8. Tests exécutés et résultats

### Tests ciblés statiques/contrats

- Backend LOTS 1, 2 et 3 : **3 fichiers PASS**.
- Frontend LOTS 2 et 3 + non-régression RH LOT 10 : **3 fichiers PASS**.
- Couverture vérifiée : identité unique, pagination serveur, filtres, absence de données salariales, scopes, interdiction OWN, absence de suppression physique, audit, actions distinctes, présentation multi-agences et masquage des mutations.

### MySQL 8.4 isolé

Conteneur temporaire : `lca-b3423-lot3-mysql`, port local 33322, données en `tmpfs`, supprimé après la campagne.

- Séquence 096 → 097 → 098 : **PASS**.
- Non-régression MySQL LOT 2 : **1 test PASS**.
- Qualification MySQL LOT 3 : **1 test PASS**.
- Scénarios LOT 3 réellement exécutés : identité mixte salarié/prestataire, trois agences, contrainte anti-doublon, suspension, réactivation, conservation des trois rattachements, une seule identité, une relation salarié et une relation prestataire.

### Qualité et compilation

- Backend `npm run lint` : **PASS**.
- Backend `npm run build` : **PASS**.
- Frontend `npm run lint` : **PASS**.
- Frontend `npm run build` : **PASS**.
- `git diff --check` : **PASS**.

### Suites globales

- Frontend : première campagne **187/188 PASS** ; l'unique échec provenait de deux assertions historiques recherchant les boutons salariés dans l'ancien composant. Les assertions ont été déplacées vers `UnifiedPersonnelTable` sans être assouplies. Campagne complète finale : **188/188 PASS**, 0 échec, 0 skip.
- Backend : la campagne globale lancée dans le bac à sable a rencontré des échecs de fixtures HTTP liés à l'interdiction locale d'écoute réseau (`listen EPERM 0.0.0.0`, puis `supertest` sans port). Ce défaut d'environnement touche des routes sans rapport avec le LOT 3 et ne reproduit pas une erreur métier de l'agrégateur. La campagne a été arrêtée après constat de l'erreur racine ; les tests ciblés, lint, build et tests MySQL isolés restent verts.

## 9. Anomalies et réserves

- La recette navigateur transversale n'est pas incluse : elle reste explicitement prévue au LOT 7.
- Les tests MySQL du LOT 3 valident le modèle, les contraintes et les transitions. Les scénarios HTTP RBAC sont couverts par les contrôles de contrat ciblés ; une campagne HTTP complète exige un environnement autorisant l'écoute locale de `supertest`.
- La liste des agences proposée par le frontend provient du catalogue déjà existant ; toute tentative hors périmètre reste rejetée par le backend.
- Aucun contrat, document GED contractuel, rémunération ou dépense prestataire n'a été ajouté.

## 10. Risques résiduels

- Les futures données propres à une agence devront référencer explicitement le rattachement ou l'agence et ne devront pas être déduites de la seule identité commune.
- Le LOT 4 devra conserver la séparation stricte entre contrat salarié et contrat prestataire.
- Avant activation sur une base métier, les migrations 096–098 devront suivre leur procédure d'autorisation et de sauvegarde dédiée ; cette opération est hors du présent lot.

## 11. Prérequis du LOT 4

- Autorisation explicite distincte.
- Application préalablement autorisée et contrôlée des migrations 096–098 sur l'environnement cible.
- Choix explicite du rattachement agence pour chaque futur contrat prestataire.
- Modèle de contrat séparé des contrats salariés.
- RBAC et audit dédiés aux contrats, sans réutiliser implicitement les permissions salariales.
- Tests de confidentialité inter-agence/inter-concession et stratégie documentaire avant toute GED contractuelle.

## 12. Conclusion

Le LOT 3 fournit une liste Personnel réellement unifiée par identité et une gestion réversible, transactionnelle et auditée des rattachements multi-agences. Aucun schéma supplémentaire n'a été nécessaire et aucune base, donnée, migration ou infrastructure métier n'a été modifiée. Le développement s'arrête à ce périmètre ; le LOT 4 n'est pas commencé.
