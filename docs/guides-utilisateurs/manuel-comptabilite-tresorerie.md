# Manuel utilisateur — Comptabilité & Trésorerie

## 1. Présentation du module

Le module rassemble quatre fonctions : suivre les liquidités, enregistrer et contrôler les mouvements financiers, tenir une comptabilité en partie double et superviser les intégrations provenant des autres modules.

Il est accessible dans le menu **Finance & Pilotage → Comptabilité & Trésorerie**. Les écrans et boutons visibles dépendent des permissions affectées à l'utilisateur dans l'agence active. La présence d'un rôle ne garantit jamais, à elle seule, l'accès à une action.

Règles générales :

- les montants de devises différentes ne sont jamais additionnés ni convertis ;
- les soldes de trésorerie sont calculés à partir des mouvements comptabilisés, pas saisis manuellement ;
- une opération validée n'est pas supprimée : elle est corrigée par contrepassation lorsqu'une action est disponible ;
- `OWN` limite aux données propres à l'utilisateur lorsque la fonction le permet ; `AGENCY` limite à l'agence active ;
- les anciennes mentions techniques `CONCESSION` ou `GLOBAL` ne sont pas des choix actifs à attribuer dans l'interface RBAC ;
- le rapprochement bancaire compare le relevé externe aux mouvements ERP, sans créer silencieusement un mouvement manquant ;
- les pièces et mouvements conservent auteur, date, source métier et historique.

## 2. Cartographie réelle des écrans

| Rubrique affichée | Chemin UI | Objectif | Permission d'entrée |
|---|---|---|---|
| Vue d'ensemble | Comptabilité & Trésorerie → Vue d'ensemble | Indicateurs financiers, graphiques, situation bancaire, activités | `treasury.view` et `reporting.view` |
| Opérations → Journal financier | … → Opérations → Journal financier | Rechercher, exporter et contrepasser les mouvements | `treasury.view` |
| Opérations → Transferts et comptes | … → Opérations → Transferts et comptes | Consulter les comptes et transférer des fonds | `treasury.view`; action selon permission |
| Engagements → Couverture et réservations | … → Engagements → Couverture et réservations | Mesurer la couverture et gérer les réservations | `treasury.coverage.view` |
| Engagements → Budgets et engagements | … → Engagements → Budgets et engagements | Suivre les budgets partagés avec RH | `treasury.coverage.view`, puis permissions RH par action |
| Rapprochement bancaire | … → Rapprochement bancaire | Importer, valider, rapprocher et contrôler les écarts | `treasury.reconciliation.view` |
| Paramétrage → Comptes financiers | … → Paramétrage de la trésorerie → Comptes financiers | Créer et administrer caisses/banques/autres comptes | `treasury.view`; gestion `treasury.account.manage` avec portée `AGENCY` |
| Paramétrage → Catégories | … → Paramétrage de la trésorerie → Catégories | Classer les entrées et sorties manuelles | `treasury.view`; gestion `treasury.category.manage` avec portée `AGENCY` |
| Paramétrage → Flux automatiques | … → Paramétrage de la trésorerie → Flux automatiques | Lier agence + moyen de paiement à un compte | `treasury.account.manage` avec portée `AGENCY` |
| Comptabilité générale | … → Comptabilité | Écritures, analyses, contrôles et référentiels | au moins une permission `accounting.*.view` |

Onglets de **Comptabilité générale** : Écritures ; Grand livre & balances ; Contrôles & clôtures ; États & échanges ; Intégrations ; Schémas ; Plan comptable ; Exercices ; Journaux ; Liaisons. Un onglet absent signifie que la permission de consultation correspondante n'est pas accordée.

## 3. Préparation et configuration initiale

Ordre recommandé :

1. sélectionner et vérifier l'agence active ;
2. attribuer les permissions avec une portée `OWN` ou `AGENCY` adaptée ;
3. créer les comptes financiers ;
4. créer les catégories d'entrées/sorties ;
5. configurer un compte par combinaison agence/moyen de paiement, puis activer les flux automatiques ;
6. préparer le plan comptable et ses subdivisions imputables ;
7. créer l'exercice et ses périodes mensuelles ;
8. créer les journaux comptables ;
9. lier chaque compte financier à un compte comptable de classe 5 ;
10. configurer et activer les schémas comptables ;
11. tester un flux fictif dans l'environnement de recette et vérifier Trésorerie puis Intégrations/Écritures.

### 3.1 Configurer un compte financier

