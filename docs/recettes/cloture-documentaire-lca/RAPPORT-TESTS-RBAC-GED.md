# Tests RBAC, agences et GED

## Vérifié statiquement

- Chaque route est précédée d’une permission dynamique.
- Les requêtes directes filtrent l’agence active ou les agences source/destination.
- Les services comptabilité/rapprochement réutilisent leurs contrôles de scope existants.
- Les routes sont exclusivement GET et ne rejouent aucune opération métier.

## Non vérifié en intégration

- Matrice allow/deny réelle avec utilisateurs, rôles OWN/AGENCY/ALL et deux agences.
- Réponses 403/404 sur une base MySQL isolée.
- Création, téléchargement, empreinte et immutabilité d’archives GED pour les documents finalisés.

Les inventaires sont volontairement non archivés. L’absence d’archivage des événements finalisés est une réserve majeure.
