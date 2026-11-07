# Audit fonctionnel et technique — Pièces / Magasin LCA

**Date de l'audit :** 7 novembre 2026  
**Périmètre :** frontend React, API Express, modèle MySQL, intégrations SAV, facturation, budgets et trésorerie  
**Méthode :** analyse statique en lecture seule du code, des migrations et des tests. Aucun test n'a été exécuté, aucune base n'a été interrogée et aucune opération métier n'a été réalisée.

## Légende de preuve

- **CC — confirmé par le code** : comportement directement identifiable dans une route, un composant ou une migration.
- **CT — confirmé par un test existant** : assertion identifiée dans un test ; le test n'a pas été exécuté pendant cet audit.
- **DA — déduit de l'architecture** : conclusion obtenue par rapprochement de plusieurs composants.
- **NV — non vérifié en exécution** : présence statique constatée, fonctionnement réel non démontré sur une instance.

Les lignes citées correspondent à l'état du dépôt au jour de l'audit.

## A. Synthèse exécutive

Le module Pièces / Magasin n'est pas une coquille. Il possède un catalogue central, des catégories hiérarchiques, des fournisseurs, des stocks par agence et emplacement, un journal de mouvements, des inventaires, ajustements, retours positifs, transferts, commandes fournisseurs et réceptions partielles. Les mutations importantes de stock utilisent des transactions et des verrous `SELECT ... FOR UPDATE`; les réceptions et transferts disposent de clés d'idempotence. Le RBAC est dynamique et territorial (`AGENCY`, `CONCESSION`, `GLOBAL`; `OWN` est refusé pour un stock collectif). **CC/CT** — `backend-node/src/modules/parts/part.routes.ts`, `part-stock.ts`; `backend-node/test/parts-dynamic-rbac.test.ts`.

Le domaine fournisseurs est également relié à la finance centrale : facture fournisseur, échéance, dette reconnue après validation, rapprochement commande/réception/facture, avoirs, règlements partiels, imputation budgétaire et décaissement Treasury. L'entrée physique en stock reste distincte du paiement, ce qui permet conceptuellement un achat à crédit. **CC** — `supplier-finance.routes.ts:31-49`, migration `075_supplier_invoice_debt_management.sql`.

En revanche, le circuit SAV réel est beaucoup plus court que la cible. Une ligne de pièce dans le devis d'un OR tient lieu de demande ; le magasin peut la réserver, la consommer ou libérer la réservation. La consommation décrémente simultanément stock physique et réservé et crée une ligne facturable d'OR. Il n'existe pas de bon de commande interne, préparation, bon de livraison interne, réception SAV, ni états séparés « sorti », « reçu » et « consommé ». **CC** — `workshop.routes.ts:371-379, 736-827`; `PartsWorkQueuePage.tsx:13-22`.

Les lacunes majeures sont : aucune vente directe de pièces indépendante d'un OR, aucune facture magasin dédiée, aucun retour fournisseur structuré, aucun vendeur occasionnel sans fiche fournisseur, aucun prix par agence ni historique des prix, aucune compatibilité pièce/modèle véhicule, et aucune génération démontrée de PDF magasin (commande, réception, inventaire, livraison interne, avoir fournisseur). Le moteur de facturation générique accepte techniquement `invoice_items.part_id`, mais aucune orchestration de vente magasin et de décrément de stock n'a été identifiée : cela ne constitue pas une vente directe opérationnelle.

### Risques prioritaires

1. **Circuit SAV non matérialisé** : réservation et consommation ne prouvent ni préparation, ni remise, ni réception physique. L'interface appelle d'ailleurs l'action « Consommer » et non « Livrer ».
2. **Restriction RBAC contradictoire avec la règle cible** : le créateur d'une facture fournisseur ou d'un avoir ne peut jamais valider son propre document, même s'il détient la permission dynamique (`supplier-finance.routes.ts:38,46`).
3. **Sémantique ambiguë du retour** : `/parts/:id/returns` ajoute du stock sans origine structurée ; ce n'est ni un retour fournisseur ni un retour de vente et aucun lien à une réservation/OR n'est requis.
4. **Correction post-consommation** : la modification d'une ligne OR ajuste directement le stock avec un mouvement `adjustment`, sans rétablir la réservation d'origine (`workshop.routes.ts:831`). La cohérence quantitative est protégée, mais la sémantique opérationnelle est affaiblie.
5. **Traçabilité documentaire partielle** : mouvements, historiques et audit applicatif existent, mais les transferts n'ont pas de document métier numéroté et les mouvements génériques ont souvent `reference_id=NULL`.

### Réutilisation recommandée

Conserver le catalogue, les stocks localisés, le verrouillage transactionnel, le journal de mouvements, l'idempotence, les commandes/réceptions fournisseurs, les factures/dettes fournisseurs, Treasury et le RBAC dynamique. La future chaîne SAV devrait s'appuyer sur ces briques sans assimiler une livraison interne à une vente client.

## B. Cartographie frontend

La navigation principale expose **« Pièces de Rechange (PR) »**. Les routes sont déclarées dans `frontend/src/App.tsx`; la page centrale se trouve dans `frontend/src/modules/parts/SparePartsPage.tsx`.