**Objectif :** représenter une caisse, un compte bancaire ou une autre réserve financière.

**Chemin :** Paramétrage de la trésorerie → Comptes financiers.

**Permission :** `treasury.account.manage` (« Gérer les comptes de trésorerie »), portée `AGENCY` exigée par l'interface de gestion.

**Procédure :**

1. Cliquer **Configurer**.
2. Saisir un code unique en majuscules, chiffres, tirets ou tirets bas.
3. Saisir le nom et, si utile, la description.
4. Choisir **Caisse**, **Banque** ou **Autre**.
5. Choisir le rattachement **Agence** et l'agence accessible. Le formulaire connaît aussi un rattachement concession pour les données historiques/centrales, mais la gestion courante est bornée par la portée active.
6. Valider.

La devise provient du territoire financier choisi. Un compte utilisé conserve son historique. La désactivation empêche de nouvelles opérations mais ne réécrit pas les mouvements passés. Un compte bancaire est requis pour le rapprochement.

### 3.2 Configurer les catégories

**Chemin :** Paramétrage de la trésorerie → Catégories.  
**Permission :** `treasury.category.manage`, portée `AGENCY`.

Cliquer **Nouvelle catégorie**, saisir code, nom, description et sens autorisé : Entrées, Sorties ou les deux. Une catégorie inactive reste visible dans l'historique mais ne doit plus servir aux nouvelles saisies.

### 3.3 Activer les flux automatiques

**Chemin :** Paramétrage de la trésorerie → Flux automatiques.  
**Permission :** `treasury.account.manage`, portée `AGENCY`.

Pour chaque moyen de paiement actif : choisir l'agence, le moyen et le compte compatible, puis enregistrer la liaison. Vérifier que compte, agence, concession et devise concordent. Une liaison ayant un historique financier est conservée de manière traçable. Activer ensuite la configuration des flux. L'activation est refusée s'il n'existe aucun mapping valide.

Cette configuration pilote les encaissements clients, remboursements et règlements de garantie constructeur. Sans activation ou liaison, la transaction métier renvoie une erreur au lieu de produire un mouvement sur un compte arbitraire.

### 3.4 Préparer la comptabilité

**Plan comptable :** Comptabilité → Plan comptable. Rechercher par numéro/intitulé ou classe. Avec `accounting.chart.manage`, créer une subdivision sous un compte parent ; seules les subdivisions imputables peuvent recevoir une ligne. Les comptes de référence sont protégés. Import CSV (`accounting.chart.import`) attend des colonnes numéro/numéro et intitulé/label. Exports CSV et Excel : `accounting.chart.export`.

**Exercice :** Comptabilité → Exercices. Avec `accounting.fiscal.manage`, saisir code, intitulé, dates de début et fin. L'ERP crée les périodes mensuelles. Les transitions contrôlées se font dans **Contrôles & clôtures**.

**Journaux :** Comptabilité → Journaux. Avec `accounting.journal.manage`, saisir code, intitulé et type : Ventes, Achats, Banque, Caisse, Opérations diverses ou Ouverture. Le PDF exige `accounting.journal.advanced.view`.

**Liaisons :** Comptabilité → Liaisons. Avec `accounting.mapping.manage`, choisir le compte financier, un compte comptable imputable de classe 5 et la date d'effet. Cette liaison permet aux schémas utilisant la source « Trésorerie » de déterminer le compte comptable.

**Schémas :** Comptabilité → Schémas. Avec `accounting.scheme.manage`, choisir événement, journal, agence éventuelle, date d'effet et lignes Débit/Crédit. Chaque ligne indique le composant du montant (total, HT, taxe ou montant événement), la source du compte (fixe ou liaison Trésorerie) et son libellé. Un schéma peut être activé/désactivé.

## 4. Vue d'ensemble et indicateurs

**Chemin :** Comptabilité & Trésorerie → Vue d'ensemble.  
**Permissions :** `treasury.view`, `reporting.view`; export `reporting.export`.

Filtres : période prédéfinie ou dates libres, devise et granularité jour/semaine/mois/trimestre/année. Une date de début postérieure à la fin bloque le calcul.

Indicateurs par devise :

- **Solde de trésorerie** : somme des soldes de comptes accessibles à la date de fin ;
- **Disponible** : solde de clôture moins réservations actives ;
- **Caisses / Banques ERP / Autres** : ventilation par nature de compte ;
- **Entrées / Sorties période** : mouvements comptabilisés sur la période ;
- **Variation** : entrées moins sorties ;
- graphiques de tendance : transferts internes exclus des encaissements/décaissements ;
- répartition par origine métier, moyen de paiement et agence ;
- situation bancaire : solde ERP distinct du dernier solde de relevé, relevés en attente et lignes non rapprochées ;
- sections conditionnelles : créances clients, budgets, dettes fournisseurs, rémunérations et couverture selon les permissions disponibles.

