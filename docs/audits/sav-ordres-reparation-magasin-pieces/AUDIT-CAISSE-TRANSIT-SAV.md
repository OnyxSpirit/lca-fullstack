# Audit caisse de transit SAV

## Anomalie prioritaire confirmée — SAV-001

Les routes `/api/sav/transit`, `/api/sav/journal` et `/api/sav/reporting` passent par `permissionScopePredicate`. Dans un contexte `agencyRbac` migré, la permission Super Admin reste `GLOBAL`. Le prédicat n'accepte `GLOBAL` que lorsque `migrated === false`, puis ne traite que `AGENCY`/`OWN` : il retourne `null`, ce qui déclenche `403 Périmètre SAV insuffisant`.

Chaîne : `SavBusinessSections.tsx` → endpoint SAV → `scope()` → `permissionScopePredicate()` → 403.

Fichiers :

- `backend-node/src/modules/workshop/sav-operations.routes.ts`
- `backend-node/src/modules/rbac/scope-intersection.ts`
- `backend-node/src/modules/rbac/agency-rbac.service.ts`

La permission n'est pas absente : `service.transit.view`, `service.journal.view` et `service.reporting.view` sont attribuées `GLOBAL` au rôle système `SUPER_ADMIN`.

## Autres contrôles

- Création idempotente, verrouillage et solde disponible serveur.
- Destination issue d'un mapping trésorerie actif, filtrée au frontend et revalidée lors de la confirmation.
- États en attente, confirmé, refusé, annulé ; double décision empêchée.
- Aucune séparation demandeur/approbateur codée en dur.
- Aucun transfert présent en recette pour un test métier réel.

Verdict : **NON CONFORME**.

