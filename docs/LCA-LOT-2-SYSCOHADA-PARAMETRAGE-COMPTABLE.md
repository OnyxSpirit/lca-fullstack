# ERP LCA — Lot 2 : SYSCOHADA et paramétrage comptable

## Résumé

Le Lot 2 ajoute un domaine Accounting distinct de Treasury. Il rend fonctionnels le plan comptable hiérarchique, les exercices et périodes, les journaux comptables et les liaisons entre comptes Treasury et comptes comptables. Il ne crée ni pièce ni ligne débit/crédit et ne modifie aucun mouvement Treasury : le moteur de partie double reste réservé au Lot 3.

Le centre de pilotage corrige en parallèle la présentation d'un solde client créditeur : la formule historique peut produire un solde net négatif lorsqu'un paiement, un acompte ou un trop-perçu excède la créance. Cette valeur n'est plus libellée « créance négative » ; elle est séparée en `Créances clients` et `Soldes créditeurs clients`, sans altérer le montant net source.

## Source SYSCOHADA et périmètre importé

Référence juridique : Acte uniforme relatif au droit comptable et à l'information financière (AUDCIF), adopté le 26 janvier 2017, publié le 15 février 2017, applicable aux comptes personnels à partir du 1er janvier 2018. Source OHADA : <https://www.ohada.org/acte-uniforme-relatif-au-droit-comptable-et-a-linformation-financiere-audcif/2/>.

La migration installe les neuf classes structurelles documentées par le SYSCOHADA révisé. Elle ne prétend pas embarquer la nomenclature officielle exhaustive : celle-ci n'était pas présente dans le projet sous forme de données réutilisables. Les subdivisions doivent être importées depuis une source autorisée et validées par le professionnel comptable de LCA. L'import refuse les classes hors 1–9, les numéros non numériques et les fichiers de plus de 5 000 lignes.

## Architecture et migration

Migration additive : `119_accounting_syscohada_foundation.sql`.

| Table | Fonction |
|---|---|
| `accounting_reference_versions` | version, source et date d'effet du référentiel |
| `accounting_accounts` | comptes hiérarchiques, comptes protégés et subdivisions LCA |
| `accounting_fiscal_years` | exercices centraux sans duplication par agence |
| `accounting_periods` | périodes ouvertes ou clôturées |
| `accounting_journals` | référentiel ventes, achats, banque, caisse, OD et à-nouveaux |
| `accounting_treasury_mappings` | correspondances datées Treasury → classe 5 |

Les modifications sont historisées dans `audit_logs`. Les contraintes assurent unicité, dates cohérentes, clés étrangères et index de recherche. Aucune table d'écritures comptables n'est créée.

## Routes et endpoints

Interface : `/treasury/accounting`, avec quatre onglets accessibles au clavier.

Endpoints principaux :

- `GET/POST/PATCH /api/accounting/accounts` ; historique, import et exports CSV/Excel ;
- `GET/POST /api/accounting/fiscal-years` ;
- `PATCH /api/accounting/periods/:id/status` ;
- `GET/POST/PATCH /api/accounting/journals` ;
- `GET/POST/PATCH /api/accounting/mappings`.

Les listes sont paginées côté serveur. Les écritures passent par des transactions et utilisent des requêtes paramétrées.

## Permissions

`accounting.chart.view/manage/import/export`, `accounting.fiscal.view/manage`, `accounting.period.manage`, `accounting.journal.view/manage`, `accounting.mapping.view/manage`. Elles sont ajoutées au catalogue dynamique ; seul le rôle système `SUPER_ADMIN` les reçoit à l'installation, avec scope GLOBAL. Aucun nom de rôle ne gouverne le runtime.

## Règles de gestion

- Un compte de référence ne peut pas être renommé.
- Une subdivision prolonge le numéro de son parent.
- Deux exercices ne peuvent pas se chevaucher.
- La fermeture d'une période ne génère aucune clôture ni écriture.
- Une réouverture est permissionnée et auditée.
- Un compte Treasury ne peut être lié qu'à un compte actif, imputable et de classe 5.
- Une liaison ne peut pas entrer en conflit avec une liaison active sur la même période.
- Une agence explicite doit être compatible avec le compte Treasury.

## Corrections du Lot 1

- Libellés analytiques centralisés en français ; une valeur inconnue est annoncée comme non reconnue au lieu d'être affichée silencieusement.
- Créances débitrices et soldes créditeurs clients séparés.
- Agrégation des réservations corrigée : le montant réservé n'est plus multiplié par le nombre de mouvements du compte.
- Le dashboard reste un seul appel HTTP ; ses agrégats indépendants sont exécutés en parallèle, les activités restant paginées dans une requête séparée.
- Les dates visibles du badge analytique utilisent le formateur français partagé.

## Performance

Avant correction statique, le dashboard exécutait un appel HTTP principal et un appel paginé d'activités. Le chargement principal lançait sept agrégats de base et jusqu'à cinq agrégats permissionnés en parallèle. Cette architecture est conservée pour éviter des appels frontend redondants. L'anomalie la plus coûteuse et incorrecte provenait de la jointure `comptes × mouvements × réservations`, qui répétait la réservation pour chaque mouvement ; les mouvements sont désormais préagrégés par compte avant la jointure.

Aucune base de volumétrie représentative n'était configurée pendant cette mission : aucun chiffre de latence avant/après n'est inventé. La recette doit relever `EXPLAIN ANALYZE`, durée API et taille de réponse sur une base isolée représentative. Critère proposé : un seul appel dashboard, un seul appel activités, aucun scan complet non indexé, puis comparaison p50/p95 sur 20 exécutions.

## Exports

Le plan est exportable en CSV UTF-8 et SpreadsheetML compatible Excel. Le binaire OOXML `.xlsx` véritable nécessite une bibliothèque dédiée non présente dans le dépôt ; l'interface nomme donc honnêtement le fichier `.xls`. Les exports du dashboard conservent leurs permissions et périmètres.

## Tests et recette

Contrôles automatisés : build et lint backend/frontend, tests Lot 1 et Lot 2, puis non-régression Treasury/Reporting. Les intégrations MySQL conditionnelles exigent une base jetable.

Recette fonctionnelle :

1. Aller à **Comptabilité & Trésorerie → Comptabilité** avec `accounting.chart.view`.
2. Rechercher et filtrer les classes ; vérifier que les racines sont protégées.
3. Avec `accounting.chart.manage`, créer une subdivision numérique sous un parent ; un doublon doit être refusé.
4. Avec `accounting.chart.import`, importer un CSV `numero;intitule`, puis exporter sous `accounting.chart.export`.
5. Créer un exercice non chevauchant sous `accounting.fiscal.manage`; ses périodes mensuelles doivent apparaître.
6. Fermer puis rouvrir une période sous `accounting.period.manage`; vérifier l'audit et l'absence d'écriture comptable.
7. Créer un journal sous `accounting.journal.manage`; un code dupliqué doit être refusé.
8. Créer une subdivision imputable de classe 5, puis lier un compte Treasury sous `accounting.mapping.manage`; vérifier les conflits de date et d'agence.
9. Changer d'agence active : le référentiel et les exercices restent centraux, tandis que le compte Treasury conserve son rattachement.
10. Revenir au dashboard et vérifier qu'un solde client créditeur apparaît séparément des créances.

## Limites et validation

Le plan officiel détaillé et les adaptations fiscales LCA doivent être fournis sous licence appropriée puis validés par un expert-comptable. La validation fonctionnelle finale appartient au responsable du projet. Aucun commit, push, déploiement ou génération d'écritures en partie double n'est effectué.