Les activités financières sont paginées (20 par page) et filtrables par référence/libellé et origine. **Ouvrir le journal** mène aux opérations. Les exports PDF synthèse, Excel détaillé et CSV détaillé reprennent les filtres de période/devise ; l'export serveur porte sur les données filtrées, pas uniquement sur la page visible. **Imprimer** utilise l'impression du navigateur.

## 5. Encaissements

### 5.1 Règlement d'une facture, y compris vente ou SAV

L'encaissement est initié dans **Facturation & Règl. → facture → Enregistrer un règlement**, pas dans le journal de trésorerie. Il peut être partiel ou intégral, selon le solde restant. Choisir montant, date, moyen de paiement, destination financière proposée/compatible, référence et justificatif lorsqu'il est demandé.

Après confirmation :

- un paiement confirmé est créé et le reste dû de la facture est recalculé ;
- si les flux sont activés, un mouvement `PAYMENT` en entrée est créé sur le compte mappé pour l'agence et le moyen de paiement ;
- l'événement peut produire une pièce comptable si un schéma actif et complet existe ; sinon il apparaît dans **Comptabilité → Intégrations** en échec ou à régulariser ;
- le reçu et la pièce GED restent liés au paiement lorsque l'archivage est disponible.

Pour un paiement partiel fictif de 4 000 000 XAF sur une facture de 10 000 000 XAF, l'encaissement est 4 000 000 XAF et le restant dû 6 000 000 XAF. Ne pas ressaisir ce règlement en entrée manuelle : cela créerait un doublon économique.

### 5.2 Entrée de fonds manuelle

**Objectif :** enregistrer une recette indépendante d'une facture.  
**Chemin :** n'importe quelle page Trésorerie → **Nouvelle entrée**.  
**Permission :** `treasury.receipt.create` (« Créer une entrée manuelle »).

1. Choisir un compte actif accessible.
2. Saisir un montant strictement positif ; la devise est celle du compte.
3. Choisir une catégorie autorisant les entrées.
4. Saisir date de valeur, motif/description, moyen de paiement, référence éventuelle et contrepartie éventuelle.
5. Vérifier, puis valider.
6. Ajouter/consulter les documents depuis le journal lorsque le bouton de documents apparaît.

Résultat : mouvement `MANUAL_RECEIPT` comptabilisé, solde du compte augmenté et opération auditée. Le formulaire utilise une clé de requête client pour éviter un double envoi involontaire.

## 6. Décaissements et remboursements

### 6.1 Sortie manuelle

**Chemin :** page Trésorerie → **Nouvelle sortie**.  
**Permission :** `treasury.disbursement.create` (« Créer une sortie manuelle »).

Choisir compte, montant, catégorie autorisant les sorties, date, motif, moyen de paiement, référence, bénéficiaire/contrepartie et « Fonds remis à » si utile. Le compte doit disposer d'un solde disponible suffisant. La validation crée `MANUAL_DISBURSEMENT`, diminue le solde et conserve la traçabilité. En cas d'erreur, utiliser la contrepassation ; ne pas supprimer la ligne.

### 6.2 Décaissement budgétaire

Les dépenses budgétaires sont issues du module RH/Budgets. Seule une dépense approuvée peut être décaissée avec `hr.expense.disburse`. L'opération crée `BUDGET_EXPENSE_DISBURSEMENT`, consomme la réservation compatible le cas échéant et actualise « Décaissé » et « Reste à payer ». Un engagement ou une réservation seuls ne modifient pas le solde.

### 6.3 Remboursement client

Le remboursement part de la facture/paiement d'origine. Il reprend le compte d'encaissement initial, le moyen et la devise. Il est refusé si le mouvement d'origine est introuvable, le compte incompatible/inactif ou le solde insuffisant. Le mouvement `PAYMENT_REFUND` est une sortie et doit être recherché par sa référence dans le journal.

## 7. Transferts de fonds

**Chemin :** Opérations → Transferts et comptes → **Transférer**.  
**Permission :** `treasury.transfer.create`.

1. Choisir le compte source.
2. Choisir une destination compatible et différente.
3. Saisir un montant positif inférieur ou égal au disponible.
4. Saisir la description.
5. Valider.