| Page / route | Navigation et composants | Actions réelles | Permissions principales | API | État |
|---|---|---|---|---|---|
| **Magasin Pièces de Rechange (PR) & Stocks** — `/parts` | Menu → Pièces de Rechange (PR); `SparePartsPage`, `PartLocationsPanel`, `SupplierInvoicesPanel` | Rechercher/filtrer, alerte stock faible, créer référence, gérer catégories/emplacements, créer et faire évoluer une commande, réceptionner, ouvrir demandes Atelier | `parts.catalog.view/manage`, `parts.stock.view`, `parts.purchase_order.view/create/approve/receive`, `parts.reporting.view`, permissions fournisseurs | `/parts`, `/part-references`, `/part-categories`, `/part-locations`, `/purchase-orders`, `/suppliers`, `/supplier-invoices` | **PARTIEL mais substantiel**. L'édition d'une pièce existe côté API, mais aucun bouton d'édition n'a été identifié sur la page. Création de commande limitée à une ligne dans la modale initiale. |
| **Détail pièce** — `/parts/:id` | Clic sur une référence; `SparePartDetailPage` | Inventaire, ajustement, retour positif, transfert, consultation stocks/mouvements/commandes récentes | `parts.catalog.view`, `parts.stock.view/adjust/move`, `parts.inventory.manage`, `parts.purchase_order.view`, `parts.reporting.view` | `/parts/:id`, `/parts/:id/movements`, endpoints d'action dédiés | **EXISTANT statiquement**. Le transfert exige de saisir manuellement les identifiants de destination, source probable d'erreur UX. |
| **Demandes Atelier** — `/parts/repair-orders` | Bouton de la page Pièces; `PartsWorkQueuePage` | Lister les OR ayant des pièces demandées et ouvrir « Traiter » | `parts.reservation.view` | `/parts-work-queue` | **PARTIEL** : file opérationnelle, sans objet demande numéroté ni notification persistée. |
| **Demande OR** — `/parts/repair-orders/:id` | Depuis la file; même composant | Réserver le stock correspondant à la ligne autorisée, consommer partiellement, libérer | `parts.reservation.view/create/consume/release` | détail file, pièces disponibles, stocks, routes réserve/statut | **PARTIEL** : réservation et consommation existent ; aucune préparation/livraison/réception SAV. |
| **Factures fournisseurs** — onglet de `/parts` | `SupplierInvoicesPanel` | Créer, soumettre, valider/rejeter, imputer à un budget, payer, créer/soumettre/valider un avoir, voir rapprochement et justificatifs | `supplier.invoice.*`, `supplier.debt.view`, `supplier.credit.*`, `supplier.payment.create`, `hr.expense.create`, permissions Treasury | `/supplier-invoices*`, `/supplier-credits*`, budgets/Treasury | **EXISTANT statiquement**, intégré aux finances centrales ; édition de facture et historique ont des routes backend mais ne sont pas exposés clairement dans ce panneau. |
| Fournisseurs — onglet Paramètres | `SettingsPage`, `OperationalResourcesSettings` | Consulter/créer/modifier/activer/désactiver les fournisseurs | `parts.suppliers.view/manage` | `/suppliers*` | **EXISTANT statiquement**. |
| Rapports Pièces / dettes | `ReportsPage`, `FinancialReportPanel` | Indicateurs stock/marge et dettes fournisseurs selon droits | `reporting.view`, `parts.reporting.view`, `supplier.debt.view` | services de reporting et indicateurs fournisseurs | **PARTIEL** pour un pilotage complet du magasin. |

### Comportement des boutons structurants

- **Nouvelle référence** appelle la création de pièce ; un stock initial non nul requiert en plus `parts.inventory.manage`, crée `part_stocks` et un mouvement `inventory`. Aucun document d'entrée n'est généré. **CC** — `SparePartsPage.tsx`, `part.routes.ts:127`.
- **Commander** crée un `purchase_order` brouillon avec une première ligne. Les statuts identifiés sont `draft`, `sent`, `confirmed`, `partially_received`, `received`, `cancelled`. Les modifications de lignes sont limitées au brouillon ; l'envoi/confirmation relève de `parts.purchase_order.approve`. **CC/NV** — `part.routes.ts:136-144`.
- **Réceptionner** crée un en-tête et des lignes de réception, verrouille commande, ligne et stock, refuse le dépassement, incrémente le physique, journalise `purchase`, et recalcule le statut partiel/complet. La clé d'idempotence évite une double réception du même appel. **CC/CT** — `part.routes.ts` route `/purchase-orders/:id/receipts`; `parts-dynamic-rbac.test.ts:37-38`.
- **Inventaire/Ajustement/Retour/Transfert** sollicitent chacun une route dédiée. Les quantités physiques sont entières au niveau applicatif, bien que les colonnes SQL soient décimales. Le retour est seulement une entrée positive générique. **CC** — `SparePartDetailPage.tsx:7-15`, `part.routes.ts:129-133`.
- **Réserver** verrouille le stock de l'emplacement et augmente `reserved_stock` sans diminuer `current_stock`. **Consommer** diminue les deux et crée/actualise une ligne réelle d'OR ; **Libérer** diminue uniquement le réservé restant. **CC/CT** — `workshop.routes.ts`, tests ERP19.
- Les succès sont signalés par des toasts locaux. Les changements de stock émettent `parts:stock-changed`; cela n'est pas une notification persistante ni un justificatif documentaire.

## C. Cartographie backend

Le routeur Pièces est monté sous l'API ERP. `authorize()` choisit la permission à partir du chemin/méthode et applique le scope agence. Les routes de réservation SAV sont dans le routeur Atelier.

