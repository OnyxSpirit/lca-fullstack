# ERP LCA — Audit frontend Comptabilité & Trésorerie

> Audit statique du dépôt au 12 novembre 2026. **Vérifié** désigne un comportement directement établi par le code cité. **Risque / proposition** désigne une conclusion ergonomique ou une architecture cible à valider. Aucun fichier applicatif, test, hook, route, permission, service backend ou donnée n'a été modifié.

## 1. Synthèse exécutive

Le module est une application de trésorerie avancée concentrée sur une seule route, `/treasury`, et un composant principal très volumineux : `TreasuryPage` dépasse 2 100 lignes et porte huit onglets, l'essentiel des états locaux, les requêtes transverses et une dizaine de modales. La page couvre réellement : soldes par devise, comptes de trésorerie, entrées/sorties manuelles, transferts, journal des mouvements, contrepassations, couverture des engagements, réservations, budgets RH partagés, rapprochement bancaire, catégories et configuration des flux automatiques.

Le titre « Comptabilité & Trésorerie » est plus large que le périmètre frontend observé. **Aucun plan comptable, journal comptable au sens général, écriture débit/crédit, grand livre, balance, exercice, période comptable ou état financier réglementaire n'a été identifié.** Le « Journal financier normalisé » affiche des mouvements Treasury, avec un sens Entrée/Sortie et une source métier. Il ne doit pas être présenté comme une comptabilité générale.

Les points positifs sont importants : RBAC dynamique granulaire, scopes pris en compte pour les référentiels sensibles, soldes dérivés des mouvements, devises non converties, opérations immuables corrigées par contrepassation, séparation explicite réservation/mouvement, rapprochement sans création d'écriture, liens GED, invalidations React Query par préfixe et nombreux tests de contrat.

Les principaux problèmes sont :

- huit onglets locaux non synchronisés avec l'URL, donc non partageables et perdus au rechargement ;
- une barre d'onglets artisanale sans sémantique ARIA, navigation clavier ni comportement mobile explicite, alors qu'un composant `Tabs` accessible existe ;
- des requêtes de sections masquées montées dès l'ouverture de la page ;
- mélange dans le même composant de consultation, opérations irréversibles, engagements RH, rapprochement et paramétrage ;
- journal dense en grille de `div`, sans en-têtes visibles, sans état chargement/erreur/vide explicite et sans enveloppe de débordement mobile ;
- terminologie parfois ambiguë entre solde interne, solde disponible, couverture, engagement et mouvement.

**Recommandation finale : option C, organisation hybride.** Conserver `/treasury` comme synthèse, puis donner des URL stables à quatre domaines opérationnels : Opérations/Journal, Engagements, Rapprochement et Paramétrage. Réutiliser les composants et hooks actuels, ne charger que la section active, conserver Facturation sous `/billing` et ne pas inventer un module de comptabilité générale absent.

## 2. Cartographie des pages et composants

### Navigation et page

| Fichier / composant | Responsabilité | Données et actions | Dépendances principales |
|---|---|---|---|
| `frontend/src/App.tsx` — route `treasury` (l. 63, 109) | Route unique `/treasury`, chargée en lazy et gardée par `treasury.view` | accès/refus | React Router, `ModuleGuard` |
| `frontend/src/components/layout/Sidebar.tsx` — `Sidebar` (l. 149-163) | Entrée « Comptabilité & Trésorerie » dans Finance & Pilotage | navigation vers `/treasury` | `ROUTES.treasury`, politique dynamique |
| `frontend/src/modules/modules-portal/ModulesPortalPage.tsx` | Tuile du portail | navigation vers `/treasury` | `ROUTES.treasury`, permission module |
| `frontend/src/modules/treasury/TreasuryPage.tsx` — `TreasuryPage` (l. 148-2174) | Conteneur unique, huit onglets, actions globales et modales | synthèse, couverture, budgets, comptes, journal, catégories, flux, rapprochement | tous les hooks Treasury, hooks d'auth/UI, composants ci-dessous |

### Composants spécialisés

