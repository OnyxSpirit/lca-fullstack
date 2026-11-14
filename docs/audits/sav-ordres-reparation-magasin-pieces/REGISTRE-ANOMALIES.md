# Registre des anomalies

## SAV-001 — MAJEURE — bug confirmé

- Module : Caisse, journal et reporting SAV
- Reproduction : se connecter comme Super Administrateur, ouvrir `/service`, sélectionner Caisse de transit, Journal ou Reporting.
- Attendu : données limitées à l'agence active.
- Observé : HTTP 403, `Périmètre SAV insuffisant`.
- Permissions : `service.transit.view`, `service.journal.view`, `service.reporting.view`, toutes `GLOBAL`.
- Cause : `permissionScopePredicate` refuse `GLOBAL` lorsque `request.agencyRbac` existe.
- Correction recommandée : normaliser le scope métier via l'autorisation agence centrale avant de construire le prédicat, ou définir explicitement la sémantique `GLOBAL` migrée bornée à l'agence active. Ne pas supprimer le RBAC.
- Régression à tester : Super Admin, AGENCY, OWN, plusieurs agences, URL/API directe, destinations transit.

## SAV-002 — MOYENNE — fonctionnalité partielle

Journal limité sans pagination, tris, filtres date/agence/type ni export.

## SAV-003 — MOYENNE — fonctionnalité partielle

Reporting SAV sans sélection explicite d'agence ni export alors qu'une permission d'export existe.

## REC-001 — MAJEURE — configuration de recette

Les profils métier obligatoires ne sont pas disponibles ; seul le Super Admin et des comptes techniques sans affectation exploitable sont présents. Les tests RBAC réels multi-profils sont bloqués.

## REC-002 — MOYENNE — couverture de données

Aucun véhicule externe, transfert SAV ou facture atelier ; les scénarios A, G et I ne peuvent pas être validés sur données réelles.