| Domaine / endpoints | Permission | Effets et tables | Transactions / contrôles |
|---|---|---|---|
| `GET /part-references`, `GET/POST/PATCH /part-categories` | vue ou `parts.catalog.manage` | `part_categories`, options fournisseurs/emplacements filtrées | Validation code/nom ; catégories actives pour les références |
| `GET/POST/PATCH /part-locations*` | vue ou `parts.catalog.manage` | `locations` de type entrepôt et agence | Scope territorial, unicité/validation d'agence ; création/modification transactionnelle |
| `GET/POST/PATCH /suppliers*`, statut | `parts.suppliers.view/manage` | `suppliers` | Qualification pièces/véhicules, statut actif ; événement `suppliers:changed` |
| `GET /parts`, `GET /parts/:id` | `parts.catalog.view` + masquages complémentaires | `parts`, catégories, fournisseurs, stocks, commandes | Prix masqués sans reporting, fournisseur masqué sans droit, stock/commandes masqués sans droits correspondants |
| `GET /parts/:id/movements` | `parts.stock.view` | `part_movements`, agence, emplacement, opérateur | Scope agence, filtres type/date/emplacement, pagination |
| `POST/PATCH /parts` | `parts.catalog.manage` | `parts`, éventuellement `part_stocks`, `part_movements` | Référence dupliquée → 409 ; stock initial nécessite inventaire ; transaction |
| `POST /parts/:id/inventory-count` | `parts.inventory.manage` | stock + mouvement `inventory` | `FOR UPDATE`; comptage ≥ réservé; motif obligatoire |
| `POST /parts/:id/adjustments` | `parts.stock.adjust` | stock + `adjustment` | Refus d'un résultat sous le réservé/négatif; transaction |
| `POST /parts/:id/returns` | `parts.stock.adjust` | stock + `return` | Quantité positive, motif, mais aucune source structurée |
| `POST /parts/:id/transfers` | `parts.stock.move` | deux stocks + `transfer_out/in` | Contrôle des deux agences, double verrou, transaction, corrélation/idempotence |
| `POST /parts/:id/movements` | permission stock | Aucun | Rejet systématique : obligation d'utiliser un workflow métier dédié |
| `GET/POST/PATCH /purchase-orders*`, items, statut | `parts.purchase_order.view/create/update/approve` | `purchase_orders`, `purchase_order_items` | Fournisseur actif pièces, brouillon modifiable, transitions contrôlées |
| `POST /purchase-orders/:id/receipts` | `parts.purchase_order.receive` | réceptions, lignes, stocks, mouvements | Verrous, idempotence, quantité résiduelle, emplacement magasin, réception partielle |
| `GET/POST/PATCH /supplier-invoices*`, transitions | permissions `supplier.invoice.*` | factures, lignes, historique, audit | Scope, contrôles dates/montants/liens, rapprochement, transaction |
| `POST .../budget-link`, `.../payments` | `hr.expense.create`, `supplier.payment.create` | budget, dépense, décaissement, mouvement Treasury | Dette validée, budget compatible/disponible, idempotence du décaissement |
| `POST .../credits`, décisions | `supplier.credit.create/validate` | avoirs et historique | Solde maximum, transaction ; auto-validation interdite |
| `GET /parts-work-queue*`, pièces/stocks admissibles | `parts.reservation.view/create` | OR, devis, réservations, stocks | Scope basé sur l'agence de l'OR |
| Réserver/consommer/libérer une pièce OR | permissions spécialisées | `part_reservations`, `part_stocks`, `part_movements`, `repair_order_items` | `FOR UPDATE`, disponible, quantité autorisée/restante, transaction, événement stock |

### Robustesse des stocks

`lockPartStock()` (`backend-node/src/modules/parts/part-stock.ts`) verrouille la ligne locale ; si plusieurs emplacements existent, l'API exige un emplacement explicite. `stockAfterDelta()`, `reserveStock()` et `consumeReservation()` empêchent stock disponible négatif, surréservation et double consommation. Les réservations concurrentes sur plusieurs OR sont sérialisées par le verrou de la même ligne `part_stocks`. **CC/CT**.

La protection n'est néanmoins pas une preuve d'absence de toute incohérence historique : les anciennes lignes sans `part_stock_id` produisent explicitement une erreur de correction manuelle dans `workshop.routes.ts:831`. Aucune vérification de données n'a été exécutée.

## D. Modèle de données

| Table | Rôle et colonnes principales | Relations / contraintes notables | Source |
|---|---|---|---|
| `part_categories` | `id`, `parent_id`, `name`, `code`, description, `is_active` | Auto-FK parent ; code unique ; hiérarchie libre | baseline + migration legacy 012 |
| `parts` | Référence, OEM, nom, marque texte, catégorie, fournisseur, description, prix achat/vente, `obsolete`, `is_active` | Référence unique ; FK catégorie/fournisseur ; index OEM | baseline + migration 012 |
| `part_stocks` | Autorité quantitative : pièce, agence, emplacement, `current_stock`, `reserved_stock`, min/max | Unicité pièce/agence/emplacement ; FK pièce/agence/emplacement ; contrôles applicatifs du disponible | migration legacy 010 + baseline consolidée |
| `part_movements` | Type, quantité signée, avant/après, agence, emplacement, opérateur, date, type/id de référence, motif, corrélation | FKs ; index pièce/agence/date et corrélation ; `reference_id` non obligatoire | baseline + migration 012 |
| `suppliers` | Identité, contacts, fiscalité, actif, qualifications pièces/véhicules | Fiche obligatoire pour commande et facture ; code unique | baseline + migration 051 |
| `purchase_orders` | Numéro, fournisseur, agence, statut, dates, notes, créateur | FKs fournisseur/agence/utilisateur ; numéro unique | baseline |
| `purchase_order_items` | Pièce, quantités commandée/reçue, prix, taxe, total | FK commande/pièce ; index commande+pièce | baseline + migration 012 |
| `purchase_order_receipts` | Numéro, commande, clé d'idempotence, agence, emplacement, réceptionnaire/date | Unicités numéro et `(commande, clé)` ; FKs | migration 012 |
| `purchase_order_receipt_items` | Réception, ligne de commande, pièce, quantité | Une ligne par réception/ligne de commande ; quantité > 0 | migration 012 |
| `repair_order_estimate_items` | Lignes autorisées de devis, dont type `part`, quantité/prix/taxe, lien pièce | Rattaché à l'OR ; joue le rôle de demande SAV sans table de demande dédiée | migration 036/037 |
| `part_reservations` | OR, ligne estimée, pièce, stock/emplacement, quantité, consommé, statut | Statuts `reserved/consumed/released`; FKs vers OR/pièce/stock ; extensions postérieures au socle | baseline consolidée, migrations SAV |
| `repair_order_items` | Ligne réelle facturable de l'OR, pièce/stock, quantité, prix/taxe, statut | Créée/actualisée lors de la consommation ; utilisée par la facture atelier | baseline et `workshop.routes.ts` |
| `supplier_invoices` | Fournisseur/agence/concession, liens commande/réception/budget, dates/échéance, HT/taxe/total, statut | Unicité référence par concession+fournisseur ; montants/dates contrôlés ; nombreux FKs | migration 075 |
| `supplier_invoice_lines` | Liens facultatifs ligne commande/réception/pièce, quantité, prix, taxe | Totaux contrôlés ; FKs restrictives | migration 075 |
| `supplier_invoice_history` | Transitions et acteur | Journal immuable par ajout | migration 075 |
| `supplier_credit_notes`, `supplier_credit_history` | Avoirs, décisions et acteurs | Montant positif, référence unique, lien facture | migration 075 |
| `budgets`, `budget_expenses`, `budget_expense_disbursements` | Imputation et décaissements | La facture fournisseur pointe une dépense unique | migrations finance 043/059/072 |
| `treasury_accounts`, `treasury_movements`, `treasury_transfers` | Trésorerie centrale et transferts | Événements, contrepassations et rapprochement central | migrations 054-059 et suivantes |
| `invoices`, `invoice_items`, `payments`, `payment_refunds` | Facturation/encaissement client partagés | `invoice_items.part_id` existe, mais aucun workflow de vente magasin n'a été trouvé | baseline, facturation |