| Fichier / composant | Responsabilité | Données / actions |
|---|---|---|
| `frontend/src/modules/treasury/BankReconciliationPanel.tsx` — `BankReconciliationPanel` | Import et rapprochement de relevés bancaires | relevés, lignes, écarts, propositions; import CSV, validation, rapprochement, annulation, export, historique |
| `frontend/src/modules/treasury/BudgetTreasuryPanel.tsx` — `BudgetTreasuryPanel` | Vue Treasury des budgets RH et demandes de rallonge | budgets, engagé/décaissé/disponible; soumettre, approuver, rejeter, rouvrir, rallonge, clôturer, historique |
| `frontend/src/modules/treasury/TreasuryFlowMappingsTable.tsx` — `TreasuryFlowMappingsTable` | Administration des correspondances moyen de paiement → compte Treasury | modifier compte, activer/désactiver, supprimer si absence d'historique, pagination |
| `frontend/src/modules/treasury/TreasuryManualDocuments.tsx` — `TreasuryManualDocuments` | GED des opérations manuelles | liste, upload, aperçu et téléchargement de justificatifs |
| `frontend/src/components/ui/Tabs.tsx` — `Tabs` | Composant partagé d'onglets accessible | `role=tablist`, `aria-selected`, roving tabindex, flèches/Home/End; **non utilisé par TreasuryPage** |
| `frontend/src/components/common/ClientPagination.tsx` — `useClientPagination` | Pagination cliente partagée | comptes, catégories, budgets, réservations, relevés et lignes |
| `frontend/src/components/common/OperationTimeline.tsx` | Historique générique | réservations, budgets, relevés |
| `frontend/src/components/ui/Modal.tsx` | Modale accessible partagée | formulaires et confirmations, gestion du focus |

### Couche données

`frontend/src/api/treasuryHooks.ts` contient les types, clés de cache, requêtes et mutations Treasury. `frontend/src/api/hrHooks.ts` est également utilisé par `BudgetTreasuryPanel`, car les budgets restent une source métier RH partagée. Les téléchargements passent par `apiDownload` dans `frontend/src/services/apiClient.ts`.

## 3. Arborescence actuelle

```text
Menu Finance & Pilotage
└── Comptabilité & Trésorerie → /treasury
    ├── En-tête
    │   ├── Nouvelle entrée (permissionnée)
    │   └── Nouvelle sortie (permissionnée)
    ├── Barre locale de 8 onglets
    │   ├── Vue d’ensemble
    │   │   ├── KPI par devise : solde, entrées, sorties, transferts internes
    │   │   └── Comptes accessibles
    │   ├── Couverture
    │   │   ├── Couverture des engagements par devise
    │   │   ├── Budgets approuvés
    │   │   └── Réservations de liquidités + actions/historique
    │   ├── Budgets & engagements
    │   │   ├── Budgets RH
    │   │   └── Demandes de rallonge
    │   ├── Rapprochement bancaire
    │   │   ├── Relevés
    │   │   └── Opérations et écarts
    │   ├── Comptes
    │   │   └── Liste, transfert et configuration
    │   ├── Journal
    │   │   └── Filtres, mouvements, justificatifs, contrepassation, export
    │   ├── Catégories
    │   │   └── Liste et administration
    │   └── Configuration des flux
    │       ├── activation globale
    │       ├── nouvelle correspondance
    │       └── table des correspondances
    ├── Note globale « solde calculé depuis les mouvements »
    └── Modales globales
        ├── réservation / décision / réduction / historique
        ├── entrée ou sortie manuelle / justificatifs
        ├── compte / statut compte
        ├── catégorie / statut catégorie
        ├── transfert
        └── contrepassation
```

Les onglets Rapprochement et Budgets montent des composants relativement autonomes. Les six autres sections et la majorité des modales restent intégrées dans `TreasuryPage`.

## 4. Inventaire des fonctionnalités

### 4.1 Encaissements

| Fonctionnalité | État | Emplacement |
|---|---|---|
| Consultation des paiements clients | Présente sous forme de mouvements source `PAYMENT` dans le Journal; la facture et le paiement détaillés restent dans Billing | `TreasuryPage`, `sourceLabel` l. 68-82 et Journal l. 994-1145 |
| Entrée manuelle | Présente et accessible depuis l'en-tête | `openManual('IN')`, `submitManual`, modal l. 1475+ |
| Modes de paiement et référence | Présents dans le formulaire manuel | `useTreasuryManualOptions`, champs `paymentMethodId`, `reference` |
| Contrepartie | Présente pour l'entrée | champ `counterparty` |
| Justificatifs | Présents après comptabilisation et depuis le Journal | `TreasuryManualDocuments` |
| Recherche plein texte | Absente | — |
| Filtres | Compte, sens, catégorie, période dans le Journal | `TreasuryPage` l. 1013-1067 |
| Statut | Immuable ou « Contrepassée »; pas de workflow brouillon pour une entrée comptabilisée | `m.is_reversed`, action de reversal |

### 4.2 Décaissements

