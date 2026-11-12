# ERP LCA — Audit frontend Ventes, Devis et Factures

> Audit statique du dépôt au 12 novembre 2026. Les éléments marqués **Vérifié** sont directement établis par le code cité. Les éléments marqués **Hypothèse / proposition** décrivent une cible à valider lors d'une future implémentation. Aucun composant, hook, style, route, test, service ou contrat backend n'a été modifié dans le cadre de cet audit.

## 1. Synthèse exécutive

### Conclusion principale

**Vérifié — le constat de départ ne correspond pas à l'implémentation actuelle.** La page `/sales` n'empile pas un tableau Devis puis un tableau Factures. Elle affiche, dans cet ordre, des KPI et filtres de ventes, le tableau **« Propositions et devis »**, puis le tableau **des ventes**. Le tableau des factures appartient déjà à une page, une route et un module distincts : `/billing` (`BillingPage`).

Cette distinction est structurante :

- les devis sont une vue secondaire intégrée à `SalesListPage`, tandis que leur cycle de création, modification, validation, annulation et conversion se déroule principalement dans le CRM ;
- les ventes constituent le cœur de `/sales` et pilotent la création d'une facture associée ;
- les factures relèvent de `/billing`, avec KPI financiers, recherche et filtres propres, création, export, encaissements, avoirs et archivage ;
- les gardes de route diffèrent : `sales.view` pour `/sales`, `billing.view` pour `/billing`, puis des permissions fines telles que `quotations.view` et `billing.invoice.view` à l'intérieur des pages.

**Recommandation : option B, routes dédiées, en conservant `/billing` comme route canonique des factures.** Si l'objectif produit reste une navigation visuelle « Devis | Factures », elle doit être une navigation inter-routes et non deux gros panneaux remontés dans un même composant. La cible la plus cohérente serait une route dédiée à la liste des devis (par exemple `/sales/quotations`, sous réserve de validation produit) et un lien « Factures » vers `/billing`. Le tableau Ventes doit rester une troisième responsabilité explicite, et non disparaître implicitement.

L'option C peut être retenue uniquement si le produit exige absolument l'apparence d'onglets : les onglets devront alors naviguer entre des URL canoniques distinctes, sans monter simultanément les requêtes Devis et Factures. L'option A est déconseillée, car elle mélangerait deux modules, deux gardes de route et deux ensembles de KPI/actions.

## 2. Cartographie des composants

| Fichier / composant | Responsabilité vérifiée | Dépendances principales |
|---|---|---|
| `frontend/src/modules/sales/SalesListPage.tsx` — `SalesListPage` (l. 31-219) | Page `/sales`; KPI Ventes, filtres Ventes, liste Devis, liste Ventes, paginations indépendantes et ouverture du wizard de vente | `useSalesPageQuery`, `useQuotationsPageQuery`, `useRetryQuotationArchive`, `SaleWizardModal`, `Card`, `Button`, `TableEmptyState`, `StatusBadge`, `useAuthStore` |
| `frontend/src/modules/sales/SaleWizardModal.tsx` — `SaleWizardModal` | Création d'une vente, affichée depuis `SalesListPage` | hooks Ventes, permissions `sales.create`/`sales.assign`, modale UI |
| `frontend/src/modules/sales/SaleDetailPage.tsx` — `SaleDetailPage` | Détail et workflow d'une vente; liens vers livraison et facturation; création de facture préremplie via `?saleId=` | hooks vente/facture, `detailRoutes`, permissions ventes, livraison et facturation |
| `frontend/src/modules/crm/CrmPage.tsx` — `CrmPage` | Lieu principal du cycle métier des devis associés à une opportunité : consultation, création, édition, validation, annulation et conversion | hooks devis/CRM, `QuotationModal`, permissions `quotations.*` et `sales.create` |
| `frontend/src/modules/crm/QuotationModal.tsx` — `QuotationModal` | Formulaire de création/édition d'un devis et règles de remise/fiscalité | `useCreateQuotation`, configuration devis, `quotations.discount.manage`, `sales.tax.override` |
| `frontend/src/modules/billing/BillingPage.tsx` — `BillingPage` (l. 17-42) | Page `/billing`; KPI facturation, recherche/filtres, tableau Factures, pagination, export CSV, création de facture | `useInvoicesPageQuery`, `useBillingConfigQuery`, `NewInvoiceModal`, `apiDownload`, composants UI, permissions `billing.*` |
| `frontend/src/modules/billing/NewInvoiceModal.tsx` — `NewInvoiceModal` | Création de facture, notamment à partir d'une vente passée par `saleId` | hook de création, configuration de facturation, paramètres de vente |
| `frontend/src/modules/billing/InvoiceDetailPage.tsx` — `InvoiceDetailPage` | Consultation et actions d'une facture : édition brouillon, émission, annulation, PDF, impression, encaissements, avoirs/remboursements et archivage | hooks facture/actions, composants de paiement, permissions fines `billing.*` |
| `frontend/src/api/erpHooks.ts` — hooks Ventes/Devis/Factures | Appels API, mapping, clés de cache et invalidations | TanStack React Query, `apiRequest`, `erpKeys` |
| `frontend/src/App.tsx` — `ModuleGuard`, routes | Déclare les routes de liste/détail et protège les modules avec les permissions dynamiques | React Router, `MODULE_PERMISSION` |
| `frontend/src/components/layout/Sidebar.tsx` — `Sidebar` | Entrées latérales séparées « Ventes & Devis » et « Facturation & Règl. » | `ROUTES`, `canNavigateWithPermissions`, permissions dynamiques |
| `frontend/src/navigation/routes.ts` | Constantes et fabriques de routes profondes; routage des notifications | `ROUTES.sales`, `ROUTES.billing`, `detailRoutes.sale`, `detailRoutes.invoice` |

