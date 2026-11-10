# Phase 2C-1 — Plan exécutable de migration 2C-2

## Préconditions

- Geler le catalogue de 331 permissions et les 820 associations comme jeu de référence.
- Valider les cinq décisions métier du document des autorisations centrales.
- Ajouter des fixtures multi-agences : deux agences même concession, une autre concession, utilisateurs mono/multi-agences et SUPER_ADMIN sans affectation.
- Interdire toute migration destructive tant que les compteurs historiques ne sont pas à zéro dans code, tests, API et données.

## Ordre recommandé

### 1. Socle et observabilité

Stabiliser `agency-authorization.ts`, `agency-rbac.service.ts`, `agency-rbac.routes.ts`, `authenticate.ts`, `socket.ts` et les types Express. Ajouter un helper unique pour OWN/AGENCY, un registre de règles de propriété, un registre de permissions centrales et une télémétrie des branches historiques. Critère : contexte obsolète refusé, SUPER_ADMIN central sans affectation, changement d'agence révoquant l'ancien contexte temps réel.

### 2. Modules personnels et faible couplage

Migrer notifications, activité, appareils 2FA personnels et dashboard local. Ils valident OWN, l'agence active et les rooms. Critère : aucune lecture/modification d'un autre utilisateur ou d'une ancienne agence.

### 3. Administration centrale

Migrer utilisateurs/rôles/agences, politiques 2FA, paramètres communs, référentiels RH, checklist et marques documentaires. Remplacer les tests de rang `GLOBAL/CONCESSION` par `assertCentralAgencyPermission` ou une règle AGENCY documentée. Critère : rôle central délégué testable sans SUPER_ADMIN, si et seulement si la politique le prévoit.

### 4. CRM → clients → showroom → devis/proformas

Ces modules partagent commercial, client, rendez-vous, essai et documents. Définir OWN une seule fois et utiliser `assertAgencyResource` sur chaque ID. Critère : parcours commercial complet dans l'agence active ; réaffectation hors agence refusée tant que le workflow C n'est pas activé.

### 5. Véhicules et transferts

Migrer catalogue, stock, emplacements, retours et mouvements. Introduire la vérification source/destination avant d'activer les transferts C. Critère : deux permissions vérifiées, transaction atomique, événements post-commit, accès direct par ID impossible.

### 6. Vente → livraison → facturation

Migrer la chaîne dans cet ordre pour conserver les invariants. Documents, checklists, signatures, autorisations financières et paiements dérivent de la vente/livraison bornée. Critère : aucun changement d'agence entre devis, vente, véhicule, livraison et facture.

### 7. Pièces → SAV/atelier

Migrer stock pièces, commandes, ventes comptoir et logistique interne avant les OR, planning, garanties et facturation SAV. Critère : sous-ressources bornées par parent, transfert magasin/SAV contrôlé des deux côtés, sessions concurrentes sûres.

### 8. RH/prestataires puis trésorerie

Migrer profils/rattachements, contrats, congés, salaires, primes, budgets/dépenses et rémunérations. Ensuite comptes, réservations, rapprochement et transferts. Critère : séparation préparation/validation/décaissement, scopes par rattachement et comptes source/destination.

### 9. Reporting, exports et traitements E

Migrer en dernier après stabilisation de tous les filtres producteurs. Critère : chiffres AGENCY identiques aux modules sources ; consolidation uniquement avec permission D ; CSV/PDF identiques à l'écran ; jobs sans fausse agence.

### 10. Convergence MySQL

Créer une migration additive : colonnes/tables de capacités centrales et éventuelles policies de reporting, contraintes et index. Migrer les 25 attributions historiques hors SUPER_ADMIN selon la classification validée. Transformer le modèle SUPER_ADMIN sans perdre ses droits. Quand le code, l'API, le frontend et les données ne produisent plus les anciens scopes, changer l'ENUM vers `OWN,AGENCY` dans une migration séparée avec contrôle pré/post. Ne jamais faire l'ALTER avant le backfill et les compteurs à zéro.

## Modifications backend par famille