### Objets absents ou non dédiés

Il n'existe pas de table identifiée pour : compatibilité pièce/modèle véhicule, prix par agence, historique de prix, demande magasin numérotée, commande interne SAV, préparation, livraison interne, réception SAV, vente directe magasin ou retour fournisseur. Les « demandes » SAV sont déduites des lignes de devis OR et des réservations.

## E. Catalogue et stocks

1. **Référence unique : oui.** `parts.reference` est unique et l'API traduit `ER_DUP_ENTRY` en conflit 409 ; test statique ERP10.
2. **Catégories : hiérarchiques**, via `parent_id`, activables/désactivables. Aucun contrôle explicite de cycle hiérarchique n'a été identifié.
3. **Marque : oui, champ texte** `parts.brand`, sans référentiel.
4. **Référence constructeur : oui**, `oem_reference`, indexée mais non unique.
5. **Association aux modèles véhicule : absente** dans le périmètre inspecté.
6. **Prix achat/vente : globaux sur la pièce**, saisis directement ; aucun calcul automatique démontré du prix de vente.
7. **Prix par agence : absent. Historisation : absente.** `updated_at` ne conserve pas les anciennes valeurs.
8. **Désactivation/obsolescence : présente**, avec `is_active` et `obsolete`; les listes/détails usuels filtrent les pièces actives. Une pièce désactivée devient donc invisible dans ces vues, sans vue archive dédiée identifiée.
9. **Pièce sans stock : affichée** par `LEFT JOIN` avec agrégats à zéro sur la liste, sous réserve qu'elle soit active.
10. **Stock faible : calculé**, par disponibilité (`current - reserved`) comparée au minimum agrégé/local. L'interface propose un filtre/indicateur ; aucune notification persistante automatique de seuil n'a été identifiée.

### Entrées, sorties et réservations

| Opération | Réalité constatée | Limites |
|---|---|---|
| Stock initial | Mouvement `inventory` et stock local | Pas de bon d'entrée |
| Réception achat | `purchase`, réception partielle/multiple, idempotence | Pas de PDF identifié |
| Retour | `return` positif | Origine non typée ; pas de lien OR/vente/fournisseur |
| Inventaire | Remplace le physique, journalise l'écart | Pas de campagne/feuille d'inventaire |
| Ajustement | Delta positif/négatif protégé | Permission large, justificatif texte seulement |
| Transfert | Sortie/entrée atomiques, corrélation | Pas de statut expédié/reçu ni document ; transfert inter-agences instantané |
| Vente directe | Type `sale` affichable dans le filtre historique, mais aucune route créatrice identifiée | **Absente fonctionnellement** ; le filtre UI ne prouve pas le workflow |
| Livraison SAV | Non distinguée | La consommation est la sortie physique et la ligne facturable |
| Retour fournisseur | Non identifié | Le retour générique augmente le stock, donc ne convient pas |
| Réservation OR | Augmente le réservé | Une seule réservation liée à la ligne de devis dans l'interface actuelle |
| Consommation OR | Diminue physique et réservé ; ligne OR réelle | Pas de remise/réception séparée |
| Libération | Rend disponible le reliquat | Annulation/abandon OR appelle également un nettoyage des réservations |

Chaque mouvement conserve date, utilisateur, agence, pièce, quantité, emplacement, avant/après, type/id de référence et motif lorsque les appels les fournissent. L'origine/destination complète n'est pas portée par une seule ligne : elle se déduit des deux mouvements de transfert partageant `correlation_key`. Aucun fichier justificatif n'est directement attaché au mouvement.

## F. Approvisionnements

### Fournisseurs et commandes

La création, modification, consultation et désactivation de fournisseurs existent. Les commandes imposent une fiche fournisseur active qualifiée pièces. La commande accepte plusieurs lignes via API, bien que la création UI commence par une seule. Elle peut être envoyée/confirmée, partiellement reçue, complètement reçue ou annulée. Une réception partielle peut être répétée sans dépasser le commandé. **CC/NV**.

### Vendeur occasionnel

**Absent.** `purchase_orders.supplier_id` et `supplier_invoices.supplier_id` sont des FKs obligatoires. Aucun snapshot libre de vendeur n'a été identifié. L'utilisateur doit créer une fiche fournisseur, même pour une opération ponctuelle.

### Comptant, crédit et urgence