Il n'existe pas de sous-composant dédié au tableau Devis dans `SalesListPage` : son JSX est intégré en une seule expression à la ligne 135. Le tableau Factures est également intégré dans `BillingPage` aux lignes 36-40. Une séparation future devrait d'abord extraire ces panneaux en composants présentatifs sans déplacer leur logique métier.

## 3. Structure actuelle de la page

### `/sales`

**Vérifié** dans `frontend/src/modules/sales/SalesListPage.tsx`, composant `SalesListPage` :

```text
Ventes & Propositions Commerciales
├── En-tête, fil d'Ariane et bouton Nouvelle Vente (si sales.create)
├── 3 KPI Ventes
│   ├── Chiffre d'affaires Ventes
│   ├── Taux de pénétration financement
│   └── Panier moyen véhicule
├── Barre de recherche + filtre de statut
│   └── Ces contrôles agissent uniquement sur les ventes
├── Carte « Propositions et devis » (si quotations.view)
│   ├── Tableau Devis
│   └── Pagination Devis indépendante
├── Carte Tableau Ventes
│   ├── États erreur/chargement/vide
│   └── Pagination Ventes indépendante
└── SaleWizardModal
```

Le tableau Devis apparaît avant le tableau Ventes (`SalesListPage`, l. 135 puis l. 137-210). Il possède son titre et sa pagination, mais aucun contrôle de recherche ou filtre local. Les filtres visuellement placés au-dessus sont branchés seulement sur `useSalesPageQuery` (l. 32-39, 105-133). Les deux listes ont des états de page distincts (`salesPage`, `quotationPage`, l. 34).

### `/billing`

**Vérifié** dans `frontend/src/modules/billing/BillingPage.tsx`, composant `BillingPage` :

```text
Facturation, Encaissements & Règlements
├── En-tête
│   ├── Export (si billing.export)
│   └── Créer facture (si billing.invoice.create)
├── 1 à 5 KPI selon billing.payment.view
├── Recherche avec temporisation 300 ms
├── Filtres statut, type et période
├── Erreur éventuelle
├── Tableau Factures
│   ├── États chargement/vide/aucun résultat
│   └── Pagination indépendante
└── NewInvoiceModal
```

Il n'existe donc aucun élément « entre les deux tableaux Devis et Factures », puisqu'ils ne sont pas sur la même page ni dans le même module.

## 4. Fonctionnalités du tableau Devis

### Liste intégrée à `/sales`

Fonctionnalités **vérifiées** dans `SalesListPage` :

- affichage paginé de 7 devis via `useQuotationsPageQuery({page, pageSize: 7}, canViewQuotations)` (`SalesListPage.tsx`, l. 37-40) ;
- colonnes Référence, Client, Véhicule, Commercial, Montant, Statut et Actions (l. 135) ;
- état vide « Aucun devis » et erreur explicite ;
- action PDF via `openBusinessPdf('quotation', quote.id)` ;
- blocage du PDF si une archive officielle attendue n'est pas disponible ;
- affichage de l'état d'archivage et action « Finaliser l'archivage » selon statut et `quotations.validate` ;
- pagination Précédent/Suivant et correction de page à partir de la réponse serveur (l. 47 et 135) ;
- masquage complet de la carte et désactivation de la requête sans `quotations.view`.

