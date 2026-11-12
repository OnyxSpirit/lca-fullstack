# ERP LCA — Lot 3 — Moteur comptable en partie double

## Résultat livré

Le Lot 3 ajoute un moteur comptable manuel transactionnel, séparé des modules métier. Aucune vente, facture, dépense, paie, trésorerie ou opération SAV ne génère automatiquement d’écriture dans ce lot. Les champs `source_type`, `source_id` et `source_key` préparent le Lot 4 sans activer cette intégration.

Le périmètre comprend les pièces, les lignes débit/crédit, le cycle Brouillon → Validé → Comptabilisé → Contrepassé, la numérotation définitive par journal et exercice, les contrôles de période et de compte, les scopes territoriaux, l’audit, la consultation et les exports CSV/XLSX.

## Architecture et données

- Migration 119 : référentiel SYSCOHADA, exercices, périodes, journaux, liaisons de trésorerie et permissions de paramétrage.
- Migration 120 : `accounting_sequences`, `accounting_entries`, `accounting_entry_lines`, métadonnées complémentaires des comptes et permissions du moteur.
- Service : `backend-node/src/modules/accounting/accounting-entry.service.ts`.
- API : `backend-node/src/modules/accounting/accounting-entry.routes.ts`.
- Interface : `frontend/src/modules/treasury/AccountingEntriesPanel.tsx`, intégrée à `/treasury/accounting`.

Les montants utilisent `DECIMAL(19,2)` en base et des centimes `BigInt` lors des validations applicatives. Un montant négatif, non fini, à plus de deux décimales, une ligne simultanément débitrice et créditrice ou une pièce déséquilibrée est refusé.

## Cycle de vie et invariants

| État | Modification | Transition autorisée |
|---|---:|---|
| Brouillon | Oui, avec contrôle de version | Validation |
| Validé | Non | Comptabilisation |
| Comptabilisé | Non | Contrepassation |
| Contrepassé | Non | Aucune |
| Annulé | Non utilisé par l’interface de ce lot | Aucune |

La comptabilisation verrouille, dans une transaction, la pièce, la période, les comptes utilisés et la séquence du couple journal/exercice. Le numéro est produit sous la forme `JOURNAL-EXERCICE-000001`. Il n’existe aucun `MAX()+1`. Un second appel de comptabilisation retourne le résultat déjà produit.

La contrepassation crée une nouvelle pièce comptabilisée, inverse les débits et crédits et relie les deux pièces. L’unicité SQL de `reversal_of_id`, complétée par le verrou de la pièce d’origine, interdit les doubles contrepassations.

Une période clôturée ou un compte inactif/non imputable bloque la comptabilisation. Les devises étrangères sont explicitement refusées tant qu’aucun taux validé n’est fourni ; le moteur du Lot 3 comptabilise en XAF.

## API et permissions

- `GET /api/accounting/entries` : liste filtrée et paginée.
- `GET /api/accounting/entries/:id` : pièce, lignes et historique.
- `POST /api/accounting/entries` : création d’un brouillon.
- `PATCH /api/accounting/entries/:id` : modification optimiste d’un brouillon.
- `POST /api/accounting/entries/:id/validate` : validation.
- `POST /api/accounting/entries/:id/post` : comptabilisation.
- `POST /api/accounting/entries/:id/reverse` : contrepassation.
- `GET /api/accounting/entries/export/csv|xlsx` : export des données accessibles.

Les permissions sont distinctes : `accounting.entry.view`, `create`, `update`, `validate`, `post`, `reverse`, `export` et `history.view`. Les scopes `AGENCY`, `CONCESSION` et `GLOBAL` sont appliqués à la lecture et aux mutations. Une écriture d’agence ne peut pas recevoir des lignes rattachées à une autre agence.

Chaque création, modification et transition produit un événement dans `audit_logs`, avec acteur, contexte agence/concession, ancien état, nouvel état et date.

## Interface

L’espace « Comptabilité générale » expose : synthèse par statut, recherche, filtre, liste, détail des lignes, création manuelle, total débit/crédit/écart en direct, validation, comptabilisation, contrepassation et exports. Les libellés visibles sont en français. La nouvelle pièce est rattachée par défaut à l’agence active de la session.

## Régularisation du Lot 2