Le système exige même devise et périmètre compatible. Il crée deux mouvements liés : sortie source et entrée destination. Le total global de trésorerie ne change pas ; l'indicateur « Transactions internes » les suit séparément. Une contrepassation de transfert crée les mouvements inverses auditables.

### Transfert SAV en transit

Le SAV possède son propre workflow : les paiements d'atelier confirmés déterminent un montant disponible par moyen de paiement ; un utilisateur habilité initie un transfert vers une destination compatible, puis une décision **Confirmé**, **Refusé** ou **Annulé** est enregistrée. Ce workflow utilise les permissions `service.transit.*` et se consulte aussi dans le journal SAV. Il ne faut pas le confondre avec le bouton de transfert direct entre comptes Treasury.

## 8. Journal financier et correction

**Chemin :** Opérations → Journal financier.  
**Permission :** `treasury.view`; contrepassation `treasury.reverse`.

Filtres : compte, sens, catégorie, dates Du/Au. Le tableau indique date, compte, entrée/sortie, montant, catégorie, référence métier, origine, statut et action. La pagination serveur propose 10 éléments par défaut puis 20, 50 ou 100.

L'export CSV reprend tous les mouvements correspondant aux filtres : date, type, compte, référence, description, entrée, sortie, devise, statut, catégorie, moyen, agence, concession et auteur. Il ne se limite pas à la page affichée.

Pour corriger une opération réversible : cliquer **Contrepasser**, saisir un motif explicite, confirmer. Le mouvement original reste visible comme contrepassé et une écriture inverse est ajoutée. Les mouvements déjà inversés ou protégés par leur origine peuvent être non réversibles depuis cet écran.

## 9. Couverture, budgets et réservations

### Lire la couverture

**Trésorerie éligible** = soldes des comptes actifs Caisse et Banque.  
**Liquidités non affectées** = trésorerie éligible moins réservations actives.  
**Reste à payer** = engagements approuvés moins décaissements.  
**Insuffisance indicative** signale l'écart non couvert par devise ; aucune conversion n'est effectuée.

### Réserver des liquidités

**Permission :** `treasury.reservation.create`.

Cliquer **Réserver**, choisir un compte Caisse/Banque et une dépense approuvée compatible, saisir montant, motif, bénéficiaire, échéance et référence. Une insuffisance disponible bloque la création. La demande commence en brouillon ; elle ne diminue pas le solde.

Cycle et permissions :

- Brouillon/Rejetée → **Soumettre** : `treasury.reservation.submit` ;
- Soumise → **Approuver/Rejeter** : `treasury.reservation.approve` ;
- Active → **Réduire** : `treasury.reservation.adjust` (augmentation interdite) ;
- Active → **Libérer** : `treasury.reservation.release` ;
- Brouillon/Soumise/Rejetée → **Annuler** : `treasury.reservation.cancel` ;
- Active → **Expirer** : `treasury.reservation.expire`.

Les décisions demandent un motif. **Historique** montre la chronologie. Une réservation consommée par un décaissement devient traçable comme telle.

### Budgets et engagements

Cette page partage les données RH. Elle affiche enveloppe, engagé, décaissé, disponible et dates. Selon permissions RH : soumettre, approuver/rejeter, rouvrir un rejet, demander/approuver une rallonge ou clôturer. La clôture est définitive et bloquée par demandes en attente, engagements non soldés, réservations actives ou rallonges soumises.

## 10. Rapprochement bancaire

**Chemin :** Rapprochement bancaire.  
**Prérequis :** compte actif de type Banque, portée `AGENCY`, relevé fictif/autorisé.

1. Avec `treasury.reconciliation.import`, cliquer **Importer**.
2. Choisir le compte, éventuellement un profil, puis un CSV/XLSX (10 Mo max) ou PDF (20 Mo max).
3. Analyser l'aperçu et les avertissements d'extraction.
4. Avec `treasury.reconciliation.validate_import`, valider ou rejeter le relevé.
5. Ouvrir une ligne non rapprochée ; consulter les propositions.
6. Avec `treasury.reconciliation.reconcile`, sélectionner le mouvement ERP et confirmer. Le rapprochement groupé permet plusieurs allocations explicites.
7. Qualifier les écarts avec `treasury.reconciliation.discrepancy.manage` ; aucune correction financière silencieuse n'est produite.
8. Exporter le CSV (`treasury.reconciliation.export`) ou ouvrir le PDF officiel du relevé sélectionné.