Limitations **vérifiées** de cette liste :

- aucune recherche, aucun filtre et aucun tri exposé ;
- aucune ouverture d'un détail de devis ;
- aucun lien vers l'opportunité, le client ou une vente associée ;
- aucune création, édition, annulation ou conversion directement depuis cette table ;
- le statut est rendu comme texte brut, pas via `StatusBadge` ;
- aucun état de chargement explicite : pendant le premier chargement, le corps reste vide, puis l'état vide n'apparaît qu'après chargement.

### Cycle complet disponible dans le CRM

Les capacités qui doivent être préservées lors d'une séparation ne se limitent pas à `SalesListPage`. **Vérifié** dans `frontend/src/modules/crm/CrmPage.tsx` et `QuotationModal.tsx` :

- lecture des devis d'une opportunité sous `quotations.view` ;
- création sous `quotations.create` ;
- modification, validation (`quotations.validate`), annulation/rejet (`quotations.cancel`) ;
- conversion sous la double condition `quotations.convert` et `sales.create` ;
- contrôle préventif de l'expiration avant conversion ;
- remise sous `quotations.discount.manage` ;
- génération de pro forma et archivage/PDF selon les actions disponibles dans la fiche CRM.

**Conséquence :** déplacer visuellement la liste ne doit pas dupliquer le workflow CRM ni transformer la liste globale en second éditeur de devis sans décision produit explicite.

## 5. Fonctionnalités du tableau Factures

Fonctionnalités **vérifiées** dans `BillingPage` :

- liste paginée par 7, restreinte à l'agence active (`BillingPage.tsx`, l. 18-29) ;
- recherche temporisée de 300 ms sur facture, client, vente ou OR ;
- filtres statut, type, date de début et date de fin ;
- remise à la page 1 lors d'un changement de filtre ou d'agence ;
- colonnes Facture, Client, Type/Source, Émission/Échéance, Total, Encaissé, Reste, Statut, Action ;
- ouverture du détail par clic de ligne ou bouton « Détails » vers `/billing/:id` ;
- lien vers l'OR si la facture est issue du SAV et si `service.order.view` est accordée ;
- masquage des montants encaissés et restants sans `billing.payment.view` ;
- KPI facturé et, sous `billing.payment.view`, encaissé, dû, échu et taux d'encaissement ;
- création via `NewInvoiceModal` sous `billing.invoice.create` ;
- ouverture automatique de cette modale depuis `/billing?saleId=...` ;
- export CSV sous `billing.export` ;
- états chargement, erreur, liste vide et aucun résultat filtré distincts ;
- pagination Précédent/Suivant.

Fonctionnalités **vérifiées** sur `/billing/:id` dans `InvoiceDetailPage` et ses composants :

- PDF officiel, téléchargement et impression ;
- modification et émission du brouillon ;
- annulation ;
- consultation et collecte de paiements ;
- création d'avoirs et remboursement du reliquat autorisé ;
- finalisation d'archive manquante ;
- permissions séparées pour chaque action.

Limitations **vérifiées** de la liste :

- aucun tri interactif ;
- le lien vers une vente source n'est pas exposé comme navigation depuis le tableau ; `relatedDocNumber` est un texte sauf pour un OR ;
- les filtres et la page sont des états React locaux, non sérialisés dans l'URL ; seul `saleId` est lu dans l'URL pour la création.

## 6. Routes et navigation

### Routes canoniques

| URL | Écran | Garde de module | Référence |
|---|---|---|---|
| `/sales` | `SalesListPage` | `sales.view` | `frontend/src/App.tsx`, `MODULE_PERMISSION` l. 62 et route l. 89 |
| `/sales/:id` | `SaleDetailPage` | `sales.view` | `frontend/src/App.tsx`, l. 90 |
| `/billing` | `BillingPage` | `billing.view` | `frontend/src/App.tsx`, l. 105 |
| `/billing/:id` | `InvoiceDetailPage` | `billing.view` | `frontend/src/App.tsx`, l. 106 |

`frontend/src/navigation/routes.ts` définit `ROUTES.sales`, `ROUTES.billing`, `detailRoutes.sale()` et `detailRoutes.invoice()` (l. 1-41). Il n'existe aucune route globale ou de détail propre aux devis.

### Menu latéral

**Vérifié** dans `Sidebar` :