- **Comptant : partiel.** On peut commander/réceptionner, saisir une facture, l'imputer et la payer via Treasury. Il ne s'agit pas d'un assistant atomique « achat comptant + stock + paiement » ; plusieurs permissions et étapes sont requises.
- **Crédit : existant statiquement.** La réception peut augmenter le stock sans paiement. Une facture validée porte une échéance et un solde ; le décaissement est ultérieur.
- **Paiements partiels : existants statiquement.** Le solde est `total - avoirs validés - décaissements nets`; plusieurs décaissements peuvent être enregistrés. L'idempotence de Treasury évite la répétition technique d'un même paiement.
- **Urgence : partielle.** Une facture de biens peut être créée sans liens commande/réception si un `exception_reason` explique les écarts, mais cela ne réalise pas l'entrée physique. Pour entrer le stock correctement, il faut toujours la commande/réception ou détourner un ajustement, qui perdrait la traçabilité d'achat. Aucune procédure d'achat urgent complète n'est identifiée.

Le rapprochement vérifie les liens fournisseur/agence, les quantités et montants commande/réception/facture et exige une exception pour les écarts de biens. Cette fonction est une bonne base de contrôle, mais ne remplace pas un workflow vendeur occasionnel ou urgent.

## G. Interactions SAV / magasin

### Workflow réel

```text
Ligne « part » du devis OR
        ↓
File « Demandes Atelier » (vue calculée, sans numéro propre)
        ↓
Réservation d'un part_stock
  current_stock inchangé / reserved_stock augmenté
        ↓
Consommation (partielle possible)
  current_stock et reserved_stock diminués
  + mouvement repair_order
  + repair_order_item facturable

ou Libération du reliquat
```

La demande est créée depuis le chiffrage/devis Atelier, rattachée à l'OR par `repair_order_estimate_items`. Elle n'a ni numéro, ni en-tête, ni statuts propres. Le magasin est informé par une file calculée ; aucune notification persistante « nouvelle demande » n'a été identifiée. **CC**.

### Comparaison avec la cible

| Étape cible | Existant |
|---|---|
| Demande SAV | **PARTIEL** — ligne de devis OR |
| Bon de commande interne | **ABSENT** |
| Préparation magasin | **ABSENT** — réservation seulement |
| Bon de livraison interne | **ABSENT** |
| Réception SAV | **ABSENT** |
| Consommation OR | **EXISTANT** — directement depuis la réservation |

Il n'existe donc aucune distinction persistée entre demandé, préparé, sorti, livré, reçu et consommé. Une consommation partielle est permise et la réservation restante peut être consommée plus tard, mais cela ne constitue pas une livraison partielle documentée. Plusieurs livraisons physiques ne sont pas représentées.

### Annulation et pièces non utilisées

La libération rend le reliquat disponible. Les workflows d'abandon/annulation d'OR nettoient les réservations actives sous transaction et émettent un événement stock (`workshop.routes.ts:350,476`). Une quantité déjà consommée est une ligne réelle ; son annulation/correction suit les mécanismes de ligne OR et d'ajustement, pas un retour magasin structuré.

### Double facturation

**Aucun double débit interne automatique n'a été identifié dans le flux actuel**, car réserver ou consommer ne crée pas une facture magasin : la consommation crée une seule `repair_order_item`, ensuite incluse dans la facture atelier. Le principe cible « livraison interne ≠ vente » est donc respecté par absence de vente interne.

Le risque futur est toutefois élevé si une vente directe magasin est ajoutée en réutilisant naïvement la sortie SAV : il n'existe aucun objet distinguant livraison interne et vente client. Le champ générique `invoice_items.part_id` ne comporte pas à lui seul une contrainte empêchant qu'une même réalité soit également facturée via l'OR. Toute évolution devra porter une provenance métier unique et idempotente.

## H. Ventes directes et facturation

### Vente directe

**Aucun workflow complet n'a été identifié.** Il n'existe pas de page de vente pièces, panier, client, réservation/décrément corrélé, facture magasin, retour de vente ou remboursement lié au stock. La présence de `part_id` dans `invoice_items`, du type de mouvement `sale` et d'un filtre UI `sale` est une capacité technique résiduelle, pas une orchestration métier.

### Facturation Atelier et fiscalité

Les pièces consommées alimentent `repair_order_items` avec quantité, prix snapshoté, remise, taux et total. La facturation Atelier utilise le module central `billing` et le rendu commercial partagé. Les paramètres métier effectifs fournissent notamment taux de TVA, devise, mode fiscal et saisie HT/TTC selon les flux. Les factures clients gèrent émission, annulation, encaissements partiels et remboursements dans le domaine partagé. **CC**, mais ces capacités ne sont pas exposées comme caisse magasin.

Les commandes fournisseur portent un taux de taxe par ligne ; les factures fournisseur enregistrent `subtotal`, `tax_total`, `total` et taxe par ligne. Le modèle fournisseur ne stocke pas un taux fiscal explicite par ligne, uniquement le montant de taxe. Les avoirs fournisseurs sont financiers et ne modifient pas le stock.

## I. Comptabilité et trésorerie

Le magasin ne possède pas de comptabilité autonome. Les dettes fournisseurs se raccordent aux budgets et à Treasury : facture validée → dépense budgétaire → approbation/financement selon le domaine budget → décaissement → mouvement de trésorerie. Cette architecture distingue correctement :

- réception de stock et décaissement ;
- dette et paiement ;
- paiement partiel et solde ;
- avoir et remboursement/contrepassation éventuelle ;
- transfert Treasury et nouveau revenu.

Les comptes, mouvements et transferts Treasury sont centraux, scopés par agence/concession. Les transferts internes disposent d'un objet dédié, ce qui permet de ne pas gonfler la trésorerie totale. **DA/CC** — modules `treasury`, migrations 054-059.

Lacunes : aucune caisse ou fonds « détenus par le magasin » n'est explicitement identifiée ; aucun encaissement magasin n'existe faute de vente directe ; aucune mise à disposition dédiée au service magasin ni analytique obligatoire par service n'a été trouvée. Les fonds peuvent être suivis par compte/agence/catégorie centrale, pas comme sous-caisse magasin démontrée.