| Composant | Adaptation |
|---|---|
| Routes | remplacer `requirePermission` par `requireAgencyPermission`/`requireAnyAgencyPermission`; central par garde explicite |
| Services | accepter un contexte d'autorisation immuable, pas `agencyId` nu ; propager version/session |
| SQL | ajouter agence/propriétaire à SELECT/UPDATE/DELETE ; dériver destination du serveur ; appliquer scope avant agrégat/pagination |
| Transactions | `withCurrentAgencyAuthorization`, ressource `FOR UPDATE`, revalidation avant écriture, émission après commit |
| Ressources | registre `assertAgencyResource` par table/parent ; 404/403 cohérent sans fuite d'existence |
| Realtime | rooms agence active, contrôle de fraîcheur, payload avec agencyId vérifié |
| Audit | acteur, session, agence active, source/destination, permission, décision et snapshots |

## Évolution MySQL additive

1. Ajouter un catalogue de capacités centrales ou une colonne de classification non destructive ; ne pas surcharger `scope`.
2. Ajouter, si nécessaire, une table d'autorisation transverse bornée à un ensemble d'agences.
3. Indexer les couples `(agency_id,id)`, propriétaire/agence et les clés source/destination utilisées par les contrôles.
4. Backfiller les classifications A–E et conserver un journal de correspondance ancien→nouveau.
5. Mettre des contraintes empêchant une capacité centrale d'être interprétée comme scope métier.
6. Seulement après validation, retirer CONCESSION/GLOBAL de `role_permissions.scope` dans une version ultérieure ; conserver rollback logique par snapshot de migration, sans supprimer de données métier.

## Frontend futur

- Afficher l'agence active de session et invalider les caches au changement.
- Limiter le sélecteur de scope métier à « Mes données » et « Données de l'agence ».
- Présenter les capacités centrales dans une section distincte, sans rang numérique de scope.
- Retirer les tests `CONCESSION || GLOBAL` de `notificationFilters.ts`, `WorkshopLaborRatesSettings.tsx`, `documentLogoAccess.ts`, `stockCategoryAccess.ts` et équivalents.
- Ne plus envoyer un `agencyId` arbitraire pour les opérations locales ; les workflows C utilisent des champs source/destination explicites.

## Plan de tests

Pour chaque permission migrée : absence de permission=403 ; OWN propriétaire=succès ; OWN autre propriétaire=404/403 ; AGENCY agence active=succès ; autre agence=refus ; contexte changé/révoqué=401/409 ; ID direct hors agence=refus ; filtre `agencyId` forgé=refus.

Tests d'intégration MySQL/HTTP : listes, détails, CREATE avec agence serveur, UPDATE/DELETE bornés, pagination/totaux, exports, rollback, verrouillage concurrent et changement d'agence pendant transaction. Workflows C : matrice source/destination autorisée/non autorisée, autre concession, destination inactive, double soumission/idempotence, événement dans les deux rooms après commit seulement. SUPER_ADMIN : accès aux agences présentes et créées après le token, sans affectation artificielle. Tests E : acteur SYSTEM, job sans agence, job agence explicite, reprise et absence de fuite Socket.

## Critères de validation 2C-2

- zéro garde métier historique sur les modules migrés ;
- zéro branche SQL `GLOBAL => 1=1` dans ces modules ;
- zéro dépendance à `users.agency_id` comme contexte actif ;
- zéro association non classifiée CONCESSION/GLOBAL ;
- tous les scénarios négatifs multi-agences verts ;
- parité fonctionnelle des exports/rapports ;
- SUPER_ADMIN et délégations centrales explicites inchangés ou validés ;
- migration MySQL additive testée sur copie et rollback documenté.

## Risques et parades

Le risque principal est une ouverture transversale par compatibilité ; utiliser le refus par défaut. Le second est une régression fonctionnelle des référentiels communs ; décider B/A avant migration. Le troisième est le changement de contexte pendant une transaction ; versionner et revalider. Le quatrième est la divergence API/frontend ; maintenir temporairement un contrat de lecture compatible, jamais un fallback d'autorisation.

## Verdict de la phase 2C-1

**VALIDÉ AVEC RÉSERVES.** La cartographie MySQL, les familles de routes, les scopes historiques, les fonctions centrales, les workflows C et l'ordre de migration sont exploitables. Réserves explicites : aucun test dynamique métier, navigateur ou E2E n'a été exécuté conformément à la mission ; la preuve est statique et MySQL. Les décisions métier sur les référentiels communs, la délégation centrale et l'acceptation destination restent à prendre avant implémentation.