- « Ventes & Devis » pointe vers `/sales`, section « Commercial & Ventes » (`Sidebar.tsx`, l. 85-110) ;
- « Facturation & Règl. » pointe vers `/billing`, section « Finance & Pilotage » (l. 149-157) ;
- les entrées sont filtrées par les permissions de module via `canNavigateWithPermissions` (l. 228).

### Liens entrants et sortants significatifs

- `SaleDetailPage` renvoie à `/sales`, ouvre `/deliveries?saleId=...`, ouvre la facture existante et propose `/billing?saleId=...` pour créer une facture de vente (`frontend/src/modules/sales/SaleDetailPage.tsx`, notamment l. 47, 103, 278).
- `BillingPage` consomme `saleId`, ouvre `NewInvoiceModal`, puis nettoie le paramètre à la fermeture (`BillingPage.tsx`, l. 18, 23, 40).
- `RepairOrderDetailPage` et les panneaux SAV ouvrent les factures par `detailRoutes.invoice()` ; `BillingPage` peut revenir vers un OR.
- `DeliveryDetailPage` affiche la situation financière de la vente, sans rediriger la liste des factures.
- les notifications de type `sale` ouvrent `/sales/:id`; celles de type `invoice` ouvrent `/billing/:id`; `payment` et `credit_note` ouvrent `/billing` (`routes.ts`, l. 43-60).
- le portail des modules et le tableau de bord exposent séparément les routes Sales et Billing.
- le CRM ne possède pas de lien global direct vers la liste Devis : il gère les devis dans le contexte de l'opportunité.
- Stock Véhicules n'a pas de lien direct vérifié vers la liste Devis ou Factures.
- Trésorerie est une route sœur (`/treasury`), pas une enveloppe de `/billing`.

Tout changement de route doit préserver au minimum `/sales`, `/sales/:id`, `/billing`, `/billing/:id` et `/billing?saleId=...` comme URL canoniques ou redirections compatibles.

## 7. Composants de design réutilisables

### Composants existants à conserver

- `PageHeader` pour titres, sous-titres, fil d'Ariane et actions ;
- `Card` pour les panneaux et KPI ;
- `Button` pour actions et pagination ;
- `Badge` et `StatusBadge` pour indicateurs et statuts ;
- `TableEmptyState` pour chargement et absence de résultats ;
- Tailwind utilitaire pour grille responsive, espacements `space-y-6`, bordures slate, fond blanc et accent principal bordeaux `#8f1722` ;
- icônes Lucide.

### Onglets

**Vérifié — aucun composant générique `Tabs` n'a été trouvé.** Plusieurs pages implémentent des navigations locales ad hoc :

- `VehicleDetailPage` utilise un état `activeTab` et des boutons, sans synchronisation d'URL (`frontend/src/modules/vehicles/VehicleDetailPage.tsx`, autour des l. 67 et 258-281) ;
- `SparePartsPage` utilise `activeTab` et des `Button` conditionnels (`frontend/src/modules/parts/SparePartsPage.tsx`, l. 22, 34-40) ;
- `SettingsPage` utilise `useSearchParams` pour synchroniser sa section avec `?tab=` (`frontend/src/modules/settings/SettingsPage.tsx`, à partir de la l. 37).

**Point d'accessibilité :** les pseudo-onglets repérés ne constituent pas une preuve d'un composant accessible réutilisable avec `role="tablist"`, `role="tab"`, `aria-selected` et navigation clavier. Une future barre Devis/Factures devrait soit être une simple navigation de liens clairement nommée, soit introduire un composant d'onglets accessible testé ; elle ne devrait pas copier aveuglément les boutons locaux.

## 8. Permissions

### Permissions actuellement utilisées

| Domaine | Permissions frontend vérifiées |
|---|---|
| Accès module Ventes | `sales.view` dans `App.tsx`/`ModuleGuard` |
| Lecture liste Devis | `quotations.view` dans `SalesListPage` et `CrmPage` |
| Création Devis | `quotations.create` dans le CRM |
| Validation / archivage Devis | `quotations.validate` |
| Annulation Devis | `quotations.cancel` |
| Conversion Devis | `quotations.convert` **et** `sales.create` |
| Remise Devis | `quotations.discount.manage` |
| Accès module Facturation | `billing.view` dans `App.tsx`/`ModuleGuard` |
| Lecture Factures | `billing.invoice.view` active la requête de `BillingPage` |
| Création Facture | `billing.invoice.create` |
| Mise à jour / émission / annulation | `billing.invoice.update`, `billing.invoice.issue`, `billing.invoice.cancel` |
| Lecture / collecte / remboursement paiements | `billing.payment.view`, `billing.payment.collect`, `billing.payment.refund` |
| Export | `billing.export` |

