# ERP LCA — Lot 1 : modernisation et reporting financier

## 1. Résultat livré

Le module **Comptabilité & Trésorerie** est désormais organisé autour de cinq routes réelles et d'un centre de pilotage financier consolidé. Les workflows Treasury existants restent propriétaires des opérations ; aucun moteur comptable, OCR ou donnée fictive n'a été introduit.

Le dashboard calcule les indicateurs côté backend, sépare systématiquement les devises, exclut les transferts internes des entrées/sorties économiques et conditionne chaque domaine sensible à ses permissions propres.

## 2. Architecture réalisée

```text
/treasury                       Centre de pilotage financier
/treasury/operations            Entrées, sorties, transferts, journal, GED, reversals
/treasury/commitments           Couverture, réservations, budgets et engagements
/treasury/reconciliation        Rapprochement bancaire CSV
/treasury/settings              Comptes, catégories et flux automatiques

React + URL filters
  → GET /api/reports/financial-dashboard
  → financial-dashboard.service
      → Treasury + Billing + Budgets + Suppliers + HR + Bank
      → filtrage RBAC et scope agence
  → MySQL (agrégats paramétrés)
```

`/treasury/accounting` est réservé dans `treasuryRoutes` pour une évolution ultérieure, sans route visible ni fonctionnalité simulée.

## 3. Fichiers principaux

### Créés

- `backend-node/src/modules/reports/financial-dashboard.service.ts`
- `backend-node/src/modules/reports/financial-dashboard.routes.ts`
- `backend-node/test/lot1-financial-dashboard.test.ts`
- `frontend/src/api/financialDashboardHooks.ts`
- `frontend/src/modules/treasury/FinancialDashboardPage.tsx`
- `frontend/src/modules/treasury/TreasuryWorkspace.tsx`
- `frontend/src/modules/treasury/TreasurySectionPage.tsx`
- `frontend/test/lot1-treasury-modernization.test.ts`
- le présent document.

### Modifiés

- `backend-node/src/app.ts` : montage du routeur dashboard.
- `frontend/src/App.tsx` : routes profondes et gardes.
- `frontend/src/navigation/routes.ts` : chemins Treasury spécialisés et réservation Accounting.
- `frontend/src/api/treasuryHooks.ts` : activation conditionnelle du journal.
- `frontend/src/modules/treasury/TreasuryPage.tsx` : mode section spécialisé, onglets historiques masquables et requêtes conditionnelles.

## 4. Endpoints

| Méthode | Endpoint | Permission minimale | Usage |
|---|---|---|---|
| GET | `/reports/financial-dashboard` | `reporting.view` + `treasury.view` | KPI, séries, répartitions, agences, banque et domaines autorisés |
| GET | `/reports/financial-dashboard/activities` | mêmes permissions | journal transversal paginé et filtré |
| GET | `/reports/financial-dashboard/export/csv` | + `reporting.export` | synthèse ou détail complet |
| GET | `/reports/financial-dashboard/export/xlsx` | + `reporting.export` | classeur Excel XML compatible, extension `.xls` |
| GET | `/reports/financial-dashboard/export/pdf` | + `reporting.export` | rapport PDF synthétique ou détaillé |

Paramètres : `from`, `to`, `asOf`, `granularity`, `agencyId`, `currency`; activités : `page`, `pageSize`, `search`, `source`; exports : `mode=summary|detailed`.

## 5. Inventaire et formules des KPI

Toutes les formules utilisent uniquement les mouvements `POSTED` et respectent le scope autorisé.

| Indicateur | Source | Formule / exclusions |
|---|---|---|
| Solde Treasury | `treasury_movements` | somme IN − OUT jusqu'à `asOf`, par devise |
| Solde disponible | mouvements + réservations | solde − réservations `ACTIVE` |
| Caisse/Banque/Autre | `treasury_accounts` | solde groupé par `account_type` |
| Entrées période | mouvements | IN avec `transfer_id IS NULL` |
| Sorties période | mouvements | OUT avec `transfer_id IS NULL` |
| Variation nette | mouvements | entrées − sorties, transferts exclus |
| Transferts | mouvements liés | présentés séparément, jamais comme recette/charge |
| Volume | mouvements | nombre de mouvements économiques par bucket |
| Encaissements par origine | `source_type` | regroupement réel ; origine inconnue = Autres / Non classés |
| Moyens de paiement | `payment_methods` | entrées économiques par moyen réel |
| Analyse agence | compte/mouvement/agence | comptes concession dans une ligne distincte |
| Facturation/créances | Financial Reporting | émission, annulation, avoir, collecte, remboursement, créance |
| Fournisseurs/dettes | Financial Reporting | factures validées − avoirs − paiements nets des reversals |
| Budgets | Financial Reporting | enveloppe, engagements, payé, disponible et reste à payer |
| Rémunérations | Financial Reporting | uniquement si permissions RH requises ; données agrégées |
| Banque | relevés + rapprochements | solde ERP séparé du dernier closing balance validé |