## J. RBAC

### Permissions Pièces

| Permission | Usage principal | Scope |
|---|---|---|
| `parts.catalog.view/manage` | Voir/créer/modifier références, catégories et emplacements | Agence/concession/global selon garde ; `OWN` refusé au stock collectif |
| `parts.stock.view/adjust/move` | Voir mouvements, ajuster/retourner, transférer | Contrôle agence source et destination |
| `parts.inventory.view/manage` | Voir/réaliser inventaire et stock initial | Territorial |
| `parts.purchase_order.view/create/update/approve/receive` | Cycle commande/réception | Agence de commande |
| `parts.suppliers.view/manage` | Fournisseurs | Permission dynamique ; fournisseur global dans le modèle, visibilité d'usage filtrée |
| `parts.reporting.view` | Prix achat/vente et indicateurs | Territorial |
| `parts.reservation.view/create/consume/release` | File SAV et actions distinctes | Agence de l'OR |

### Permissions finance fournisseur

`supplier.invoice.view/create/update/submit/validate/reject`, `supplier.debt.view`, `supplier.credit.create/validate`, `supplier.payment.create`, `supplier.invoice.history.view`, auxquelles s'ajoutent `hr.expense.create` et les permissions Treasury nécessaires au paiement.

Les écrans masquent les actions selon `can(...)`, et le backend revalide permission et scope. Les tests statiques vérifient l'absence de noms de rôles historiques dans le contrôle Pièces. **CT** — `parts-dynamic-rbac.test.ts`, `frontend/test/parts-rbac.test.ts`.

### Incohérence démontrée

`transition()` interdit au créateur de valider sa propre facture et `decideCredit()` interdit la même chose pour un avoir (`supplier-finance.routes.ts:38,46`). Cette séparation de fonctions est codée en dur et prévaut sur `supplier.invoice.validate` / `supplier.credit.validate`. Elle contrevient explicitement à la règle de référence de la mission selon laquelle une personne cumulant les permissions doit pouvoir agir. Il s'agit d'une **ANOMALIE**, pas d'un simple manque.

## K. Documents, notifications et audit

### Documents

| Document | Conclusion |
|---|---|
| Facture client / Atelier | Génération effective via `documents/commercial-document.ts`, numérotation centralisée, identité LCA snapshotée et archivage métier |
| Facture fournisseur source | Métadonnées et justificatifs GED visibles ; aucune génération PDF interne de la facture fournisseur identifiée |
| Bon de commande fournisseur | Données et numéro existent ; aucun moteur PDF identifié |
| Bon de réception fournisseur | Numéro et données existent ; aucun PDF identifié |
| Bon de commande/livraison interne SAV | Absents |
| Bon de retour / inventaire / transfert | Absents comme documents générés |
| Avoir fournisseur | Données et workflow existent ; aucun PDF identifié |

Il ne faut donc pas confondre numéro de commande/réception avec document généré. Aucune preuve d'application de l'identité visuelle LCA aux objets magasin n'a été trouvée ; elle est confirmée uniquement pour les documents commerciaux clients partagés.

### Notifications et temps réel

- Événements Socket.IO identifiés : `parts:stock-changed`, `suppliers:changed` et événements Atelier associés. Ils rafraîchissent potentiellement les vues connectées.
- Toasts frontend : retours immédiats de l'action de l'utilisateur.
- Aucune création de notification persistée dédiée aux demandes SAV, réceptions, seuils faibles, factures à valider ou échéances fournisseur n'a été identifiée dans les routes Pièces/finance fournisseur.
- Une reconnexion peut recharger l'état depuis les listes, mais ne restitue pas un historique de notifications métier magasin.

### Audit

Les factures fournisseurs et avoirs appellent l'audit applicatif et possèdent des tables d'historique. Les mouvements de stock journalisent acteur/date/avant/après. En revanche, les opérations catalogue, catégories, emplacements, commandes et réceptions ne montrent pas toutes un appel au journal d'audit central ; leur traçabilité repose surtout sur `created_by`, `received_by`, dates et mouvements. Les modifications de prix ne sont pas historisées.

## L. Tests

Analyse statique uniquement ; aucun test n'a été exécuté, notamment les intégrations MySQL qui créent des données.

| Ensemble | Couverture identifiée | Limites |
|---|---|---|
| `erp10-part-duplicate.test.ts` | Traduction du doublon de référence en 409 | Test de source, pas appel DB |
| `parts-dynamic-rbac.test.ts` | Scopes, masquage, stocks négatifs, réservations, consommation, verrous, transfert, réception idempotente, permissions | Nombreuses assertions statiques/unitaires ; pas de concurrence réelle exécutée ici |
| `erp19-parts-workflow.test.ts` | Garde spécialisé SAV, scopes, permissions distinctes, idempotence/mouvements, file | Majoritairement inspection du code |
| `pr04-parts-location-list.test.ts` | Agrégation des emplacements et scope agence | Statique |
| `pr04-parts-location-list-mysql.integration.test.ts` | Liste multi-emplacements sans fuite inter-agences | Écrit en base ; non exécuté |
| `sav-parts-targeted-mysql.integration.test.ts` | Parcours ciblé réservation/stock SAV | Écrit en base ; non exécuté |
| Tests frontend ERP19/parts-rbac/PR04 | Visibilité des actions, permissions, file, rendu emplacements | Tests comportementaux surtout fondés sur le source |
| Tests supplier finance/FIN05 présents dans le dépôt | Factures, dette, rapprochement, paiement selon leurs assertions | Exécution non réalisée ; couverture E2E documentaire non démontrée |