Il existe une nuance importante : la route `/sales` exige `sales.view` avant même que la carte Devis ne teste `quotations.view`; la route `/billing` exige `billing.view` avant que la page ne teste `billing.invoice.view`. Par conséquent, les permissions fines seules ne suffisent pas toujours à rendre les pages atteignables.

### Scénarios de visibilité futurs, sans nouveau RBAC

1. **Devis + Factures :** afficher les deux destinations; destination initiale à définir explicitement (par exemple dernière URL visitée, sinon Devis).
2. **Devis seulement :** afficher uniquement Devis si l'utilisateur possède à la fois l'accès à la route hôte et `quotations.view`; ne pas afficher un onglet Factures désactivé.
3. **Factures seulement :** afficher uniquement Factures si `billing.view` et `billing.invoice.view`; l'utilisateur ne doit pas être forcé de transiter par `/sales`.
4. **Aucune :** masquer la navigation; laisser les gardes existantes rendre `AccessDeniedPage` sur accès direct.

**Hypothèse à valider :** certains jeux de permissions peuvent contenir `quotations.view` sans `sales.view`, ou `billing.invoice.view` sans `billing.view`. L'UI ne doit pas tenter de corriger cette incohérence en contournant `ModuleGuard`; la matrice de permissions serveur doit rester l'autorité.

## 9. Hooks et gestion des données

### Requêtes et cache

- `useSalesPageQuery` : clé `['sales', 'page', filters]`, GET `/sales`, mapping des statuts et synthèse Ventes (`erpHooks.ts`, l. 605).
- `useQuotationsPageQuery` : clé `['quotations', 'page', filters]`, GET `/quotations` (`erpHooks.ts`, l. 607).
- `useInvoicesPageQuery` : clé `['invoices', 'page', filters]`, transforme `agencyId` en `billingAgencyId`, GET `/invoices`, mapping Factures (`erpHooks.ts`, l. 646).
- `useBillingConfigQuery` : clé `['billing-config', agencyId]`, cache frais pendant 5 minutes (`erpHooks.ts`, l. 649).
- configuration globale : `staleTime: 30 000`, un retry, pas de refetch au focus (`frontend/src/queryClient.ts`, l. 2).

Les objets `filters` participent aux clés : chaque page et combinaison de filtres possède donc son entrée de cache. Aucun `placeholderData`/`keepPreviousData` n'est configuré pour ces trois listes ; un changement de page peut donc rendre temporairement le tableau vide avant la nouvelle réponse.

### Chargement simultané

**Vérifié :** sur `/sales`, les requêtes Ventes et Devis sont montées au même rendu et partent simultanément si le jeton existe et si `quotations.view` est accordée (`SalesListPage.tsx`, l. 35-40). La liste Factures n'est pas chargée sur cette page. Sur `/billing`, Factures et configuration Billing sont chargées simultanément (`BillingPage.tsx`, l. 25-28).

Une séparation visuelle de Devis et Ventes dans `/sales` pourrait éviter une des deux requêtes en passant l'onglet actif comme `requestEnabled`. Une navigation entre routes Devis et Factures évite naturellement tout chargement croisé. Monter `BillingPage` dans un onglet masqué sans condition ne procurerait aucun gain.

### Invalidations à préserver

- création/mise à jour/validation/annulation/archivage d'un devis invalident `erpKeys.quotations` et souvent `erpKeys.leads` (`erpHooks.ts`, l. 513 et 521-524) ;
- création de vente invalide Ventes, Véhicules et Factures (`erpHooks.ts`, autour des l. 842-845) ;
- les actions Billing invalident Factures, Ventes et OR (`erpHooks.ts`, autour des l. 899-902) ;
- les événements temps réel de `AppBootstrap` invalident notamment Devis et Factures sous leurs clés racines.

La hiérarchie des clés permet aux invalidations racines d'atteindre les pages filtrées. Une extraction en composants ne doit pas modifier ces clés.

### États locaux et URL

- `/sales` conserve recherche, statut, page Ventes et page Devis uniquement en mémoire ;
- `/billing` conserve recherche, filtres et page en mémoire ; `saleId` seul est dans l'URL ;
- un démontage de panneau réinitialisera donc ses filtres et sa pagination au remontage ;
- des routes dédiées réinitialisent également les états à la navigation, sauf sérialisation future dans l'URL ou conservation par une enveloppe commune.

