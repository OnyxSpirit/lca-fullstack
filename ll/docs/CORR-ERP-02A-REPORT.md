# CORR-ERP-02A — Rapport de correction

Date : 2026-10-10

## Statuts

- **CRM-01 — CORRIGÉE** : une matrice fermée contrôle désormais toute mutation générique de phase avant transaction ou effet secondaire.
- **RBAC-01 — CORRIGÉE** : Livraison, Showroom et GED appliquent désormais le scope de leur module directement dans chaque sous-requête de timeline Client 360°.

## Causes racines

CRM-01 reposait sur des gardes par destination. Les destinations non gardées, notamment `new`, constituaient un chemin implicite de réouverture. RBAC-01 vérifiait l'existence d'une permission, mais pas son périmètre sur trois branches SQL.

## Garanties préservées

- permissions et scopes CRM existants ;
- actions métier dédiées pour rendez-vous, essai, offre et vente ;
- historique, notification et temps réel après transition autorisée ;
- pagination, tri et format de la timeline ;
- permissions globales et migrations inchangées ;
- aucune dérogation par nom de rôle.

## Conclusion

Les deux anomalies P1 sont techniquement corrigées et couvertes par de nouveaux tests ciblés. Les anomalies P2/P3 de l'audit n'ont pas été traitées. Cette correction ne constitue pas une déclaration d'aptitude globale de l'ERP à la production.