- sortie manuelle accessible sous `treasury.disbursement.create` ;
- formulaire avec compte, montant, catégorie compatible OUT/BOTH, motif, date de valeur, moyen de paiement, référence, bénéficiaire/contrepartie et « remis à » ;
- justificatifs GED et contrepassation identiques aux entrées ;
- décaissement budgétaire présent dans RH via `BudgetExpenseDisbursement`, exigeant à la fois `hr.expense.disburse` et `treasury.disbursement.create` ;
- règlements fournisseur et rémunérations sont déclenchés dans leurs modules métier, puis alimentent Treasury ;
- aucune route générale POST `/treasury/movements` n'est exposée : les écritures viennent d'actions métier spécialisées.

### 4.3 Trésorerie

- comptes Caisse/Banque/Autre, soldes et soldes disponibles ;
- rattachement concession/agence, activation/désactivation et modification bornée ;
- synthèse multidevise fournie par le backend ;
- transferts entre comptes, bornés par le disponible ;
- journal paginé serveur et export CSV ;
- contrepassation motivée ;
- couverture des engagements, réservations et cycle DRAFT/SUBMITTED/ACTIVE/etc. ;
- import de relevé, prévisualisation, validation, propositions et rapprochement explicite ;
- catégories d'entrées/sorties ;
- correspondances automatiques des moyens de paiement vers les comptes.

### 4.4 Comptabilité

| Fonctionnalité | État frontend observé |
|---|---|
| Journal de mouvements Treasury | Présent |
| Écritures comptables débit/crédit | Absentes |
| Plan comptable | Absent |
| Grand livre | Absent |
| Balance générale | Absente |
| Exercices/périodes comptables | Absents |
| États financiers réglementaires | Absents |
| Clôture comptable | Absente; seule la clôture d'un budget existe |

Cette absence n'est pas déclarée anomalie métier : elle délimite le périmètre réellement implémenté. Le terme « journal financier » est approprié; « journal comptable » ne le serait pas.

### 4.5 Autres fonctionnalités

- budgets et demandes de rallonge provenant de RH ;
- règlements de garantie constructeur, intégrés depuis SAV ;
- documents GED rattachés aux opérations manuelles ;
- reporting financier distinct dans `/reports` ;
- événements temps réel Treasury qui invalident aussi budgets/dépenses RH et Dashboard.

## 5. Parcours utilisateur existants

| Parcours | Chemin UI | Permissions principales | Étapes / difficultés |
|---|---|---|---|
| Consulter les soldes | Sidebar → Comptabilité & Trésorerie → Vue d'ensemble | `treasury.view` | 1 clic; lisible par devise, mais « solde interne net » et solde de compte ne sont pas définis sur place |
| Enregistrer une entrée | Sidebar → module → Nouvelle entrée → formulaire → justificatifs | `treasury.view`, `treasury.receipt.create`, puis `ged.upload` pour upload | 2 modales successives; bonne distinction opération définitive/contrepassation |
| Enregistrer une sortie | même chemin, Nouvelle sortie | `treasury.disbursement.create` | identique; nombreux champs mais regroupement linéaire sans sous-sections |
| Consulter/filtrer le journal | module → Journal → 5 filtres | `treasury.view` | onglet perdu au F5; absence de recherche et d'en-têtes explicites; aucun détail dédié |
| Contrepasser | Journal → ligne → Contrepasser → motif/date | `treasury.reverse` | action claire et motivée; forte densité de ligne |
| Transférer | module → Comptes → Transférer → formulaire | `treasury.transfer.create` | action placée dans Comptes plutôt que dans Opérations; découvrabilité moyenne |
| Réserver des liquidités | module → Couverture → Réserver | `treasury.coverage.view`, `treasury.reservation.create` | formulaire contraint et explicatif; séparation réservation/mouvement bien annoncée |
| Traiter une réservation | Couverture → Réservations → action | permissions `treasury.reservation.*` | nombreuses actions côte à côte; selon statut, densité élevée |
| Gérer un budget | module → Budgets & engagements | `hr.budget.view` et permissions RH d'action | croisement de deux domaines et vocabulaires; source RH annoncée |
| Rapprocher une banque | module → Rapprochement → Importer → prévisualiser → valider → sélectionner ligne → candidats → rapprocher | permissions `treasury.reconciliation.*` | parcours cohérent mais plusieurs modales et aucun deep link vers un relevé |
| Configurer les flux | module → Configuration des flux | `treasury.account.manage` avec scope collectif | fonction d'administration avancée au même niveau que les opérations courantes |

## 6. Analyse de la navigation

**Vérifié :** une seule route `/treasury`, aucun sous-menu et aucune sous-route. L'onglet actif est un `useState<Tab>('overview')` (`TreasuryPage`, l. 153), donc :

- le rechargement revient à Vue d'ensemble ;
- Précédent/Suivant ne navigue pas entre les sections ;
- un lien direct vers Journal, Couverture ou Rapprochement est impossible ;
- les composants externes ne peuvent cibler qu'un module, pas une section.