Cette sérialisation serait une amélioration possible, mais elle dépasse la simple séparation visuelle et doit être traitée comme un lot distinct.

## 10. Responsive et ergonomie

### Comportement vérifié

- les deux tableaux sont enveloppés dans `overflow-x-auto` : sur petit écran, ils défilent horizontalement au lieu de se transformer en cartes ;
- `/sales` empile ses trois KPI en mobile puis passe à trois colonnes dès `sm`; recherche et filtre passent d'une colonne à une ligne à `sm` ;
- `/billing` passe ses KPI à 2 colonnes à `sm`, puis 5 à `lg`; la barre de filtres utilise `flex-wrap`, avec une recherche `min-w-64` ;
- les actions d'en-tête et paginations utilisent des conteneurs `flex` qui peuvent devenir serrés sur de très petits écrans ; aucune variante mobile dédiée n'a été trouvée ;
- la sidebar devient un menu mobile géré par `mobileMenuOpen`, indépendamment des tableaux.

### Évaluation

- l'empilement actuel de Devis puis Ventes allonge fortement `/sales` sur mobile ; une section active unique améliore le parcours vertical ;
- une navigation entre routes est plus robuste sur mobile qu'un grand écran combinant les filtres Ventes, Devis et Factures ;
- si une barre visuelle Devis/Factures est ajoutée, elle doit autoriser le wrap ou le défilement horizontal, conserver une cible tactile suffisante et annoncer clairement l'état actif ;
- les tableaux eux-mêmes resteront larges : la séparation ne résout pas leur ergonomie interne, mais réduit le nombre de tableaux successifs.

Aucun test automatisé de viewport ou de débordement responsive spécifique à ces écrans n'a été identifié.

## 11. Tests existants

La majorité des tests concernés sont des tests de contrat statique qui lisent les sources avec des expressions régulières, et non des tests DOM complets.

| Test | Couverture vérifiée | Impact futur probable |
|---|---|---|
| `frontend/test/quotations-dynamic-rbac.test.ts` | requête Devis conditionnée par `quotations.view`, permissions indépendantes, absence de rôles codés en dur | adapter les chemins/composants si le tableau est extrait ou routé |
| `frontend/test/sales-dynamic-rbac.test.ts` | `sales.create`, garde `sales.view`, permissions détail | adapter uniquement les assertions qui ciblent `SalesListPage` |
| `frontend/test/billing-dynamic-rbac.test.ts` | permissions Factures/paiements et masquage financier | conserver; adapter si le tableau est extrait |
| `frontend/test/billing-stabilization.test.ts` | agence active, chargement, erreur, vide et aucun résultat | conserver les quatre états après extraction |
| `frontend/test/fin01-billing-export.test.ts` | export et permission `billing.export` | aucun changement si `BillingPage` reste canonique |
| `frontend/test/navigation.test.ts` | routes liste/détail, notifications et gardes | ajouter la route Devis éventuelle et préserver les routes existantes |
| `frontend/test/route-lazy-loading.test.ts` | chargement différé des pages | adapter si une nouvelle page lazy est créée |
| `frontend/test/table-empty-states.test.ts` | états vides de Ventes | vérifier que l'extraction conserve les états Devis/Ventes |
| `frontend/test/sale-cancel-finance-01.test.ts`, `avoir-remboursement-02.test.ts` | navigation Vente ↔ Facture | préserver `/billing/:id` |
| `frontend/test/sale-wizard.behavior.test.ts` | création de facture préremplie par `/billing?saleId=` | préserver ce contrat |
| `frontend/test/sav-finance-03.test.ts` | lien Facture ↔ OR | préserver `detailRoutes.repairOrder` |
| `frontend/test/dashboard-corrections.test.ts`, `notifications-reliability.test.ts` | liens globaux vers Sales/Billing | préserver destinations ou redirections |

Lacunes **vérifiées** : pas de test identifié pour le changement de page Devis, la conservation des filtres lors d'une navigation, l'accessibilité d'onglets, les quatre scénarios combinés Devis/Factures, ni le responsive réel. Une implémentation devra ajouter ces tests, mais le présent audit n'en crée aucun.

## 12. Comparaison des options A, B et C

Les volumes sont des estimations d'impact, pas des devis fermes. Ils supposent la conservation de tous les workflows existants.