### Limites historiques explicites

- un statut annulé après `asOf` n'est pas toujours reconstructible si l'objet source ne porte pas un historique complet ;
- la couverture est un instantané actuel ;
- aucun taux de conversion n'est appliqué ;
- les soldes bancaires affichés sont ceux du dernier relevé validé, pas une certification bancaire en temps réel.

## 6. Visualisations

Par devise :

1. aire encaissements/décaissements ;
2. courbe du solde reconstitué ;
3. répartition par origine métier ;
4. encaissements par moyen de paiement ;
5. flux comparés par agence ;
6. volume d'opérations par période.

Les cartes analytiques complètent ces graphiques pour Facturation, Fournisseurs, Budgets, Rémunérations, Couverture et Banque. Les infobulles conservent la devise de la série. Les comptes concession ne sont pas attribués arbitrairement à une agence.

## 7. Filtres et navigation

Les dates, devise et granularité sont stockées dans l'URL. Les favoris, actualisations et boutons précédent/suivant conservent donc le contexte. Périodes proposées : aujourd'hui, hier, 7/30 jours, mois courant/précédent, trimestre et année. Granularités : jour, semaine, mois, trimestre et année.

Les pages spécialisées utilisent des sous-vues accessibles :

- Opérations : Journal ; Transferts et comptes.
- Engagements : Couverture et réservations ; Budgets.
- Paramétrage : Comptes ; Catégories ; Flux automatiques.

Les requêtes lourdes de la page historique ne sont plus toutes déclenchées : comptes, couverture, réservations, catégories et journal sont activés selon la section affichée.

## 8. Journal transversal

Le journal est paginé côté serveur, filtre par période, devise, source et recherche. Il expose date, événement, référence, agence, compte, sens, montant, devise, statut et auteur. Il s'appuie sur `treasury_movements`, registre commun vérifiable, afin d'éviter de dupliquer le même fait depuis plusieurs historiques métier. Il ne remplace ni le journal Treasury détaillé ni les historiques métier.

## 9. Exports et impression

- CSV : UTF-8, formules neutralisées par le générateur existant.
- Excel : SpreadsheetML lisible par Excel/LibreOffice, fichier `.xls` ; aucune dépendance supplémentaire.
- PDF : PDFKit, identification LCA, filtres, KPI, mini-visualisation des flux, domaines autorisés et activités en mode détaillé.
- Impression : feuille courante via le navigateur, en conservant cartes et graphiques et en masquant les contrôles marqués `print:hidden`.

Le mode détaillé récupère jusqu'à 10 000 activités correspondant aux filtres, indépendamment de la page visible. Cette limite de sécurité est explicite ; au-delà, une génération différée devra être introduite si la volumétrie réelle le justifie.

## 10. RBAC, confidentialité et multi-agences

- Le dashboard exige `treasury.view` et `reporting.view`.
- Les exports exigent `reporting.export`.
- Billing exige `billing.view` et `billing.payment.view`.
- Budgets exigent `hr.budget.view` et `hr.expense.view`.
- Fournisseurs exigent `supplier.debt.view`.
- Rémunérations exigent `hr.remuneration.view` et `hr.salary.view`.
- Banque exige `treasury.reconciliation.view`.

Un domaine non autorisé est absent de la réponse et de l'interface, au lieu de retourner zéro ou une donnée masquée ambiguë. Les scopes effectifs sont intersectés par `financialFilters`; OWN est refusé pour les agrégats collectifs. Le changement d'agence et la reconnexion invalident déjà la famille React Query `['treasury']` via `AppBootstrap`.

## 11. MySQL et performance

Aucune migration ni table d'agrégation n'a été nécessaire. Les requêtes utilisent les tables et index existants, des paramètres préparés, des groupements serveur et une pagination SQL. Aucun journal massif n'est téléchargé pour construire les graphiques.

Les séries groupent selon la granularité demandée. Les opérations détaillées utilisent l'ordre stable `(value_date DESC, id DESC)`. Une analyse `EXPLAIN` sur base isolée reste recommandée avec la volumétrie de recette ; aucune base MySQL n'était disponible/nécessaire pour les tests statiques exécutés dans cette mission.