La barre de huit boutons (`TreasuryPage`, l. 633-670) ne réutilise pas `components/ui/Tabs.tsx`, ne possède ni `role=tablist`, ni `aria-selected`, ni roving tabindex, ni touches fléchées. Son conteneur `flex gap-2 border-b` n'a ni wrap ni `overflow-x-auto` : sur mobile, le débordement est probable.

Le regroupement mélange quatre niveaux : synthèse, opérations, pilotage des engagements et administration. Les onglets Comptes/Catégories/Configuration des flux sont du paramétrage; Couverture/Budgets sont du pilotage; Journal/Rapprochement sont opérationnels. Les présenter au même niveau rend la hiérarchie métier peu visible.

## 7. Analyse de la cohérence métier

### Distinctions bien traitées

- une réservation « affecte la couverture, sans créer de mouvement » (`TreasuryPage`, modal Réserver) ;
- un rapprochement est un contrôle externe et ne crée/modifie aucune écriture Treasury (`BankReconciliationPanel`) ;
- les budgets distinguent enveloppe, engagé, décaissé, reste à payer et disponible ;
- les transferts internes sont séparés des entrées/sorties dans les KPI ;
- Facturation reste indépendante ;
- les opérations manuelles sont immuables, corrigées par contrepassation ;
- les devises sont séparées et jamais converties dans Couverture.

### Ambiguïtés

- le titre « Comptabilité & Trésorerie » suggère une comptabilité générale absente ;
- « Solde interne net » n'est pas rapproché visuellement au solde bancaire externe ;
- le compte affiche `balance`, tandis que le formulaire de réservation raisonne sur `available_balance`; la différence n'est expliquée que dans le message d'insuffisance ;
- « Entrées internes » et « Sorties internes » pourraient être compris comme transferts internes, alors qu'un KPI séparé affiche les transferts ;
- les statuts techniques de budgets et relevés sont parfois affichés bruts (`b.status`, `x.status`, `match_kind`) alors que les réservations sont traduites ;
- le Journal est financier/Treasury et non comptable, malgré le nom global du module.

## 8. Relations avec les autres modules

| Module | Relation frontend vérifiée |
|---|---|
| Facturation | les paiements et remboursements génèrent des mouvements via les flux configurés; les détails restent dans `/billing`; aucune duplication d'interface dans Treasury |
| Ventes | relation indirecte via factures/paiements et Dashboard; aucun lien direct Treasury → Vente |
| SAV / Atelier | règlements de garantie constructeur invalident `['treasury']`; les factures SAV restent dans Billing |
| Pièces | factures fournisseurs et règlements sont gérés dans `SupplierInvoicesPanel`; Treasury fournit les comptes/catégories et reçoit les effets financiers |
| RH | forte relation : budgets, dépenses, rémunérations et prestataires; `BudgetTreasuryPanel` consomme directement `hrHooks`; événements RH invalident Treasury |
| GED | justificatifs des opérations manuelles, avec aperçu/téléchargement/upload |
| Reporting | `/reports` présente des agrégats Treasury sous `treasury.view`/`treasury.coverage.view`; il n'est pas dupliqué dans la page |
| Dashboard | événements Treasury invalident l'agrégat Dashboard |

La séparation Facturation/Treasury est saine : Facturation documente créances et règlements; Treasury matérialise les flux de fonds. Aucune fusion n'est recommandée.

## 9. Permissions RBAC

### Accès et consultation

- `treasury.view` : garde de route, menu, comptes/catégories/synthèse/journal de base ;
- `treasury.coverage.view` : onglet Couverture, requêtes couverture/indicateurs ;
- `treasury.reservation.view` : liste et historique des réservations ;
- `treasury.reconciliation.view` : visibilité de l'onglet Rapprochement ;
- `hr.budget.view`, `hr.budget.fund.request.view`, `hr.approval.history.view` : contenu du panneau Budgets.

### Actions

- opérations : `treasury.receipt.create`, `treasury.disbursement.create`, `treasury.transfer.create`, `treasury.reverse` ;
- comptes/catégories : `treasury.account.manage`, `treasury.category.manage` ;
- réservations : `create`, `submit`, `approve`, `adjust`, `release`, `cancel`, `expire` sous `treasury.reservation.*` ;
- rapprochement : `treasury.reconciliation.import`, `.export`, `.reconcile`, `.cancel` ;
- documents : `ged.upload` pour ajouter un justificatif ;
- budgets : permissions `hr.budget.*` et `hr.budget.fund.*`.

### Scopes