| Critère | A — Onglets locaux dans une page | B — Routes dédiées | C — Onglets synchronisés à l'URL |
|---|---|---|---|
| Forme | `Devis | Factures` dans un même composant/page | une destination Devis et `/billing` pour Factures | apparence d'onglets, chaque onglet naviguant vers une URL canonique |
| Composants concernés | env. 6-8 : `SalesListPage`, `BillingPage`, extractions des 2 panneaux, header/KPI/actions, éventuellement modale | env. 4-6 : extraction Devis, nouvelle page/route, Sidebar/portail, tests; `BillingPage` reste intact | env. 6-8 : option B + barre commune, résolution active/permissions/URL |
| Navigation | peu visible en surface, mais incohérente avec la Sidebar Finance | explicite; respecte les modules actuels | liens directs excellents, mais nécessite une convention commune entre `/sales/...` et `/billing` |
| Routes | aucune ou query param local | nouvelle route Devis; routes Billing inchangées | nouvelle route Devis + mécanisme d'activation par URL |
| Hooks | risque de monter 3 requêtes; activation conditionnelle nécessaire | pas d'adaptation métier, seulement `requestEnabled` naturel par page | identique à B si les routes démontent le contenu inactif |
| Filtres/pagination | états perdus au changement si les panneaux sont démontés; collision possible des filtres | indépendants par définition; perdus à la sortie comme aujourd'hui | peuvent être sérialisés dans l'URL, mais ce serait un lot supplémentaire |
| RBAC | difficile : la page `/sales` bloque un utilisateur Factures-only; `/billing` inversement | naturel : chaque route garde son module | faisable si chaque onglet est un lien filtré et chaque route garde son garde |
| Régression | élevée : mélange Sales, Quotations et Billing; KPI/actions contextuels ambigus | faible à moyenne : ajout ciblé, compatibilité des URL | moyenne : logique d'onglet actif, deep links et états d'URL à tester |
| Ergonomie | bonne apparence, mauvaise frontière métier et risque de surcharge | claire, partageable, adaptée au mobile; menu explicite | meilleure combinaison visuelle/deep-link, au prix d'une couche de navigation |
| Complexité | moyenne à élevée malgré l'apparence simple | faible à moyenne | moyenne |

### Point déterminant

L'option A aurait été la plus simple si les deux tableaux vivaient déjà dans le même composant avec la même garde. Ce n'est pas le cas. Elle obligerait soit à faire de `/sales` une page Facturation, soit à faire de `/billing` une page Devis, et rendrait le cas « Factures seulement » incompatible avec la garde hôte. L'option B réutilise au contraire une séparation déjà en place à environ 70 %.

## 13. Risques de régression

1. **Confusion Devis/Ventes :** retirer le tableau Ventes en pensant qu'il s'agit du tableau Factures casserait le cœur de `/sales`.
2. **Contournement RBAC :** monter Factures sous `/sales` ne doit pas contourner `billing.view`; monter Devis sous `/billing` ne doit pas contourner `sales.view`/`quotations.view`.
3. **Liens profonds :** `/billing?saleId=...`, `/billing/:id`, `/sales/:id` et les routes de notification sont des contrats existants.
4. **Chargements inutiles :** garder des panneaux masqués montés déclencherait des requêtes simultanées et parfois des KPI non visibles.
5. **Perte d'état :** filtres et pages sont locaux; démonter/remonter un panneau les réinitialise.
6. **Invalidations incomplètes :** extraire les panneaux ne doit ni changer les clés `erpKeys` ni affaiblir les invalidations croisées Ventes/Factures/CRM.
7. **Actions contextuelles :** `Nouvelle Vente`, `Créer facture` et `Exporter` ne doivent pas être affichées sous la mauvaise section.
8. **KPI trompeurs :** les KPI Sales ne décrivent pas les devis; les KPI Billing peuvent révéler des données de paiement et restent soumis à `billing.payment.view`.
9. **Permissions fines incohérentes :** un accès module sans permission de lecture fine produit aujourd'hui une page accessible mais sans requête; une nouvelle navigation doit gérer ce cas sans requête interdite.
10. **Tests fragiles :** les tests statiques ciblent des noms de fichiers et motifs JSX précis; une extraction légitime les fera échouer tant qu'ils ne sont pas adaptés.
11. **Accessibilité :** des boutons stylés comme onglets sans sémantique ni navigation clavier seraient une régression.
12. **Mobile :** une troisième barre de navigation ou des actions non repliées peuvent déborder sur petits écrans.

## 14. Recommandation d'organisation

### Recommandation retenue : B, avec navigation visuelle légère

Conserver trois concepts explicites :