- La migration 119 a été corrigée pour rester exécutable sur une base vierge sans utilisateur : les journaux initiaux ne sont insérés que si un créateur actif existe.
- Les exports du plan comptable et du tableau financier sont de vrais classeurs OOXML `.xlsx`, produits avec ExcelJS 4.4.0 sous licence MIT ; les anciens contenus XML/HTML portant une extension Excel ont été supprimés.
- Les scénarios financiers existants restent couverts par la suite de non-régression du dépôt.
- La structure officielle SYSCOHADA révisée 2017 est présente (version, classes et provenance). La nomenclature détaillée complète n’a pas été inventée : son import reste conditionné à la fourniture d’une source autorisée et à la validation du professionnel comptable LCA.

## Recette effectuée

Base jetable finale : MySQL 8.4, `lca_lot3_final_20261112`.

- Application intégrale des migrations 001 à 120 sur base vide : réussie, état `Database EMPTY; niveau >= 120`.
- Migration 119 puis 120 : réussies.
- Build TypeScript backend : réussi.
- Build Vite frontend : réussi, 2 540 modules transformés.
- Tests unitaires Lot 3 : 4/4 réussis.
- Tests frontend Lot 3 : 2/2 réussis.
- Tests de fondation Lot 2 : 4/4 réussis.
- Test MySQL réel : comptabilisation concurrente idempotente, numéros distincts entre pièces, contrepassation concurrente unique, refus période clôturée et compte désactivé — réussi.

La tentative de suite backend globale a été interrompue après les suites ciblées : les tests HTTP Supertest échouent dans ce bac à sable sur `listen EPERM 0.0.0.0` et plusieurs tests d’intégration historiques attendent des services externes. Cet échec d’environnement n’affecte pas les builds, les tests ciblés ni la recette MySQL ci-dessus, mais une passe globale doit être rejouée dans l’environnement CI autorisant l’écoute locale.

Le test MySQL est reproductible avec `RUN_LOT3_MYSQL=1` et les variables `DB_*` pointant vers une base migrée. Il crée uniquement ses propres données de recette identifiées.

## Performance et dépendances

Les index couvrent la liste par date/statut/journal/agence, la période, les références, les lignes par compte et la séquence. Le test concurrent MySQL complet s’exécute en moins d’une seconde sur le conteneur local après amorçage ; ce chiffre valide le comportement technique mais ne constitue pas un engagement sur un volume de production, faute de jeu de données représentatif fourni.

`npm audit --omit=dev` signale quatre avis connus : un avis élevé transitif `body-parser`, deux avis modérés transitifs (`qs`, `uuid`) et un avis modéré porté sur ExcelJS par sa dépendance `uuid`. Le scénario vulnérable `uuid` avec tampon fourni n’est pas utilisé par les exports. Aucun `npm audit fix` automatique n’a été appliqué afin d’éviter une régression ou une rétrogradation non validée ; ce point reste une réserve de sécurité à traiter dans un lot de maintenance des dépendances.

## Limites assumées

- Pas de génération automatique depuis les modules métier : Lot 4.
- Pas de grand livre, balance générale avancée ni clôture comptable complète : Lot 5.
- Pas de saisie multidevise sans taux validé.
- Pas de nomenclature SYSCOHADA détaillée non sourcée.
- Aucun commit, push ou déploiement n’a été effectué.

## Procédure de recette fonctionnelle

1. Créer ou vérifier un exercice et une période ouverte, un journal actif et deux comptes imputables.
2. Ouvrir `/treasury/accounting`, onglet « Écritures comptables ».
3. Créer une pièce équilibrée en XAF et vérifier son statut « Brouillon ».
4. Vérifier qu’une pièce déséquilibrée ne peut pas être enregistrée.
5. Valider puis comptabiliser la pièce ; relever son numéro définitif.
6. Rejouer la comptabilisation et vérifier que le numéro ne change pas.
7. Contrepasser avec un motif et une date appartenant à une période ouverte ; vérifier l’écriture inverse.
8. Clôturer une période de recette et vérifier le refus de comptabilisation.
9. Désactiver un compte utilisé par une pièce validée et vérifier le refus.
10. Vérifier les exports CSV et XLSX ainsi que l’historique d’audit.