`treasury.account.manage` refuse explicitement `OWN` et accepte un scope non nul; `treasury.category.manage` exige `CONCESSION` ou `GLOBAL` (`TreasuryPage`, l. 236-244). L'activation globale des flux exige également `CONCESSION` ou `GLOBAL`. Les listes et contrats backend portent agence/concession.

### Scénarios

1. **Toutes permissions :** huit onglets, toutes actions et modales.
2. **Consultation seule :** Vue d'ensemble, Comptes, Journal et Catégories restent visibles; actions masquées. Couverture/Rapprochement dépendent de permissions additionnelles.
3. **Opérations partielles :** les boutons Entrée/Sortie/Transfert/Contrepasser sont indépendants.
4. **Données partielles :** réservations et budgets peuvent être masqués séparément; le panneau Budget explique l'absence de `hr.budget.view`.
5. **Sans `treasury.view` :** `ModuleGuard` affiche `AccessDeniedPage` et la Sidebar masque le module.

Aucun rôle métier codé en dur n'a été identifié dans les composants Treasury.

## 10. Analyse des tableaux

### Journal financier

- présentation : grille de sept `span`, pas un `<table>` ;
- champs : date, compte, sens, montant, catégorie, référence/source/dépense/justificatifs, action/état ;
- filtres : compte, sens, catégorie, du, au ; pas de recherche ni tri ;
- pagination serveur 20 éléments et export CSV ;
- problème confirmé : seul le filtre Compte appelle `setPage(1)`; sens, catégorie et dates peuvent conserver une page devenue hors plage ;
- états chargement/erreur/vide : aucun rendu explicite trouvé ;
- responsive : `grid-cols-7` sans largeur minimale ni défilement horizontal ;
- statut : « Contrepassée » ou action Contrepasser.

### Rapprochement bancaire

- liste des relevés : compte/devise, période, statut, rapprochés/total, historique ; pagination cliente ;
- table des lignes : date, référence, libellé/doublon, montant, état/écart, action ;
- `overflow-x-auto` et `min-w-[700px]` ;
- aucun filtre de relevé/ligne ;
- export CSV et propositions ±7 jours ;
- état vide relevés présent; états chargement/erreur des listes peu explicites.

### Comptes et catégories

Listes en rangées flexibles, pagination cliente, états loading/error/empty explicites, actions d'administration conditionnelles. Pas de recherche ni filtre. Les montants sont formatés avec la devise. Les comptes montrent code, nom, type, rattachement, statut et solde. Les catégories montrent sens, description, usage et statut.

### Budgets et réservations

Listes riches en rangées/cartes plutôt que tables. Montants nombreux, correctement nommés, mais densité élevée. Les statuts Budget et Rallonge sont affichés bruts; les réservations ont une traduction française. Les actions de réservation peuvent occuper une longue ligne sur mobile.

### Flux automatiques

Table structurée avec six colonnes, `overflow-x-auto`, pagination cliente et actions. Elle concentre création au-dessus et édition/statut/suppression dans les lignes.

## 11. Analyse des formulaires

| Formulaire / modale | Champs principaux | Validations et observations |
|---|---|---|
| Entrée/Sortie manuelle | compte, montant, catégorie, motif, date, moyen, référence, contrepartie, remis à, clé idempotence | compte/catégorie filtrés, montant > 0, date non future, pending; formulaire linéaire dense |
| Réserver | compte, dépense, montant readonly, motif, bénéficiaire, échéance, référence | compatibilité territoire/devise, reste intégral, disponible, erreurs explicites |
| Décision réservation | motif | 3-500 caractères; même modale pour plusieurs décisions |
| Réduire réservation | nouveau montant, motif | maximum actuel, augmentation interdite |
| Compte | code, nom, description, type, rattachement, concession/agence | longueurs, format code, scopes, rattachement verrouillable; aucun solde saisi |
| Catégorie | code, nom, description, sens | validations équivalentes; code verrouillé en édition |
| Transfert | source, destination, montant, description | source/destination distinctes, même devise, disponible, date du jour |
| Contrepassation | contexte, motif, date | confirmation motivée; opération compensatrice |
| Import bancaire | fichier CSV, compte | type/taille/colonnes, prévisualisation avant validation |
| Rapprocher | candidat sélectionné | pas de choix automatique ambigu, idempotence |
| Budget/rallonge/clôture | montant ou motif selon action | permissions RH, clôture définitive et bloquants annoncés |
| Configuration flux | agence, moyen, compte | compte actif et territoire compatible |

Les modales partagent `Modal`, qui gère rôle dialog, aria, focus trap et restitution du focus. Le principal défaut est organisationnel : toutes les opérations restent orchestrées dans `TreasuryPage`, avec un grand nombre d'états locaux et de formulaires éloignés visuellement de leur section source dans le fichier.