Absences critiques de couverture identifiée : deux transactions réellement concurrentes, livraison/réception SAV (fonction absente), vente directe (absente), retour fournisseur, historique de prix, PDF magasin, notifications persistantes, transfert physique en deux temps, et scénario complet achat urgent/comptant. La couverture de l'auto-validation interdite doit être maintenue comme constat d'écart tant que la règle cible ne change pas.

## M. Matrice des écarts

| Besoin | État | Existant identifié | Écart | Fichiers concernés | Priorité |
|---|---|---|---|---|---|
| 1. Catalogue centralisé | **EXISTANT** | Références uniques, catégories, OEM, marque, fournisseur | Pas de compatibilité véhicule ni historique prix | `part.routes.ts`, baseline | P2 |
| 2. Stocks par agence | **EXISTANT** | Agence + emplacement, physique/réservé/disponible | Transfert instantané, pas en transit | `part-stock.ts`, `part.routes.ts` | P1 |
| 3. Fournisseurs référencés | **EXISTANT** | Fiches, commandes, factures | — | routes Pièces/finance | P3 |
| 4. Vendeurs occasionnels | **ABSENT** | Aucun | FK fournisseur obligatoire | migration 075, baseline | P1 |
| 5. Achats au comptant | **PARTIEL** | Réception + facture + Treasury | Pas de parcours unifié/direct | routes Pièces/finance/Treasury | P1 |
| 6. Achats à crédit | **EXISTANT** | Stock indépendant du paiement, échéance/dette | Fonctionnement non exécuté | finance fournisseur | P1 |
| 7. Paiements partiels | **EXISTANT** | Plusieurs décaissements, solde calculé | NV en exécution | `supplier-finance.routes.ts` | P1 |
| 8. Dettes fournisseurs | **EXISTANT** | Validation, échéance, retard, avoirs, soldes | PDF/relances absents | migration 075, panneau frontend | P1 |
| 9. Achats urgents par permission | **PARTIEL** | Exception facture sans PO/réception | Entrée stock correcte exige workflow séparé | `reconciliation`, routes | P0 |
| 10. Demandes SAV | **PARTIEL** | Ligne de devis + file magasin | Pas d'objet/numéro/statut propre | `workshop.routes.ts`, file frontend | P0 |
| 11. Bons de commande internes | **ABSENT** | Aucun | Pas de données, numéro, PDF | — | P0 |
| 12. Bons de livraison internes | **ABSENT** | Aucun | Pas de livraison partielle/multiple | — | P0 |
| 13. Réception par le SAV | **ABSENT** | Aucun | Consommation directe | routes Atelier | P0 |
| 14. Consommation sur OR | **EXISTANT** | Stock + mouvement + ligne OR | Confondue avec sortie/livraison | `workshop.routes.ts` | P0 |
| 15. Retour pièce inutilisée | **PARTIEL** | Libération du non consommé ; retour générique positif | Pas de retour d'une pièce sortie/reçue | routes Atelier/Pièces | P0 |
| 16. Vente directe | **ABSENT** | Capacité générique de ligne facture seulement | Aucun workflow stock/client | billing + Pièces | P0 |
| 17. Facturation magasin | **ABSENT** | Moteur central réutilisable | Pas de type/orchestration magasin | billing/documents | P0 |
| 18. Encaissements | **ABSENT** | Moteur client partagé | Aucun encaissement magasin | billing/payments | P0 |
| 19. Décaissements | **EXISTANT** | Facture fournisseur → budget → Treasury | Dépend des étapes budget | finance/Treasury | P1 |
| 20. Comptabilité centrale | **PARTIEL** | Treasury/budgets centraux, dettes intégrées | Pas de comptabilité générale/écritures magasin démontrées | finance/Treasury | P1 |
| 21. Fonds détenus magasin | **ABSENT** | Comptes agence centraux | Pas de sous-caisse magasin | Treasury | P1 |
| 22. Transferts internes trésorerie | **EXISTANT** | Objet Treasury transfer | Pas d'interface spécifique magasin | Treasury | P2 |
| 23. Taxes | **PARTIEL** | TVA/config client, taxes PO/fournisseur | Cohérence fiscale magasin direct non définie | settings, billing, parts | P1 |
| 24. Notifications | **PARTIEL** | Socket et toasts | Pas de persistance/relance ciblée | routes + realtime | P1 |
| 25. Traçabilité | **PARTIEL** | Mouvements, historiques finance, audit | Prix/documents/plusieurs mutations non historisés | routes/migrations | P1 |
| 26. RBAC dynamique | **ANOMALIE** | Permissions et scopes riches | Auto-validation facture/avoir interdite en dur | `supplier-finance.routes.ts:38,46` | P0 |

## N. Anomalies et risques

### PM-01 — Auto-validation financière interdite malgré les permissions

- **Gravité : critique (P0).**
- **Reproduction statique :** créer une facture fournisseur, la soumettre, puis tenter de la valider avec le même utilisateur possédant `supplier.invoice.validate` ; réponse 409. Même cas pour un avoir.
- **Cause démontrée :** comparaison `created_by === r.user.sub` codée en dur.
- **Fichiers :** `backend-node/src/modules/parts/supplier-finance.routes.ts`, fonctions `transition` ligne 38 et `decideCredit` ligne 46.
- **Conséquence :** blocage dans une petite agence et contradiction avec le RBAC cible.

### PM-02 — Absence de chaîne de livraison interne SAV

- **Gravité : critique (P0).**
- **Condition :** une ligne de pièce autorisée est réservée puis « consommée » depuis la file magasin.
- **Cause :** modèle limité à devis, réservation et ligne OR réelle.
- **Fichiers :** `workshop.routes.ts:371-379,736-827`, `PartsWorkQueuePage.tsx:22`.
- **Conséquence :** aucune preuve de préparation/remise/réception, responsabilités et écarts physiques difficiles à établir.

### PM-03 — Retour générique sémantiquement insuffisant