L'annulation (`treasury.reconciliation.cancel`) exige un motif et retire le lien de rapprochement sans modifier le mouvement de trésorerie. Les profils d'import (`treasury.reconciliation.profile.manage`) sont créés en brouillon puis doivent être validés avant réutilisation. Le tableau de pilotage bancaire nécessite `treasury.reconciliation.dashboard`.

## 11. Écritures comptables en partie double

### Consulter et rechercher

**Chemin :** Comptabilité → Écritures.  
**Permission :** `accounting.entry.view`.

Filtrer par recherche (numéro, référence, libellé), journal, statut et dates. La liste est paginée. Ouvrir une pièce pour voir date, journal, auteur, lignes, débit/crédit, source et historique disponible. Le PDF officiel est accessible depuis le détail. Export CSV/XLSX avec `accounting.entry.export` reprend les filtres serveur.

### Créer une écriture manuelle

**Permission :** `accounting.entry.create`.

1. Cliquer **Nouvelle écriture**.
2. Choisir agence, exercice/période ouverte, journal et date comptable.
3. Saisir référence et libellé.
4. Ajouter au moins deux lignes : compte imputable, libellé, débit ou crédit.
5. Vérifier que total débit = total crédit et que le total est positif.
6. Cliquer **Enregistrer le brouillon**.

Un brouillon n'est pas encore comptabilisé. La validation (`accounting.entry.validate`) vérifie équilibre, période, comptes et données obligatoires. La comptabilisation (`accounting.entry.post`) attribue le numéro définitif. Une pièce comptabilisée se corrige avec `accounting.entry.reverse`, qui crée une pièce inverse ; elle n'est pas modifiée directement. `accounting.entry.update` ne concerne que les brouillons, même si l'interface actuelle concentre surtout création et actions de statut.

## 12. Grand livre, balances, contrôles et clôtures

**Grand livre & balances** (`accounting.ledger.view` / `accounting.balance.view`) : sélectionner Du/Au puis Grand livre, Balance générale, Auxiliaires ou Journaux. Le grand livre montre compte, date, pièce, libellé, débit, crédit et solde courant. La balance montre ouverture, mouvements et clôture. Les auxiliaires signalent les écritures sans tiers. Les journaux contrôlent notamment la continuité de séquence. Exports PDF/XLSX/CSV : `accounting.advanced.export`.

**Contrôles & clôtures** :

- consulter les exécutions et anomalies : `accounting.control.view` ;
- **Exécuter les contrôles** non destructifs : `accounting.control.execute` ;
- préparer/clôturer/rouvrir une période : `accounting.closure.manage` ; une réouverture exige un motif d'au moins dix caractères ;
- la préparation annuelle analyse seulement les prérequis ;
- **Préparer le report à nouveau** (`accounting.carryforward.manage`) calcule les soldes mais ne génère aucune écriture tant que journal d'ouverture, contreparties et règles d'affectation ne sont pas validés.

## 13. Intégrations et schémas automatiques

**Intégrations** (`accounting.integration.view`) liste date, événement, référence, agence, état, tentatives et pièce produite. Avec `accounting.integration.error.view`, le motif d'échec est visible. Avec `accounting.integration.retry`, **Rechercher les nouveaux événements** puis **Relancer** un événement En échec/À régulariser/En attente. La source métier est unique afin d'éviter une double pièce.

États : En attente, En traitement, Comptabilisé, Échec, À régulariser, Ignoré. Une relance ne remplace pas la correction d'un plan, journal, liaison ou schéma erroné.

## 14. États, échanges et limites SYSCOHADA

L'onglet **États & échanges** est consultatif :

- les états sont explicitement **préparatoires** ; aucun bilan ou compte de résultat n'est déclaré officiel sans nomenclature, source et validation réglementaire ;
- les profils d'échange sont consultables ; l'adaptateur Sage reste désactivé sans produit, version et format validés ;
- les permissions d'administration/export/import existent côté backend, mais aucun workflow complet d'édition/import d'échange n'est exposé dans cet écran.

Le plan et la partie double s'inspirent du référentiel SYSCOHADA. Cela ne constitue pas une certification de conformité réglementaire complète.

## 15. Scénarios de formation

### A — Vente réglée intégralement

Facture véhicule fictive : 18 000 000 XAF. Depuis la facture, enregistrer 18 000 000 XAF avec le moyen et la destination proposés. Contrôler : solde facture à zéro, paiement confirmé, entrée de 18 000 000 XAF dans Journal financier, puis événement/pièce dans Comptabilité → Intégrations/Écritures si le schéma est actif.