## 12. Analyse des indicateurs

| Indicateur | Source / hook | Périmètre et emplacement |
|---|---|---|
| Solde interne net | `useTreasurySummary` → `/treasury/summary` | par devise, Vue d'ensemble |
| Entrées internes | même hook, `totalIn` | par devise |
| Sorties internes | même hook, `totalOut` | par devise |
| Transactions internes | même hook, `internalTransfers` | par devise |
| Solde de chaque compte | `useTreasuryAccounts` | Vue d'ensemble et Comptes |
| Trésorerie éligible / réservée / non affectée / engagements / insuffisance | `useTreasuryCoverage` | par devise, Couverture |
| Budget initial, allocations, engagé, décaissé, reste, disponible | `useTreasuryBudgetIndicators` | Couverture et Budgets |
| Crédits, débits, clôture de relevé | `useBankStatement` | Rapprochement |

Les hooks utilisent le `staleTime` global de 30 secondes (`frontend/src/queryClient.ts`) sauf configuration spécifique absente. Les événements temps réel invalident le préfixe `['treasury']`.

Risques de confusion : le KPI « Transactions internes » est formaté comme une monnaie alors que son nom pourrait suggérer un nombre; le type backend doit confirmer qu'il s'agit bien d'un montant. Le mot « interne » est surchargé. `balance` et `available_balance` ne sont pas comparés dans une même carte.

## 13. Hooks et gestion des données

### Clés et API

Les clés racines sont toutes sous `['treasury']` : accounts, territories, categories, summary, coverage, budget-indicators, reservations, reservation-expenses, flow, manual-options et journal sérialisé (`treasuryHooks.ts`, l. 181-194). Les relevés, détails, historiques et propositions suivent le même préfixe.

Toutes les mutations financières principales invalident `keys.all`; les actions de mapping seules invalident `keys.flow`. Les mutations RH concernées invalident aussi Treasury. `AppBootstrap` écoute six événements Treasury et invalide Treasury, budgets/dépenses RH et Dashboard.

### Requêtes simultanées confirmées

À l'ouverture de `/treasury`, `TreasuryPage` monte immédiatement :

- comptes, catégories, synthèse et Journal, quel que soit l'onglet actif ;
- couverture et indicateurs si `treasury.coverage.view`, même sur Vue d'ensemble ;
- réservations si `treasury.reservation.view` ;
- territoires et flux si l'utilisateur gère les comptes ;
- options manuelles seulement quand une modale manuelle est ouverte ;
- dépenses réservables seulement quand la modale Réserver est ouverte.

`BudgetTreasuryPanel` et `BankReconciliationPanel` ne sont montés que lorsque leur onglet est actif, ce qui est préférable. La cible devrait appliquer la même activation conditionnelle aux autres sections.

### États locaux

L'onglet, la page du journal, cinq filtres et tous les formulaires/modales sont locaux à `TreasuryPage`. Les filtres ne sont pas dans l'URL. L'invalidation par préfixe est robuste, mais recharge potentiellement plusieurs requêtes non visibles après chaque mutation.

## 14. Responsive et accessibilité

### Vérifications statiques

- cartes KPI : `md:grid-cols-4`, couverture `lg:grid-cols-2`, formulaires souvent en grille ;
- rapprochement : colonnes 1/2 à `lg`, vraie table scrollable de 700 px minimum ;
- tables de flux : scroll horizontal ;
- journal : grille fixe sept colonnes, non scrollable, risque élevé d'écrasement mobile ;
- barre des huit onglets : ni wrap ni scroll déclaré ;
- boutons d'actions utilisent souvent `flex-wrap`, mais pas tous ;
- modales partagées accessibles ;
- barre locale Treasury non accessible comme onglets, malgré l'existence de `Tabs` partagé ;
- plusieurs champs utilisent seulement un placeholder sans `<label>` visible, notamment les formulaires manuels et certains sélecteurs.

Aucune inspection navigateur réelle, tablette ou mobile n'a été réalisée. Ces constats sont statiques et ne constituent pas une recette visuelle.

## 15. Problèmes identifiés et priorités

