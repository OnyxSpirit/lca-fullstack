# Corrections par module

- RBAC : rejet strict des scopes persistés invalides.
- Infrastructure : environnement Docker, stockage et proxy dédiés.
- Pièces : pagination et état vide des achats directs.
- RH/Fiscalité : pagination des obligations.
- Paramètres : fournisseurs et agences paginés, grille agences responsive, Ressources atelier masquées sans suppression.
- RH budgets : auto-approbation et auto-rejet d'une rallonge autorisés lorsque `hr.budget.fund.approve` est effectivement accordé ; course et mouvement unique préservés.
- RH rémunérations : préparation, soumission et validation par le même acteur habilitées ; helper quatre-yeux supprimé.
- Prestataires : validation par le préparateur/soumetteur habilitée ; le scope collectif reste `AGENCY`.
- Frontend : aucun filtre d'identité à retirer ; les actions concernées étaient déjà affichées selon permission et statut.

Les autres modules ne sont pas déclarés qualifiés sur la seule base des campagnes historiques.