### B — Encaissement partiel

Facture 10 000 000 XAF ; régler 4 000 000 XAF. Vérifier paiement de 4 000 000 XAF, reste dû 6 000 000 XAF et une seule entrée Treasury. Un second paiement pourra solder le reliquat.

### C — Entrée indépendante

Cliquer **Nouvelle entrée**, compte Caisse XAF, catégorie Recettes diverses, 250 000 XAF, date, motif et référence. Valider puis rechercher la référence dans le journal. Ne pas utiliser cette procédure pour reproduire un paiement de facture.

### D — Sortie avec justificatif

Cliquer **Nouvelle sortie**, compte Banque XAF, catégorie appropriée, 125 000 XAF, bénéficiaire, motif et référence. Valider, ajouter le document depuis la ligne manuelle, puis vérifier le nouveau solde. En cas d'erreur, contrepasser avec motif.

### E — Transfert

Transférer 500 000 XAF d'une Caisse vers une Banque compatible. Vérifier la sortie et l'entrée liées ; le total XAF global reste identique.

### F — Encaissement SAV et transit

Enregistrer le règlement sur la facture atelier. Il produit le paiement/flux automatique selon configuration. Le workflow SAV peut ensuite initier un transfert en transit par moyen de paiement vers une destination compatible, soumis à décision. Contrôler le journal SAV et le Journal financier ; ne pas saisir une entrée manuelle doublon.

### G — Contrôle comptable

Rechercher la référence dans Intégrations, ouvrir la pièce dans Écritures, vérifier l'égalité débit/crédit, puis retrouver les lignes dans Grand livre et Journaux. Si l'intégration est à régulariser, corriger le paramétrage avant relance.

### H — Reporting

Choisir le mois, XAF et granularité Jour dans Vue d'ensemble. Lire soldes/flux, situation bancaire et sections autorisées. Exporter PDF synthèse ou Excel détaillé ; les filtres sont repris par l'export.

## 16. Matrice RBAC essentielle

| Permission | Libellé / action | Portée et écran |
|---|---|---|
| `treasury.view` | Voir la trésorerie | Consultation dans l'agence active |
| `treasury.account.manage` | Gérer les comptes | Paramétrage ; gestion UI avec `AGENCY` |
| `treasury.category.manage` | Gérer les catégories | Paramétrage ; gestion UI avec `AGENCY` |
| `treasury.receipt.create` | Créer une entrée manuelle | Bouton Nouvelle entrée |
| `treasury.disbursement.create` | Créer une sortie manuelle | Bouton Nouvelle sortie |
| `treasury.transfer.create` | Créer un transfert | Transferts et comptes |
| `treasury.reverse` | Contrepasser un mouvement | Journal financier |
| `treasury.coverage.view` | Voir la couverture | Engagements |
| `treasury.reservation.*` | Créer/voir/soumettre/approuver/ajuster/libérer/annuler/expirer | Couverture et réservations |
| `treasury.reconciliation.*` | Voir/importer/valider/rapprocher/annuler/exporter/piloter/profils/écarts | Rapprochement bancaire ; collectif, `AGENCY` |
| `reporting.view`, `reporting.export` | Voir/exporter le pilotage | Vue d'ensemble |
| `accounting.entry.*` | Voir/créer/modifier/valider/comptabiliser/contrepasser/exporter | Écritures |
| `accounting.chart.*` | Voir/gérer/importer/exporter | Plan comptable |
| `accounting.fiscal.*` | Voir/gérer exercices | Exercices |
| `accounting.journal.*` | Voir/gérer les journaux | Journaux |
| `accounting.mapping.*` | Voir/gérer les liaisons | Liaisons |
| `accounting.scheme.*` | Voir/gérer les schémas | Schémas |
| `accounting.integration.*` | Voir erreurs, relancer, exporter | Intégrations |
| `accounting.ledger.view`, `accounting.balance.view` | Grand livre et balance | Analyses |
| `accounting.control.*`, `accounting.closure.manage` | Contrôles et clôtures | Contrôles & clôtures |
| `accounting.statement.view`, `accounting.exchange.view` | Consultation préparatoire | États & échanges |

Toujours vérifier le libellé et la portée dans **Utilisateurs & RBAC**. Seules les portées `OWN` et `AGENCY` doivent être proposées comme actives.

### Répertoire détaillé des permissions