| ID | Niveau | Constat / chemin | Impact | Recommandation |
|---|---|---|---|---|
| TREAS-ERG-01 | Majeur | `/treasury` → barre de 8 onglets; `TreasuryPage` l. 633-670 | sections non partageables, F5 et historique perdent le contexte | URL par section ou query param synchronisé |
| TREAS-ERG-02 | Majeur | Journal; l. 1069-1119 | sept colonnes sans en-tête ni responsive, risque de lecture erronée montant/source/action | vraie table avec en-têtes, largeur minimale et scroll |
| TREAS-ERG-03 | Majeur | ouverture `/treasury`; hooks l. 222-251 | requêtes masquées et rechargements inutiles après mutations | activer les hooks selon la section active |
| TREAS-ERG-04 | Majeur | composant `TreasuryPage` > 2 100 lignes | forte responsabilité, régression probable lors d'une évolution | extraire sections et modales sans changer les règles |
| TREAS-ERG-05 | Modéré | Journal, changement sens/catégorie/dates | page non remise à 1, résultat vide possible à tort | reset cohérent de page pour tous les filtres |
| TREAS-ERG-06 | Modéré | Journal | pas d'état loading/error/empty explicite | états partagés et relance |
| TREAS-ERG-07 | Modéré | barre d'onglets | clavier/ARIA/mobile insuffisants | réutiliser `components/ui/Tabs` ou liens accessibles |
| TREAS-ERG-08 | Modéré | titre module + Journal | confusion possible avec comptabilité générale | expliciter « Trésorerie » et le périmètre; ne pas promettre grand livre/balance |
| TREAS-ERG-09 | Modéré | Couverture/Budgets | informations proches réparties sur deux onglets, budgets répétés | regrouper synthèse des engagements, conserver détails spécialisés |
| TREAS-ERG-10 | Modéré | Comptes/Catégories/Flux | paramétrage au même niveau que tâches courantes | regrouper dans Paramétrage |
| TREAS-ERG-11 | Mineur | statuts Budget/Relevé/Match | codes bruts parfois affichés | dictionnaires de libellés français |
| TREAS-ERG-12 | Mineur | formulaires | placeholders servant de labels | labels persistants et aides contextualisées |

Aucune anomalie critique confirmée n'a été trouvée dans les calculs financiers. TREAS-ERG-02 est néanmoins un risque de lecture important, pas une preuve d'erreur financière déjà survenue.

## 16. Comparaison des options A, B et C

| Critère | A — améliorer la page | B — sections séparées | C — hybride |
|---|---|---|---|
| Principe | garder huit onglets locaux, améliorer hiérarchie/UI | une route par fonction | synthèse centrale + 4 sections spécialisées |
| Composants concernés | 3-5 | 8-12 | 7-10 |
| Routes | aucune | plusieurs nouvelles routes | 4 routes ou paramètres URL stables |
| Hooks | activation conditionnelle possible | naturellement isolés | isolés par section, synthèse minimale |
| RBAC | simple mais barre variable complexe | garde par section à composer | navigation filtrée + permissions fines internes |
| UX | amélioration rapide, densité demeure | claire mais fragmentation forte | équilibre entre pilotage et opérations |
| Deep links / F5 | faibles sans ajout URL | excellents | excellents |
| Risque | faible à moyen | moyen à élevé | moyen |
| Complexité | faible | élevée | moyenne |

Option A ne résout ni la route unique ni le composant monolithique. Option B risque de créer trop de pages et de séparer artificiellement des fonctions couplées. Option C conserve une synthèse utile tout en sortant les tâches spécialisées.

## 17. Proposition d'architecture cible

```text
Comptabilité & Trésorerie
├── Synthèse                    /treasury
├── Opérations & Journal       /treasury/operations
├── Engagements                /treasury/commitments
├── Rapprochement bancaire     /treasury/reconciliation
└── Paramétrage                /treasury/settings
```

### Synthèse

- responsabilité : position de trésorerie par devise et comptes accessibles ;
- réutilise KPI et liste de Vue d'ensemble ;
- permissions : `treasury.view` ;
- modifications : extraction d'un `TreasuryOverviewSection`, chargement limité comptes+synthèse.

### Opérations & Journal

- entrées/sorties, transfert, journal, justificatifs, contrepassation et export ;
- réutilise formulaire manuel, transfert, Journal et `TreasuryManualDocuments` ;
- permissions existantes `treasury.view`, receipt/disbursement/transfer/reverse ;
- route envisagée `/treasury/operations`.

### Engagements

- couverture, budgets, réservations et demandes de rallonge ;
- fusionne les informations complémentaires, sans fusionner les contrats Treasury et RH ;
- réutilise Couverture et `BudgetTreasuryPanel` ;
- permissions coverage/reservation et `hr.budget.*` ;
- route `/treasury/commitments`.

### Rapprochement bancaire

- réutilise intégralement `BankReconciliationPanel` ;
- garde `treasury.reconciliation.view`; actions fines inchangées ;
- route `/treasury/reconciliation`.

### Paramétrage

