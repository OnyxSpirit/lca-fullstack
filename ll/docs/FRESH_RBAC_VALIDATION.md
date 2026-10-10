# Fresh install RBAC — 15 septembre 2026

## Résultat fonctionnel

La nouvelle installation crée exactement **Super Administrateur / SUPER_ADMIN / is_system=1 / is_active=1**.
`SELECT COUNT(*) FROM roles` retourne **1** avant toute création de rôle métier.

Les 12 rôles retirés du seed actif sont DIRECTOR, SALES_MANAGER, SALES_AGENT,
RECEPTIONIST, SERVICE_MANAGER, SERVICE_ADVISOR, WORKSHOP_MANAGER, TECHNICIAN,
PARTS_MANAGER, WAREHOUSE_CLERK, DELIVERY_MANAGER et ACCOUNTANT.
Les archives SQL 001–033 restent inchangées.

Les 12 instructions de définition du catalogue sont identiques avant/après.
Comparaison sur deux bases MySQL **8.4.11** : **142 → 142 permissions**, zéro code
manquant ou ajouté. Une seule requête, après le catalogue complet, affecte toutes
les permissions actives au rôle SUPER_ADMIN système actif, avec scope GLOBAL.
La base fraîche contient **142 affectations GLOBAL**. Les quatre scopes sont inchangés.
Le schéma consolidé, ses 83 tables et les migrations futures ne sont pas modifiés.

## Changements de cette mission

- `backend-node/database/seeds/001_system_seed.sql` : un seul rôle ; retrait de toutes les affectations historiques ; affectation générique finale.
- `backend-node/src/scripts/seed-admin.ts` : exige aussi `is_system=TRUE` et `is_active=TRUE`.
- `backend-node/src/modules/users/user.service.ts` : évite `IN ()` lors du retrait de toutes les permissions.
- `backend-node/src/modules/core/core.routes.ts` : PDF vente protégé par `sales.view` et le contrôle de scope existant du service ventes, sans noms de rôles.
- `frontend/src/types/index.ts` : accepte les codes personnalisés sans extension d’enum.
- `frontend/src/stores/authStore.ts` : conserve les codes du serveur ; aucun remplacement par RECEPTIONIST.
- `frontend/src/navigation/permissions.ts` : explicite le statut historique de la matrice conservée.
- Tests : `database-baseline.test.ts`, `rbac-dynamic-role-runtime.test.ts`, `super-admin-system.test.ts`, `fresh-rbac.integration.py`, `fresh-rbac.compose.yml`.
- Documentation : README racine, README backend, README Database, `docs/RBAC_MATRIX.md` et ce rapport.
- Artefacts JavaScript correspondants régénérés par le build backend, sans restauration des modifications antérieures.

## Recette réelle

- Docker : MySQL neuf, baseline puis seed, bootstrap VERSIONED 033 ; backend et frontend démarrés.
- Deuxième base vide : le vrai bootstrap retourne EMPTY, niveau 033 ; 1 rôle et 142 permissions.
- Base historique jetable chargée avec le seed avant modification : 13 rôles avant et après le bootstrap VERSIONED ; aucun nettoyage.
- Seed-admin exécuté plusieurs fois : un seul compte administrateur et son affectation système. Compte désactivé dans la base jetable puis réactivé par seed-admin : 1 administrateur actif.
- API réelle : rôle TEST_COMMERCIAL_DYNAMIC créé avec dashboard.view, crm.prospect.view et crm.prospect.create ; utilisateur créé et affecté ; dashboard et CRM accessibles, ventes et administration refusées.
- Ajout explicite de crm.prospect.update pour devenir propriétaire CRM, conformément à la règle existante. OWN masque les prospects d’autrui ; AGENCY voit ceux de son agence et masque ceux d’une seconde agence, y compris en accès direct.
- Renommage en DIRECTOR sans ajout de privilège ; retrait complet des permissions révoque immédiatement les accès avec le même jeton ; réattribution rétablit les accès ; désactivation du rôle les retire.
- Dernier SUPER_ADMIN : réaffectation à un rôle métier refusée par l’API (409).
- Création API du code réservé SUPER_ADMIN et modification du rôle système refusées (403).
- Faux SUPER_ADMIN : test du vrai résolveur avec ligne persistée simulée `is_system=0`, sans contourner l’unicité SQL ; aucun bypass. Le même code système bénéficie du bypass.
- Navigation : tests de permissions serveur, ajout/retrait immédiat et rôle inconnu ; aucune enum requise. Pas de recette manuelle du navigateur.
- HTTP frontend : 200 ; `/api/health` : `status=ok`.