| Code | Libellé fonctionnel | Effet réel |
|---|---|---|
| `treasury.reservation.view` | Voir les réservations | Liste et historique du périmètre |
| `treasury.reservation.create` | Créer une réservation | Brouillon lié à une dépense approuvée |
| `treasury.reservation.submit` | Soumettre une réservation | Brouillon/Rejetée vers Soumise |
| `treasury.reservation.approve` | Approuver une réservation | Approuver ou rejeter une demande soumise |
| `treasury.reservation.adjust` | Ajuster une réservation | Réduire une réservation active |
| `treasury.reservation.release` | Libérer une réservation | Libération motivée du montant actif |
| `treasury.reservation.cancel` | Annuler une demande | Annulation avant activation |
| `treasury.reservation.expire` | Expirer une réservation | Expiration motivée du reliquat actif |
| `treasury.reconciliation.view` | Voir les relevés bancaires | Relevés, lignes, propositions et écarts |
| `treasury.reconciliation.import` | Importer un relevé | Analyse CSV/XLSX/PDF |
| `treasury.reconciliation.validate_import` | Valider un relevé | Validation, rejet ou annulation d'import |
| `treasury.reconciliation.reconcile` | Valider un rapprochement | Lien simple ou groupé explicite |
| `treasury.reconciliation.cancel` | Annuler un rapprochement | Annulation motivée sans mouvement Treasury |
| `treasury.reconciliation.export` | Exporter les rapprochements | CSV et documents disponibles |
| `treasury.reconciliation.dashboard` | Voir le pilotage bancaire | Indicateurs de rapprochement |
| `treasury.reconciliation.profile.manage` | Gérer les profils d'import | Création et cycle des profils bancaires |
| `treasury.reconciliation.discrepancy.manage` | Gérer les écarts bancaires | Qualification/résolution sans écriture silencieuse |
| `accounting.entry.view` | Consulter les écritures | Liste, détail et PDF selon périmètre |
| `accounting.entry.create` | Créer une écriture | Création d'un brouillon manuel |
| `accounting.entry.update` | Modifier un brouillon | Backend autorisé sur pièces DRAFT seulement |
| `accounting.entry.validate` | Valider une écriture | Contrôles et passage au statut validé |
| `accounting.entry.post` | Comptabiliser une écriture | Numéro définitif et statut comptabilisé |
| `accounting.entry.reverse` | Contrepasser une écriture | Pièce inverse comptabilisée |
| `accounting.entry.export` | Exporter les écritures | CSV/XLSX filtrés |
| `accounting.entry.history.view` | Voir l'historique comptable | Traçabilité des changements de pièce |
| `accounting.chart.view` | Consulter le plan | Recherche et pagination |
| `accounting.chart.manage` | Administrer le plan | Créer/gérer des subdivisions |
| `accounting.chart.import` | Importer le plan | Import CSV contrôlé |
| `accounting.chart.export` | Exporter le plan | CSV et Excel |
| `accounting.fiscal.view` | Consulter les exercices | Exercices et périodes |
| `accounting.fiscal.manage` | Gérer les exercices | Création et ouverture d'exercice |
| `accounting.period.manage` | Gérer les périodes | Permission de référentiel ; transitions via clôtures |
| `accounting.journal.view` | Consulter les journaux | Référentiel des journaux |
| `accounting.journal.manage` | Administrer les journaux | Création et gestion |
| `accounting.journal.advanced.view` | Consulter les journaux avancés | Analyse de continuité et PDF |
| `accounting.mapping.view` | Consulter les liaisons | Treasury vers classe 5 |
| `accounting.mapping.manage` | Administrer les liaisons | Création/gestion avec date d'effet |
| `accounting.scheme.view` | Consulter les schémas | Règles d'automatisation |
| `accounting.scheme.manage` | Administrer les schémas | Création et activation/désactivation |
| `accounting.integration.view` | Consulter les intégrations | File d'événements comptables |
| `accounting.integration.error.view` | Consulter les erreurs | Détail du dernier échec |
| `accounting.integration.retry` | Relancer une intégration | Découverte et nouvelle tentative |
| `accounting.integration.export` | Exporter les intégrations | Autorisation backend d'export |
| `accounting.ledger.view` | Consulter le grand livre | Lignes et soldes courants |
| `accounting.balance.view` | Consulter la balance | Ouverture, mouvements et clôture |
| `accounting.control.view` | Consulter les contrôles | Exécutions et anomalies |
| `accounting.control.execute` | Exécuter les contrôles | Contrôles non destructifs |
| `accounting.closure.manage` | Gérer les clôtures | Préparer, clôturer, rouvrir |
| `accounting.carryforward.manage` | Préparer les reports | Calcul préparatoire sans écriture |
| `accounting.statement.view` | Consulter les états financiers | Modèles préparatoires seulement |
| `accounting.statement.manage` | Gérer les modèles d'états | Permission backend ; UI d'administration non complète |
| `accounting.advanced.export` | Exporter la comptabilité avancée | Grand livre/balance/journaux |
| `accounting.exchange.view` | Consulter les échanges | Profils et historiques préparatoires |
| `accounting.exchange.export` | Exporter les échanges | Nécessite un profil cible validé |
| `accounting.exchange.import` | Importer des échanges | Nécessite un profil validé ; pas de parcours UI complet |