- sous-navigation Comptes, Catégories, Flux automatiques ;
- réutilise les listes/modales et `TreasuryFlowMappingsTable` ;
- consultation de comptes/catégories selon `treasury.view`, mutations selon manage et scopes ;
- route `/treasury/settings`.

Les routes sont des propositions. Une première implémentation peut utiliser `?section=` pour préserver une seule route, mais des sous-routes sont préférables pour le partage, le rechargement et le lazy loading. Facturation reste `/billing`.

## 18. Analyse d'impact

### Fichiers probablement concernés

- `frontend/src/modules/treasury/TreasuryPage.tsx` : découpage du conteneur ;
- nouveaux composants de section dans `frontend/src/modules/treasury/` ;
- `frontend/src/App.tsx` et `frontend/src/navigation/routes.ts` : routes stables ;
- éventuellement `Sidebar.tsx` seulement si une sous-navigation est décidée, sans dupliquer les entrées ;
- `frontend/src/api/treasuryHooks.ts` : idéalement aucun contrat changé, uniquement usage conditionnel ;
- tests Treasury cités ci-dessous.

### Risques

- perdre l'état d'une modale lors d'une navigation ;
- modifier involontairement les invalidations croisées RH/Treasury ;
- rendre une section accessible sans `treasury.view` ou masquer une action fine ;
- casser les scopes AGENCY/CONCESSION/GLOBAL ;
- confondre budget engagé et mouvement décaissé ;
- dupliquer les requêtes ou composants pendant la transition ;
- casser l'entrée `/treasury` existante ou les tests statiques fortement liés au fichier monolithique.

### Compatibilité recommandée

Conserver `/treasury` comme synthèse et destination Sidebar, déclarer les segments statiques avant toute route dynamique éventuelle, filtrer la navigation par permissions existantes, ne pas changer les clés de cache ni les endpoints, et livrer le découpage en deux lots : extraction sans changement fonctionnel, puis navigation URL/chargement conditionnel.

## 19. Tests à prévoir

### Tests existants à adapter

- `treasury-foundation.test.ts` : route, permissions, soldes et actions ;
- `treasury-accounts-ux.test.ts`, `treasury-categories-ux.test.ts` : extraction des référentiels ;
- `treasury-manual-operations.test.ts`, `treasury-manual-closure.test.ts` : formulaires, immutabilité, GED ;
- `treasury-flow-integration.test.ts` : mappings et sources ;
- `treasury-functional-corrections.test.ts` : filtres, rapprochement, historique ;
- `fin03-treasury-coverage.test.ts`, `budget-treasury-integration.test.ts` : engagements ;
- `fin08-financial-ux.test.ts` : navigation, accessibilité, responsive et intermodules ;
- `rh-treasury-*`, `tres-financial-workflows.test.ts`, `treasury-realtime-attachment.test.ts` : intégrations et invalidations ;
- `route-lazy-loading.test.ts` et `navigation.test.ts` si de nouvelles pages/routes sont créées.

### Couverture nouvelle nécessaire

- URL, rechargement, précédent/suivant pour chaque section ;
- permissions de visibilité et d'accès direct ;
- absence de requêtes des sections inactives ;
- reset de page pour chacun des cinq filtres Journal ;
- chargement/erreur/vide du Journal ;
- tableau Journal et navigation clavier/mobile ;
- conservation des actions Entrée/Sortie/Transfert/Contrepassation ;
- invalidations après mutation et événement temps réel ;
- profils multi-agences et absence de fuite inter-agences ;
- non-régression `/billing`, RH dépenses/budgets, fournisseurs, garanties et GED.

Aucun test n'a été modifié ou créé pendant cet audit.

## 20. Recommandation finale

Retenir l'option C avec une synthèse et quatre sections URL-synchronisées. Le premier objectif doit être structurel, pas visuel : extraire les responsabilités de `TreasuryPage`, conditionner les requêtes à la section active et préserver strictement les contrats financiers.

Ordre conseillé pour une future mission :

1. extraire les sections et modales sans changer routes, hooks ou règles ;
2. introduire une navigation accessible et synchronisée à l'URL ;
3. corriger le Journal (table, états, responsive, reset filtres) ;
4. regrouper Comptes/Catégories/Flux sous Paramétrage ;
5. regrouper Couverture/Budgets/Réservations sous Engagements ;
6. vérifier les quatre profils RBAC, scopes et agences ;
7. exécuter lint, build, tests Treasury ciblés puis suite frontend complète.

Ne pas ajouter de section « Comptabilité générale » tant que les fonctions correspondantes n'existent pas. Une décision produit séparée pourra soit renommer l'entrée « Trésorerie », soit définir un véritable périmètre comptable futur. Dans tous les cas, Facturation doit rester indépendante sous `/billing`.