- **Gravité : élevée (P1).**
- **Condition :** appeler `POST /parts/:id/returns` avec quantité et motif.
- **Cause :** simple delta positif `return`, sans type/source/document.
- **Fichier :** `part.routes.ts:131`.
- **Conséquence :** impossible de distinguer retour SAV, retour client ou autre correction ; la route ne peut pas représenter un retour fournisseur puisqu'elle ajoute du stock.

### PM-04 — Vente directe et facture magasin absentes

- **Gravité : critique fonctionnelle (P0).**
- **Preuve :** aucune page/route orchestrant client + pièce + sortie + facture + paiement ; recherche transverse des usages `part_id`.
- **Conséquence :** activité comptoir non gérable de bout en bout ; risque de contournements par ajustements ou factures génériques.

### PM-05 — Risque futur de double facturation

- **Gravité : élevée (P1), risque d'évolution.**
- **État actuel :** pas de double facture automatique identifiée ; seule la ligne OR est facturée.
- **Cause potentielle :** absence d'identifiant/provenance de livraison interne et capacité générique `invoice_items.part_id`.
- **Conséquence :** une future facture magasin pourrait doubler la facture OR si les deux flux ne sont pas rendus mutuellement exclusifs/idempotents.

### PM-06 — Correction de ligne OR sans cycle de retour

- **Gravité : élevée (P1).**
- **Condition :** modifier à la baisse une ligne de pièce réelle.
- **Cause :** delta appliqué directement à `part_stocks` et mouvement `adjustment`, sans objet retour ni restauration de réservation.
- **Fichier :** `workshop.routes.ts:831`.
- **Conséquence :** stock numérique corrigé, mais perte de sens logistique et documentaire.

### PM-07 — Transfert inter-agences atomique mais non physique

- **Gravité : moyenne/élevée (P1).**
- **Condition :** valider un transfert ; source et destination sont modifiées dans la même transaction.
- **Cause :** aucun état en transit/réception destination.
- **Fichiers :** `part.routes.ts:132`, `SparePartDetailPage.tsx:15`.
- **Conséquence :** stock destination disponible avant confirmation physique ; saisie manuelle d'IDs destination.

### PM-08 — Prix non historisés et globaux

- **Gravité : moyenne (P2).**
- **Cause :** prix directement sur `parts`, pas de table d'historique/agence.
- **Conséquence :** audit des marges et reconstitution historique limités ; les snapshots OR atténuent seulement certains flux.

### PM-09 — Journalisation inégale

- **Gravité : moyenne (P2).**
- **Constat :** finance fournisseur appelle l'audit et possède un historique ; catalogue/commandes reposent davantage sur colonnes opérationnelles et mouvements.
- **Conséquence :** auteur et contenu exact d'une modification de référence, prix ou commande pas toujours reconstituables.

### PM-10 — Réceptions et transferts utilisent des décimaux SQL mais des entiers applicatifs

- **Gravité : faible à moyenne (P2).**
- **Constat :** colonnes `DECIMAL(12,2/3)` ; validateurs Pièces exigent des nombres entiers.
- **Conséquence :** modèle et règles divergent ; les pièces fractionnables sont impossibles et des données historiques décimales nécessiteraient vérification. **NV** pour les données réelles.

## O. Recommandations de conservation et d'évolution

### CONSERVER

- Le catalogue central, les catégories, OEM, qualification fournisseur et activation.
- `part_stocks` comme autorité quantitative par agence/emplacement.
- Les verrous `FOR UPDATE`, transactions, contrôles de disponible et idempotence.
- Les mouvements avant/après, corrélation des transferts et interdiction du mouvement générique libre.
- Les commandes/réceptions partielles fournisseurs.
- Les factures/dettes/avoirs fournisseurs et leur raccordement à Budget/Treasury.
- Le RBAC dynamique, ses permissions granulaires et ses scopes territoriaux.
- La facture Atelier centrale alimentée par les lignes réelles d'OR.

### ADAPTER

- La réservation SAV pour la raccorder à une demande interne numérotée plutôt qu'à une simple vue de lignes de devis.
- La consommation pour qu'elle intervienne après sortie, livraison et réception, sans créer de vente interne.
- Les transferts inter-agences vers un cycle expédition/réception avec stock en transit.
- Le retour générique en opérations explicitement typées et corrélées à leur origine.
- Les restrictions d'auto-validation afin que l'autorité provienne des permissions dynamiques conformément à la règle métier.
- Le catalogue pour prix/agence, historique et compatibilités véhicules si ces besoins sont confirmés.

### COMPLÉTER

- Achat urgent/comptant, en gardant séparés stock, dette et trésorerie.
- Traçabilité centrale des modifications catalogue, prix, commandes et réceptions.
- Documents PDF fournisseur/magasin et archivage GED avec identité LCA.
- Notifications persistantes et ciblées pour demande SAV, préparation, réception, seuil faible et échéance.
- Retours de pièces non utilisées et corrections post-consommation.
- Tests d'intégration de concurrence, scénarios financiers et documents.

### CRÉER

- Demande SAV structurée, bon de commande interne, préparation, bon de livraison, réception SAV et livraisons partielles/multiples.
- Vente directe magasin de bout en bout, facture magasin, encaissement, retour et remboursement, fondés sur le moteur central.
- Achat auprès d'un vendeur occasionnel avec snapshot d'identité contrôlé.
- Retour fournisseur et son effet stock/avoir/dette.
- Suivi explicite des fonds détenus par le magasin si une sous-caisse opérationnelle est requise, sans créer de comptabilité parallèle.
- Règles de provenance/idempotence empêchant qu'une livraison interne SAV soit facturée comme vente magasin puis à nouveau sur l'OR.

## Conclusion de vérification

Le présent document est une photographie **statique** et vérifiable de l'implémentation. Les fonctions marquées existantes sont identifiées dans le code, mais n'ont pas été déclarées « opérationnelles en production » sans exécution. Aucun test, y compris les tests MySQL, n'a été lancé ; aucune migration ni écriture en base n'a été effectuée.