```text
Commercial & Ventes
├── Devis               → nouvelle route de liste globale
├── Ventes              → /sales (comportement actuel, sans le panneau Devis après migration)
└── Facturation         → /billing (route canonique existante)
```

Si le vocabulaire produit impose exactement « Devis | Factures », afficher ces deux destinations sous forme de liens de section, mais faire pointer **Factures vers `/billing`**. Ne pas déplacer `BillingPage` dans `SalesListPage`. Ne pas masquer le fait que le tableau actuellement sous Devis est celui des Ventes.

La route précise de la future liste Devis est une **proposition**, pas un constat. `/sales/quotations` est cohérente avec le regroupement commercial, mais `/quotations` pourrait être préférable si l'équipe souhaite un module de premier rang. Ce choix doit être arrêté avant implémentation pour éviter un conflit avec `/sales/:id`; si `/sales/quotations` est choisi, React Router sait distinguer le segment statique, mais les helpers et tests doivent l'exprimer explicitement.

### Alternative acceptable : C

Adopter C seulement pour fournir une expérience d'onglets et des deep links. Dans ce cas :

- les « onglets » sont des liens de navigation vers la route Devis et `/billing`, pas un état local unique ;
- seules les destinations autorisées sont rendues ;
- le contenu inactif n'est pas monté ;
- les gardes de routes existantes restent l'autorité ;
- aucun nouveau contrat backend ni permission n'est nécessaire.

### Option rejetée : A

Elle mélange des responsabilités et ne couvre pas correctement les utilisateurs « Devis seulement » ou « Factures seulement » à cause des gardes de module. Son coût réel est supérieur à celui d'une route Devis dédiée.

## 15. Plan d'implémentation proposé

Ce plan est informatif; aucune étape n'a été exécutée pendant l'audit.

1. **Valider le périmètre produit.** Confirmer que le besoin vise bien Devis/Factures et décider du sort visible du tableau Ventes. Valider l'URL canonique de la liste Devis.
2. **Figer les contrats de compatibilité.** Conserver `/sales`, `/sales/:id`, `/billing`, `/billing/:id`, `/billing?saleId=...` et le routage des notifications.
3. **Extraire le panneau Devis.** Créer un composant de liste qui reprend sans modification fonctionnelle colonnes, PDF, archive, erreurs, vide et pagination de `SalesListPage`.
4. **Créer la page/route Devis.** Ajouter un `PageHeader`, le composant extrait et une garde combinant l'accès de route choisi avec `quotations.view`. Ne pas dupliquer les actions d'édition CRM.
5. **Simplifier `/sales`.** Conserver KPI, recherche, filtre, tableau Ventes et `SaleWizardModal`; retirer le panneau Devis seulement après disponibilité de la nouvelle route.
6. **Laisser `/billing` canonique.** Ne pas déplacer ses KPI, filtres, export, tableau, modale ou détail. Ajouter seulement un lien de navigation si retenu.
7. **Adapter la navigation.** Mettre à jour `ROUTES`, `App.tsx`, `Sidebar`, le portail et éventuellement une barre de section partagée. Filtrer chaque destination avec les permissions existantes.
8. **Décider de l'état URL.** Dans un premier lot minimal, conserver les états locaux actuels. Dans un lot séparé, sérialiser éventuellement recherche/filtres/pages pour restaurer l'état à la navigation.
9. **Adapter et compléter les tests.** Mettre à jour les contrats statiques; tester routes, liens profonds, requêtes conditionnelles, états vides/erreurs, actions conservées, quatre scénarios RBAC et navigation clavier/mobile.
10. **Recette ciblée.** Vérifier profils Devis+Factures, Devis seul, Factures seul et aucun; tester CRM → Devis/Vente, Vente → création Facture, Facture ↔ OR, notifications et retour navigateur.

### Fichiers probablement concernés lors d'une future implémentation

- `frontend/src/modules/sales/SalesListPage.tsx`
- nouveau composant/page Devis sous `frontend/src/modules/sales/` ou `frontend/src/modules/quotations/`
- `frontend/src/App.tsx`
- `frontend/src/navigation/routes.ts`
- `frontend/src/components/layout/Sidebar.tsx`
- éventuellement `frontend/src/modules/modules-portal/ModulesPortalPage.tsx`
- tests cités à la section 11

`frontend/src/modules/billing/BillingPage.tsx` et `frontend/src/api/erpHooks.ts` ne devraient nécessiter aucune modification métier pour l'option B minimale; au plus, une extraction présentative ou un lien de navigation si la cible produit l'exige.