Les permissions `hr.budget.*`, `hr.expense.*`, `hr.approval.history.view` et `service.transit.*` restent rattachées à leurs modules d'origine même lorsque leur résultat est affiché dans l'espace financier.

## 17. Erreurs fréquentes

| Message/situation | Cause probable | Action |
|---|---|---|
| Permission insuffisante / hors périmètre | permission absente, portée OWN trop faible, mauvaise agence active | changer d'agence autorisée ou demander la permission AGENCY adaptée |
| Solde insuffisant | sortie, transfert ou remboursement supérieur au solde disponible | réduire le montant ou approvisionner le compte par un flux légitime |
| Compte inactif/incompatible | mauvaise agence, concession, devise, nature ou moyen de paiement | corriger compte/mapping ; ne pas contourner par saisie manuelle |
| Intégration Trésorerie non activée | configuration des flux non prête | compléter les mappings puis activer |
| Aucun schéma / À régulariser | schéma, journal ou compte comptable manquant | corriger le paramétrage puis relancer l'intégration |
| Écriture non équilibrée | total débit différent du crédit | corriger les lignes avant enregistrement/validation |
| Période fermée | date dans une période clôturée | utiliser une période ouverte ou faire rouvrir avec justification |
| Doublon / opération déjà enregistrée | même événement ou clé client déjà traité | retrouver l'opération existante ; ne pas ressaisir |
| Réservation incompatible | devise, territoire, dépense ou montant non compatible | sélectionner un compte/dépense compatible et disponible |
| Relevé refusé | format, taille, profil ou compte Banque invalide | utiliser CSV/XLSX ≤10 Mo ou PDF ≤20 Mo et un profil validé |
| Erreur technique | indisponibilité API/BDD | ne pas répéter aveuglément ; noter référence/heure et contacter l'administrateur |

## 18. Glossaire

- **Compte financier** : caisse, banque ou réserve suivie dans Treasury.
- **Compte comptable** : compte du plan recevant débits et crédits.
- **Mouvement** : entrée ou sortie modifiant le solde d'un compte financier.
- **Engagement** : dépense prévue/approuvée ; ne modifie pas encore la trésorerie.
- **Réservation** : affectation d'une partie du disponible à un engagement ; ne décaisse pas.
- **Contrepassation** : nouvelle opération inverse qui corrige sans effacer l'historique.
- **Rapprochement** : lien explicite entre ligne bancaire et mouvement ERP.
- **Schéma comptable** : règle transformant un événement métier en lignes débit/crédit.
- **Pièce comptable** : ensemble équilibré de lignes dans un journal et une période.

## 19. Fonctionnalités non disponibles ou limitées

- pas de conversion de devises ;
- pas de suppression d'une opération financière comptabilisée ;
- pas d'état financier officiel certifié automatiquement ;
- pas d'adaptateur Sage actif sans profil produit/version/format validé ;
- report à nouveau limité à une préparation non comptabilisante ;
- aucune correction silencieuse créée par le rapprochement bancaire ;
- pas de création générique de créance/dette directement depuis Treasury : elles proviennent des factures clients, fournisseurs et autres modules ;
- la modification détaillée d'un brouillon comptable existe côté autorisation/API mais n'est pas un parcours complet mis en avant dans l'écran actuel ;
- les exports ne constituent pas, à eux seuls, une validation réglementaire ou fiscale.

## 20. Contrôle de fin d'opération

Après toute opération sensible : conserver la référence, vérifier le message de succès, rechercher la ligne dans son historique métier, contrôler le Journal financier, puis Intégrations/Écritures si un impact comptable automatique est attendu. Ne jamais compenser une anomalie par une seconde saisie sans avoir identifié la première.
