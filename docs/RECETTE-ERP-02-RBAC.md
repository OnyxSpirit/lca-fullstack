# RECETTE-ERP-02 — RBAC et scopes

## Verdict

**VALIDÉ AVEC RÉSERVES.** Les contrôles ciblés confirment l'usage des permissions persistées et des scopes, sans bypass fondé sur le nom `SUPER_ADMIN`. La recette navigateur a utilisé un administrateur jetable ; elle ne remplace donc pas une matrice E2E multi-utilisateurs.

## Couverture démontrée

- permissions dynamiques CRM et garde de route frontend ;
- séparation consultation, création, affectation, activité et actions commerciales ;
- auteur d'activité distinct du responsable ;
- contraintes OWN empêchant une affectation arbitraire ;
- portées AGENCY, CONCESSION et GLOBAL dans les tests de négociation/visibilité ;
- invalidation et caches contextualisés par utilisateur/agence ;
- conflits d'essais sans divulgation de détails hors périmètre dans la politique testée.

## Preuves

- `crm-dynamic-rbac.test.ts` réussi ;
- `crm-functional-reliability.test.ts` réussi ;
- `crm-stage-transition-matrix.test.ts` réussi ;
- tests frontend CRM de permissions, réaffectation et scopes de négociation réussis dans la suite globale.

## Réserves

- pas de session navigateur dédiée pour chacun des quatre scopes ;
- trois anciens tests endpoint d'affectation/réaffectation échouent dans la suite globale et doivent être isolés ;
- aucune conclusion de production sans jeux de rôles réels homologués.
