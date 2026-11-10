# Audit global et exhaustif du RBAC multi-agences — synthèse

## Verdict exécutif

**AUDIT VALIDÉ AVEC RÉSERVES** sur la couverture statique du backend ; la migration RBAC elle-même est **loin d’être terminée**.

L’état réel comprend **664 déclarations HTTP exposées** : 663 déclarations dans 47 fichiers de routeurs et `GET /api/health` déclaré directement dans `app.ts`. Quatre clés méthode+chemin sont dupliquées. Le chiffre historique 663 était exact pour les seuls routeurs, mais incomplet pour l’application exposée.

| Classification | Endpoints | Part |
|---|---:|---:|
| A. Validé | 18 | 2,7 % |
| B. Migré — validation incomplète | 95 | 14,3 % |
| C. Partiellement migré | 29 | 4,4 % |
| D. Non migré | 448 | 67,5 % |
| E. Conservé — hors migration métier | 22 | 3,3 % |
| G. Anomalie de sécurité suspectée | 52 | 7,8 % |
| **Total** | **664** | **100 %** |

Avancement d’implémentation observable (A+B, sans compter les partiels) : **113/664, soit 17,0 %**. Couverture entièrement validée : **18/664, soit 2,7 %**. Les catégories G sont des absences de garde directement détectable et doivent être confirmées manuellement ; elles ne sont pas toutes des vulnérabilités démontrées.

## Ce qui est réellement solide

- Socle `user_agencies`/`user_agency_roles`, agence active liée à la session et version du contexte.
- Détection stricte du véritable Super Admin système et permissions explicites.
- Wrappers transactionnels frais avec verrouillage de session/affectation.
- CRM (12 endpoints) et Notifications (6 endpoints) disposent des preuves les plus complètes, y compris tests MySQL existants.
- Socket.IO rejoint une seule agence active et ne place pas automatiquement le Super Admin dans toutes les rooms.

## Implémenté mais non clôturé

- Clients CRUD, Showroom, Devis, Proformas, Ventes et stock véhicule principal utilisent le nouveau modèle, mais leurs preuves MySQL/concurrence ne sont pas uniformément complètes.
- Livraisons est hybride : le routeur principal a commencé à utiliser `agencyRbac`, tandis que services et checklists restent historiques ; les transactions ne revalident pas encore systématiquement l’autorisation fraîche.
- Administration/utilisateurs mélange fonctions modernes, identité centrale et anciens accès locaux.

## Risques dominants

1. Facturation, paiements, trésorerie et retours véhicules restent historiques malgré leur criticité financière.
2. Pièces, Atelier/SAV et RH représentent 286 endpoints largement non migrés et fortement couplés.
3. Les anciens scopes `GLOBAL/CONCESSION`, `users.agency_id` et `user_roles` restent actifs dans de nombreux chemins.
4. Client 360, reporting et dashboards agrègent des producteurs non stabilisés.
5. Quatre collisions de routes exigent une preuve d’ordre et d’accessibilité.
6. Les émissions historiques vers des rooms globales n’ont actuellement pas de consommateurs ; les réactiver créerait un risque de fuite.

## Réserves de l’audit

- La classification exhaustive est fondée sur AST + inspection des helpers et reste volontairement conservatrice pour les 52 routes G.
- La suite backend complète a été lancée sur l’arbre de travail courant ; ses résultats détaillés sont consignés dans `RBAC-AUDIT-GLOBAL-TESTS.md` et empêchent toute qualification de non-régression globale tant que les échecs ne sont pas analysés.
- Aucun test frontend, navigateur ou E2E n’a été exécuté.
- Aucun code applicatif, test, migration ou donnée métier n’a été modifié par cette mission d’audit.

## Conclusion

Le socle cible est exploitable et plusieurs modules pilotes montrent le bon modèle, mais l’ERP fonctionne encore majoritairement avec l’ancien RBAC. La mission finale doit être un lot backend unique suivant [le plan de finalisation](./RBAC-AUDIT-GLOBAL-PLAN-FINALISATION.md), avec décisions métier gelées, migrations additives, migration des chaînes financières/opérationnelles et recette MySQL 8.4 complète.