## Validation technique et limites

- Backend lint et build : succès.
- Frontend lint et build : succès ; avertissement Vite existant sur la taille du bundle.
- Tests ciblés backend : **41/41** (baseline, RBAC dynamique, délégation, utilisateurs, PDF vente, faux SUPER_ADMIN).
- Tests ciblés frontend : **30/30** (permissions et navigation).
- `git diff --check` : succès.
- Suites complètes exploratoires : backend **449/589**, frontend **231/240**. Elles ne sont donc pas entièrement vertes. Aucun abaissement des contrôles métier n’a été effectué pour les satisfaire.

### Classement des tests historiques

**A — toujours valides.** Baseline unique, intégrité du catalogue, scopes, délégation,
protection du rôle système et règles métier indépendantes du seed. Les tests ciblés
ci-dessus passent. Les règles métier restent applicables même si un ancien montage
de test ne sait plus fournir le contexte RBAC requis.

**B — noms de rôles comme fixtures.** Les tests donnant explicitement permissions
et scopes à DIRECTOR, SALES_AGENT, RECEPTIONIST, etc. restent valides. Les matrices
historiques testées isolément ne constituent pas le runtime de navigation.

**C — assertions historiques obsolètes.** L’assertion du seed exigeant DIRECTOR a été
remplacée par l’absence des 12 rôles historiques et l’affectation générique système.
Des assertions textuelles sur l’ancien câblage de composants restent en dette
(commercial-workflow, concession-workflow, CRM, service et retour d’essai notamment).
Elles n’ont pas été réécrites artificiellement pour rendre la suite verte.

**D — montages incompatibles avec le contexte dynamique.** Plusieurs tests backend
créent un JWT avec des noms de rôles mais ne simulent pas les lectures utilisateurs,
rôles actifs et permissions désormais faites à l’authentification. La suite contient
des connexions refusées vers 127.0.0.1:3307 et des réponses 500 au lieu des statuts
attendus. D’autres mocks SQL historiques ne couvrent plus les requêtes courantes.
Cette dette de tests dépasse le changement de seed ; les scénarios réels obligatoires
ont été exécutés séparément sur MySQL jetable.

### Audit frontend

`ROLE_PERMISSIONS`, `BACKEND_ROLE_ALIASES` et les helpers historiques sont conservés
pour compatibilité/tests, sans appel depuis les contrôles actifs de navigation/actions.
`authStore.can` et `canNavigateWithPermissions` utilisent les permissions serveur.
Les alias de `erpHooks` servent encore à la présentation des utilisateurs et conservent
les codes inconnus ; ils n’accordent aucun accès. Le type UserRole garde ses littéraux
historiques comme aide de saisie mais accepte tout code dynamique. Les formulaires
utilisateurs/rôles chargent le catalogue réel et les scopes depuis les API.

## Reproduire la recette jetable

Depuis la racine du dépôt, utiliser exclusivement le projet de recette et ses ports dédiés :

```sh
docker compose -p lca-rbac-validation -f backend-node/test/fresh-rbac.compose.yml up -d --build
docker compose -p lca-rbac-validation -f backend-node/test/fresh-rbac.compose.yml exec -T backend node dist/scripts/seed-admin.js
python3 backend-node/test/fresh-rbac.integration.py
docker compose -p lca-rbac-validation -f backend-node/test/fresh-rbac.compose.yml down
```

Le script attend une base fraîche avec un seul rôle et le compte administrateur de
recette. Les identifiants du compose sont publics et réservés à cette recette locale.
Les données MySQL sont en tmpfs : `down` détruit les données de recette. Aucun volume
LCA existant n’est monté. Les dossiers Database sont montés en lecture seule.

L’inventaire exact des échecs exploratoires est conservé dans [FRESH_RBAC_TEST_DEBT.md](FRESH_RBAC_TEST_DEBT.md).

## Conclusion

Les critères fonctionnels fresh install et les contrôles ciblés passent. La pile et les données
de recette ont été supprimées après validation, sans intervenir sur les conteneurs existants.
La validation globale reste réservée : 140 tests backend et 9 tests frontend échouent
dans les suites exploratoires (inventaire lié ci-dessus). Leur remise à niveau et leur
réexécution sont nécessaires pour annoncer une non-régression complète.

**FRESH INSTALL RBAC — SUPER_ADMIN UNIQUEMENT — NON VALIDÉ**