## 12. Temps réel

Les événements `treasury:*` existants invalident `['treasury']`, ce qui couvre dashboard, graphiques et activités. Les événements budgets/dépenses/rémunérations RH invalident également Treasury. À la reconnexion, les caches Treasury et RH sont rechargés. Socket.IO reste un signal d'invalidation ; les API/MySQL restent la source de vérité.

## 13. Tests exécutés

### Contrôles de compilation

- Backend `npm run lint` : réussi.
- Frontend `npm run lint` : réussi.
- Backend `npm run build` : réussi.
- Frontend `npm run build` : réussi, 2 536 modules transformés.

### Backend ciblé

Commande : tests Lot 1 + Treasury foundation + corrections + flux + budgets + couverture + rapprochement.

Résultat : **7 fichiers de test réussis, 0 échec**.

### Frontend ciblé

Commande : Lot 1 + lazy routes + rattachement/realtime Treasury.

Résultat : **12 tests réussis, 0 échec**. Le premier lancement sandboxé a échoué avant exécution sur création de socket IPC `tsx`; le même jeu a été relancé hors sandbox et a réussi.

### Suites complètes

- Frontend `npm test` : **1 026 tests réussis, 0 échec**.
- Backend `npm test` : suite exécutée hors sandbox afin d'autoriser les sockets HTTP locaux de Supertest. Tous les tests du Lot 1 et les contrôles Treasury/Reporting réussissent. La suite globale termine toutefois en échec sur l'assertion statique historique `test/crm-pagination-final.test.ts:23`, qui recherche textuellement l'ancienne branche CRM `if(!paginationRequested) ... LIMIT 200`; le code CRM courant ne contient plus cette forme. Cet échec est extérieur au périmètre Trésorerie et n'a pas été masqué ni corrigé dans ce lot.

### Tests conditionnels non exécutés

- intégrations MySQL conditionnelles : aucune base isolée explicitement configurée pour ce lot ;
- recette visuelle et fonctionnelle avec données réelles : réservée au responsable du projet.

## 14. Procédure de recette fonctionnelle

### Préparation

1. Utiliser une base de recette, jamais la production.
2. Démarrer backend et frontend selon la procédure habituelle.
3. Se connecter avec un utilisateur disposant au minimum de `treasury.view` et `reporting.view` dans l'agence active.
4. Pour la recette complète, ajouter `reporting.export`, les permissions Treasury d'action, rapprochement, Billing, Fournisseurs et RH listées ci-dessus.

### Parcours

1. Ouvrir **Finance & Pilotage → Comptabilité & Trésorerie** (`/treasury`).
2. Changer période, devise et granularité ; actualiser la page et utiliser Précédent/Suivant.
3. Vérifier chaque devise séparément, les transferts exclus et les comptes concession séparés.
4. Comparer les montants avec `/reports`, `/billing` et les sources métier.
5. Ouvrir Activités, chercher une référence et filtrer une origine.
6. Exporter PDF synthèse, Excel détaillé, CSV détaillé puis imprimer.
7. Ouvrir `/treasury/operations` ; tester entrée, sortie, transfert, filtres, GED et reversal sur données de recette.
8. Ouvrir `/treasury/commitments` ; tester couverture, réservations et budgets selon permissions.
9. Ouvrir `/treasury/reconciliation` ; importer un CSV de test, valider/rejeter, rapprocher puis annuler.
10. Ouvrir `/treasury/settings` ; vérifier comptes, catégories et mappings.
11. Changer d'agence active ; confirmer le rechargement et l'absence de fuite inter-agences.
12. Refaire le parcours avec un utilisateur sans permissions RH : aucune donnée de rémunération ne doit apparaître.

## 15. Réserves et décision de recette

- L'export Excel est SpreadsheetML `.xls`, pas OOXML `.xlsx`, afin de ne pas ajouter une dépendance non présente.
- Les exports synchrones sont limités à 10 000 activités ; une file de génération différée ne se justifie qu'après mesure de la volumétrie réelle.
- L'interface réutilise encore `TreasuryPage` pour les formulaires et workflows complexes, mais ses sections sont désormais routées, isolées et chargées conditionnellement. Les règles financières ne sont pas dupliquées.
- Le lot est **techniquement prêt pour recette**, sous réserve d'une vérification fonctionnelle par le responsable du projet avec les données et permissions de recette. Il n'est pas déclaré fonctionnellement validé à sa place.
