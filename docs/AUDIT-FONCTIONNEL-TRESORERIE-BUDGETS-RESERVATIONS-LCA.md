# Audit fonctionnel et architectural — Trésorerie, budgets et réservations

**Projet :** ERP/CRM LCA  
**Date de l'audit :** 14 octobre 2026  
**Révision examinée :** `ef7281d69b605d40353a829df92f8a60dee318b8` (`main`)  
**Nature :** audit documentaire, statique et lectures SQL uniquement  
**Archive officielle vérifiée :** `7a05ce52ace2033a5beb0b1f8ff967e346f4e63c8c0fe20bf29b91b0500ea3cc`

## Légende de qualification

- **EXISTANT ET OPÉRATIONNEL** : parcours cohérent dans le code, protégé côté serveur et couvert par des tests ciblés ; la qualification navigateur reste distincte.
- **EXISTANT MAIS INCOMPLET** : fondation réelle, mais action, règle, exposition UI ou couverture de test manquante.
- **ABSENT** : aucun mécanisme fonctionnel trouvé.
- **À CONFIRMER PAR RECETTE** : constat statique ou base locale insuffisamment peuplée ; aucune exécution métier n'est revendiquée.
- **RECOMMANDATION D'ÉVOLUTION** : proposition, non implémentée pendant cet audit.

## 1. Résumé exécutif

Le constat d'« absence » est principalement un problème d'organisation et de découvrabilité, mais pas uniquement.

1. La gestion des budgets existe dans **RH & Administration > Budgets** : création en brouillon, soumission, approbation/rejet avec séparation créateur-décideur, dépenses, clôture et rallonges. Elle n'est pas présentée comme un sous-ensemble de Comptabilité & Trésorerie. Un utilisateur possédant uniquement les droits Treasury ne peut donc pas la trouver ni nécessairement l'utiliser.
2. La réservation de liquidité existe dans **Comptabilité & Trésorerie > Couverture**. Elle devient immédiatement `ACTIVE`, doit viser une dépense approuvée et un compte Caisse/Banque compatible, et ne crée aucun mouvement financier. Le parcours est toutefois incomplet : identifiant de dépense saisi manuellement, aucune soumission/approbation, aucun bénéficiaire ni échéance, pas d'annulation/expiration, ajustement et historique disponibles par API mais non exposés dans l'écran.
3. Les concepts financiers sont globalement bien séparés : enveloppe, engagement approuvé, décaissement, solde Treasury et réservation. Les soldes sont dérivés des mouvements `POSTED`; une réservation n'altère pas le solde bancaire.
4. **Risque P0 identifié** : `postMovement` protège les réservations contre les sorties ordinaires, mais exclut toutes les sorties `BUDGET_EXPENSE_DISBURSEMENT`. Comme `reservationId` est facultatif, un décaissement budgétaire non réservé peut consommer des liquidités déjà réservées à une autre dépense. Le contrôle préalable utilise le solde brut et non le solde non affecté.
5. **Risque P0 de gouvernance** : une rallonge d'un budget actif est immédiatement effective avec `hr.budget.manage`, sans soumission ni approbation séparée. Elle permet d'augmenter une enveloppe approuvée en dehors du principe des quatre yeux.
6. La base locale est techniquement à jour (migration maximale 82), mais très peu peuplée sur ce périmètre : 1 budget `draft`, 0 dépense, 0 réservation, 0 décaissement budgétaire. Elle ne permet pas une recette métier probante. Les résultats fonctionnels détaillés ci-dessous proviennent donc de l'analyse et de tests statiques ciblés, pas d'une recette transactionnelle sur cette base.

**Verdict : EXISTANT MAIS INCOMPLET.** Les fondations sont solides et réutilisables. Aucun second système budgétaire ne doit être créé. Avant qualification de production, les deux risques P0 doivent être corrigés et testés, puis le workflow et l'UX des réservations doivent être décidés.

## 2. Cartographie du module

### 2.1 Frontend

| Emplacement | Fonction | Accès | Qualification |
|---|---|---|---|
| `/treasury`, onglet Vue d'ensemble | Solde dérivé, entrées, sorties, comptes accessibles | `treasury.view` | EXISTANT ET OPÉRATIONNEL |
| `/treasury`, Couverture | Couverture par devise, budgets approuvés, réservations | `treasury.coverage.view`, `treasury.reservation.view` | EXISTANT MAIS INCOMPLET |
| `/treasury`, Rapprochement bancaire | Import CSV, validation, rapprochement, annulation, export | permissions `treasury.reconciliation.*` | EXISTANT ET OPÉRATIONNEL, À CONFIRMER PAR RECETTE |
| `/treasury`, Comptes | Comptes, transfert, activation/désactivation | `treasury.view`, `treasury.account.manage`, `treasury.transfer.create` | EXISTANT ET OPÉRATIONNEL |
| `/treasury`, Journal | Filtres, pagination, export CSV, contrepassation | `treasury.view`, `treasury.reverse` | EXISTANT ET OPÉRATIONNEL |
| `/treasury`, Catégories | Référentiel par concession | `treasury.category.manage` | EXISTANT ET OPÉRATIONNEL |
| `/treasury`, Configuration des flux | Mappings agence/moyen de paiement/compte et activation | `treasury.account.manage` | EXISTANT ET OPÉRATIONNEL |
| `/hr`, onglet Budgets | Création, soumission, décision, dépenses, rallonges | permissions `hr.budget.*`, `hr.expense.*` | EXISTANT MAIS MAL POSITIONNÉ |

La barre latérale sépare « Comptabilité & Trésorerie » et « RH & Administration ». Le libellé de la page RH mentionne le « pilotage budgétaire », mais l'utilisateur cherchant un budget depuis Treasury ne dispose d'aucun renvoi explicite.

### 2.2 API principales

- Budgets : `GET/POST /hr/budgets`, `POST /submit`, `/approve`, `/reject`, `/reopen`, `/cancel`, `/close`, consultation de l'historique et des fonds.
- Dépenses : création sous budget, soumission, approbation, rejet, annulation, modification des seules métadonnées, consultation et décaissement.
- Couverture : `GET /treasury/coverage` et `/treasury/budget-indicators`.
- Réservations : liste, création, ajustement, libération, historique.
- Treasury : comptes, catégories, journal, export, résumé, entrées/sorties manuelles, transferts, contrepassations et flux automatiques.
- Rapprochement : routes dédiées dans `bank-reconciliation.routes.ts`.

### 2.3 Tables structurantes

| Domaine | Tables |
|---|---|
| Budget | `budget_categories`, `budgets`, `budget_fund_movements`, `budget_expenses`, `budget_approval_history` |
| Décaissement budgétaire | `budget_expense_disbursements` puis `treasury_movements` |
| Treasury | `treasury_accounts`, `treasury_categories`, `treasury_movements`, `treasury_transfers`, `treasury_manual_operations` |
| Réservation | `treasury_reservations`, `treasury_reservation_events` |
| Flux automatiques | `treasury_flow_configurations`, `treasury_account_mappings` |
| Rapprochement | `bank_statements`, `bank_statement_lines`, `bank_reconciliations`, `bank_reconciliation_history` |
| Audit transverse | journal d'activité via `writeAudit` |

## 3. Fonctionnalités opérationnelles

- Solde dérivé exclusivement des mouvements comptabilisés, sans champ de solde éditable.
- Entrées et sorties manuelles idempotentes avec catégories, contrepartie, date de valeur et justificatifs.
- Transfert atomique à deux écritures, devise identique et verrouillage ordonné des comptes.
- Contrepassation additive : l'historique d'origine n'est pas réécrit.
- Journal paginé, filtrable et exportable en CSV avec audit de l'export.
- Comptes et catégories territorialisés ; désactivation sans suppression d'historique.
- Workflow budget `draft -> submitted -> active|rejected`, puis `active -> closed`; `draft -> cancelled`; rejet resoumissible.
- Interdiction serveur d'auto-approbation du budget et de la dépense.
- Engagement budgétaire comptabilisé seulement pour une dépense `approved`.
- Décaissement partiel ou total d'une dépense approuvée, avec idempotence et mouvement Treasury unique.
- Réservation atomique plafonnée par le reste à payer et la trésorerie non affectée, avec idempotence par `(created_by, client_request_id)`.
- Consommation partielle progressive d'une réservation ; passage à `CONSUMED` lorsque le reliquat atteint zéro.
- Libération sans suppression, avec événement et audit.
- Couverture distincte par devise, sans conversion implicite.
- Rapprochement bancaire externe sans création ou modification d'une écriture Treasury.

Ces qualifications reposent sur le code et les tests ciblés réussis. Les parcours navigateur n'ont pas été rejoués durant cette mission d'audit.

## 4. Fonctionnalités partielles

| Fonction | Écart |
|---|---|
| Gestion budgétaire dans Treasury | Lecture d'indicateurs seulement ; création et décisions restent cachées dans RH |
| Rejet d'un budget | Resoumission API possible, mais aucun écran de modification du budget rejeté |
| Réouverture/annulation du budget | API existantes, aucune action UI trouvée |
| Historique d'approbation | API existante, aucun composant de consultation trouvé |
| Rallonge | Historique immuable, mais pas de circuit d'approbation ni séparation demandeur/décideur |
| Création d'une réservation | Formulaire réel, mais exige l'ID numérique de la dépense au lieu d'une sélection métier |
| Ajustement d'une réservation | API et hook frontend présents, aucune action UI |
| Libération | UI présente, mais motif codé en dur « Libération manuelle validée » |
| Historique de réservation | API présente, aucune vue UI |
| Consommation | Disponible depuis le formulaire de décaissement RH, pas depuis la liste Treasury |
| Rapprochement bancaire | Parcours complet dans le code, mais base locale vide et recette réelle non exécutée |
| Rapports | Plusieurs indicateurs et exports existent, sans écran unifié de contrôle budget/liquidité |

## 5. Fonctionnalités absentes

- Workflow de soumission, approbation et rejet d'une réservation.
- Bénéficiaire, date d'échéance et date d'expiration sur une réservation.
- Annulation fonctionnelle de réservation : le statut `CANCELLED` et l'événement existent dans le schéma, mais aucune route/service ne les produit.
- Expiration automatique ou manuelle et statut `EXPIRED`.
- Approbation des rallonges budgétaires.
- Seuils ou niveaux multiples d'approbation des budgets/rallonges/réservations.
- Modification financière d'un budget rejeté ; seule la resoumission du même contenu est possible.
- Vue de file d'attente « à approuver » commune aux budgets, dépenses et réservations.
- Sélection assistée des dépenses réservables avec montant restant, devise et périmètre.
- Test dédié prouvant qu'un décaissement budgétaire non réservé ne peut pas consommer les fonds réservés à autrui.

## 6. Audit des budgets

### 6.1 Cycle réel

```text
draft --submit--> submitted --approve--> active --close--> closed
                           \--reject--> rejected --submit--> submitted
draft --cancel--> cancelled
rejected --reopen--> draft          (API uniquement)
```

Le statut proposé `EN_EXÉCUTION` est déjà représenté par `active`. Il n'est pas utile d'ajouter un doublon. Le terme UI « Approuvé » pour `active` est cohérent si la documentation précise qu'il autorise l'exécution.

### 6.2 Actions

| Action | Réalité |
|---|---|
| Créer / enregistrer brouillon | Oui, `POST /hr/budgets`, statut `draft` |
| Modifier budget | Non ; aucune route de modification du libellé, période, portée, catégorie ou montant |
| Supprimer | Non, choix cohérent avec la traçabilité |
| Soumettre | Oui, brouillon ou rejeté |
| Approuver/rejeter | Oui, statut soumis, motif obligatoire au rejet, auto-décision interdite |
| Annuler | Oui par API, seulement brouillon sans engagement ; non exposé UI |
| Clôturer | Oui ; aucune vérification des engagements non soldés ou réservations actives |
| Augmenter | Oui par mouvement de rallonge immuable ; aucune approbation dédiée |
| Consulter consommation | Oui, mais « dépensé/consommé » signifie **engagé approuvé**, pas nécessairement décaissé |
| Historique | Tables et API présentes ; UI absente |

### 6.3 Règles solides

- Montant strictement positif, période cohérente et cible territoriale contrôlée.
- Catégorie active et appartenant à la concession cible.
- Une dépense n'est créée que sur budget actif et dans sa période.
- À l'approbation de la dépense, le budget et les engagements sont reverrouillés et la disponibilité recalculée.
- Le créateur ne peut décider ni son budget ni sa dépense.

### 6.4 Écarts critiques

- Une rallonge active avec le seul droit `hr.budget.manage` contourne l'approbation initiale. **P0**.
- La clôture ne contrôle ni reste à payer, ni réservation active. La clôture est donc administrative, pas financièrement soldée. Une décision métier puis une règle serveur sont nécessaires. **P0/P1 selon politique retenue**.
- Un budget rejeté peut être resoumis mais ne peut pas être corrigé. **P1**.

## 7. Analyse des budgets RH existants

Il n'existe pas un « budget RH » distinct d'un « budget Treasury ». Les mêmes tables `budgets` et `budget_expenses` alimentent :

- les cartes de RH & Administration ;
- les indicateurs de couverture Treasury ;
- les décaissements Treasury ;
- le reporting consolidé ;
- les factures fournisseurs imputées au budget.

La source de vérité est donc déjà unique au niveau des données. Le risque de duplication apparaît seulement si un second modèle budgétaire est créé pour corriger le problème d'UX.

**Recommandation :** conserver les tables et règles uniques, extraire progressivement un service métier « Budget & engagements » partagé, et exposer ses composants dans les deux navigations : administration dans un onglet Budgets de Comptabilité & Trésorerie, consommation spécialisée depuis RH et les modules métiers. Ne pas copier les données et ne pas déplacer physiquement les tables.

## 8. Audit des approbations

### 8.1 Existant

- Permissions distinctes : gestion, soumission, approbation et historique.
- Contrôles exécutés dans l'API, pas seulement dans React.
- Séparation créateur/décideur.
- Motif obligatoire pour rejet et annulation.
- `budget_approval_history` conserve acteur, états, action, motif et date.
- Les lignes historiques migrées sont marquées `is_legacy` sans faux décideur.

### 8.2 Limites

- Aucun seuil monétaire ni approbation à plusieurs niveaux.
- Seule l'affectation `SUPER_ADMIN/GLOBAL` a été trouvée localement pour les nouvelles permissions d'approbation ; aucune politique métier Direction/Finance n'est préconfigurée.
- Rallonge sans approbation.
- Réservation sans approbation.
- Historique non visible dans l'interface.

### 8.3 Matrice RBAC cible proposée

| Action | Permission | Scopes admissibles | Séparation recommandée |
|---|---|---|---|
| Voir budgets | `hr.budget.view` | AGENCY, CONCESSION, GLOBAL | — |
| Créer/corriger brouillon | `hr.budget.manage` | AGENCY, CONCESSION, GLOBAL | auteur |
| Soumettre | `hr.budget.submit` | AGENCY, CONCESSION, GLOBAL | auteur ou gestionnaire |
| Approuver/rejeter | `hr.budget.approve` | CONCESSION, GLOBAL ; AGENCY seulement si validé métier | jamais auteur |
| Demander rallonge | nouvelle permission | AGENCY, CONCESSION, GLOBAL | demandeur |
| Approuver rallonge | nouvelle permission | CONCESSION, GLOBAL | jamais demandeur |
| Voir réservation | `treasury.reservation.view` | AGENCY, CONCESSION, GLOBAL | — |
| Créer/soumettre réservation | existante + éventuelle nouvelle permission | AGENCY, CONCESSION, GLOBAL | demandeur |
| Approuver/rejeter réservation | nouvelle permission | CONCESSION, GLOBAL, ou AGENCY décidé métier | jamais demandeur |
| Ajuster/libérer | permissions existantes | même périmètre que le compte | motif explicite |
| Consommer | `hr.expense.disburse` + `treasury.disbursement.create` | intersection des scopes | réservation compatible si fournie/obligatoire |

`OWN` doit rester refusé pour ces ressources financières collectives.

## 9. Audit des réservations de liquidité

### 9.1 Modèle réel

Une réservation référence obligatoirement : un compte Treasury, une dépense budgétaire approuvée, une agence/concession, une devise, un montant initial/actif, un motif et un identifiant idempotent. Elle ne référence pas directement le budget car celui-ci est atteint par la dépense.

Statuts schéma : `ACTIVE`, `RELEASED`, `CONSUMED`, `CANCELLED`.  
Événements : `CREATED`, `ADJUSTED`, `RELEASED`, `CONSUMED`, `CANCELLED`.

Seuls `ACTIVE`, `RELEASED` et `CONSUMED` sont produits par les services actuels.

### 9.2 Parcours utilisateur actuel

| Étape attendue | État |
|---|---|
| Sélection compte | Oui, liste Caisse/Banque active |
| Montant | Oui |
| Motif | Oui |
| Bénéficiaire | ABSENT |
| Échéance | ABSENT |
| Budget/dépense | Dépense obligatoire, mais saisie par ID brut |
| Soumission | ABSENT ; création immédiatement active |
| Approbation/rejet | ABSENT |
| Consultation | Oui |
| Ajustement | API/hook seulement |
| Consommation | Oui depuis le décaissement RH |
| Libération | Oui, motif UI non saisissable |
| Historique | API seulement |
| Annulation/expiration | ABSENT |

### 9.3 Garanties actuelles

- Dépense `approved` obligatoire.
- Compte actif `CASH` ou `BANK`, périmètre et devise compatibles.
- Montant positif, inférieur au reste à payer non déjà réservé et à la trésorerie non affectée.
- Verrous `FOR UPDATE` sur dépense et compte ; sérialisation des créations concurrentes.
- Identifiant de requête rejouable si et seulement si le contenu principal est identique.
- Aucune écriture dans `treasury_movements` lors d'une réservation.
- Ajustement limité au montant initial et aux disponibilités recalculées.
- Aucun effacement physique ; événements et audit.

### 9.4 Limites

- L'idempotence compare compte, dépense et montant, mais pas explicitement motif/référence ; un rejeu avec métadonnées différentes est accepté comme doublon. À durcir ou documenter.
- Aucun lien UI entre les engagements réservables et le formulaire.
- Aucune file d'approbation, donc le droit de création équivaut au droit d'affecter immédiatement les liquidités.
- Pas d'échéance ni mécanisme d'expiration.

## 10. Analyse des soldes

| Concept | Formule actuelle | Commentaire |
|---|---|---|
| Solde Treasury/comptable | somme `IN POSTED` - somme `OUT POSTED` | Source de vérité des liquidités enregistrées |
| Réservé actif | somme `treasury_reservations.active_amount` où `ACTIVE` | N'altère pas le solde Treasury |
| Liquidité non affectée | `max(0, solde éligible - réservé actif)` | Comptes actifs Caisse/Banque seulement |
| Enveloppe budget | initial + rallonges | Autorisation d'engager, pas disponibilité bancaire |
| Engagé | dépenses `approved` | Appelé « consommé/dépensé » dans certaines vues RH |
| Décaissé | décaissements ayant un mouvement `POSTED`, hors mouvements contrepassés | Sortie réelle Treasury |
| Reste à payer | engagé - décaissé | Besoin futur de liquidité |
| Disponible à engager | enveloppe - engagé | Indépendant du solde bancaire |

La séparation conceptuelle est correcte. Les libellés RH « Dépensé » et « Consommé » devraient devenir « Engagé » lorsque le montant inclut des dépenses non décaissées.

## 11. Analyse des consommations

Le décaissement budgétaire est une transaction unique : verrouillage de la dépense et du compte, contrôle du reste à décaisser, création du décaissement, création du mouvement, consommation éventuelle de la réservation et audit. Une consommation peut être partielle et laisse la réservation `ACTIVE`; une consommation totale la passe à `CONSUMED`.

### Anomalie P0 — protection croisée

Dans `postMovement`, la protection `solde - réservations actives` s'applique aux sorties sauf si `sourceType === 'BUDGET_EXPENSE_DISBURSEMENT'`. Or `reservationId` est facultatif. Conséquence :

1. une réservation A protège 800 sur un solde de 1 000 ;
2. un décaissement budgétaire B sans réservation peut sortir 500 car le contrôle dédié vérifie le solde brut de 1 000 ;
3. le solde tombe à 500 alors que 800 restent réservés à A.

La réservation A devient alors matériellement non couverte. La correction cible devra calculer la disponibilité en excluant toutes les réservations sauf celle explicitement consommée, puis exiger la compatibilité de cette réservation dans la même transaction. Un test concurrent et un test sans `reservationId` sont obligatoires.

Après contrepassation d'un décaissement, la réservation consommée n'est pas restaurée automatiquement. Ce choix évite une résurrection implicite, mais l'UI doit avertir et proposer une nouvelle réservation contrôlée si le besoin subsiste.

## 12. Analyse des flux automatiques

Les paiements clients, remboursements et règlements constructeur utilisent un mapping `(agence, moyen de paiement) -> compte Treasury`. L'intégration ne devient active qu'après activation explicite par concession. Les écritures utilisent l'unicité des événements source pour prévenir les doubles comptabilisations.

**Qualification : EXISTANT ET OPÉRATIONNEL dans le code et les tests existants ; À CONFIRMER PAR RECETTE sur chaque mapping métier.**

Points de contrôle recommandés : complétude des mappings avant activation, compte actif et compatible, traitement visible des événements sans mapping, et audit périodique des mappings inactifs.

## 13. Analyse des opérations financières

- **Comptes :** création sans solde depuis l'UI actuelle, activation/désactivation, historique préservé.
- **Encaissements/décaissements manuels :** formulaire complet, idempotence, catégorie compatible, protection des réservations sur les sorties.
- **Transferts :** deux mouvements atomiques, même devise, fonds réservés protégés par `postMovement`.
- **Journal :** registre normalisé, pagination, filtres et CSV.
- **Contrepassations :** écritures inverses, unicité, historique préservé.
- **Rapprochement :** import et validation séparés, proposition ±7 jours, aucune correspondance ambiguë automatique, annulation auditable.
- **Documents :** justificatifs disponibles pour opérations manuelles ; lien GED identifié pour décaissements.

Écart UX : les actions principales sont dispersées entre l'en-tête, les onglets et RH. Une vue « Opérations » et une file « Contrôles à traiter » réduiraient les erreurs de navigation.

## 14. Analyse RBAC

Les contrôles serveur utilisent `requirePermission` puis recalculent le scope dans les services. Les scopes AGENCY, CONCESSION et GLOBAL sont traduits en prédicats SQL. `OWN` est explicitement refusé pour la trésorerie collective et les budgets.

État local observé :

- `SUPER_ADMIN` possède les permissions budgétaires, de couverture et réservation en `GLOBAL`.
- `CHARG_TEST` possède `hr.budget.view/manage`, `hr.expense.view/create` et `treasury.view` en `AGENCY`, mais aucune permission d'approbation ni de réservation.
- Ainsi, un utilisateur Treasury ordinaire peut voir les comptes sans voir l'onglet Couverture ni le bouton Réserver. L'« absence apparente » est aussi un effet d'affectation RBAC.

La séparation de responsabilités est correcte pour budget/dépense, absente pour rallonge/réservation. Aucun bypass fondé sur le nom `SUPER_ADMIN` n'a été trouvé dans les routes analysées ; ce rôle reçoit les permissions par migrations, puis les contrôles restent permissionnels.

## 15. Analyse des risques financiers

| Priorité | Risque | Impact | Mesure |
|---|---|---|---|
| P0 | Décaissement budgétaire non réservé consommant les fonds réservés à autrui | Réservation non couverte, promesse de paiement fausse | Corriger le calcul atomique de disponibilité et tester concurrence/croisement |
| P0 | Rallonge immédiate sans approbation | Contournement de l'enveloppe approuvée | Workflow de demande et approbation de rallonge |
| P0/P1 | Clôture avec engagements ou réservations actifs | Budget « clôturé » encore payable | Définir puis imposer les préconditions de clôture |
| P1 | Création = activation d'une réservation | Affectation de liquidité sans quatre yeux | Workflow configurable de validation |
| P1 | Réservation sans échéance | Fonds immobilisés indéfiniment | Date d'échéance, alertes et politique d'expiration |
| P1 | Resoumission d'un budget rejeté non modifiable | Boucle de rejet sans correction | Modification contrôlée du brouillon/rejeté |
| P1 | Motif de libération codé en dur dans l'UI | Traçabilité métier faible | Modale avec motif obligatoire |
| P2 | Terminologie « consommé » pour l'engagé | Mauvaise lecture financière | Harmoniser les libellés |
| P2 | ID de dépense saisi manuellement | Erreur de rattachement et faible utilisabilité | Sélecteur filtré des engagements réservables |

## 16. Architecture cible proposée

### Principe

Conserver une seule source de vérité et faire évoluer l'existant par couches :

```text
Budget partagé
  -> enveloppe approuvée
  -> dépense/engagement approuvé
  -> réservation de liquidité approuvée
  -> décaissement Treasury
  -> mouvement financier immuable
```

- **Domaine Budget & Engagements :** tables actuelles, règles de cycle, décisions et rallonges.
- **Domaine Treasury :** comptes, capacité de paiement, réservations, décaissements et mouvements.
- **Orchestration :** service transactionnel de décaissement qui verrouille dépense, compte et réservations dans un ordre déterministe.
- **Présentation :** composants budget réutilisables dans Treasury et RH ; pas de duplication d'API ou de tables.
- **Audit :** historiques spécialisés plus journal transverse.

Workflow cible minimal :

1. budget brouillon, soumis, approuvé/actif ;
2. engagement brouillon, soumis, approuvé ;
3. réservation demandée, soumise, approuvée/active ;
4. décaissement total ou partiel consommant éventuellement la réservation ;
5. reliquat conservé, ajusté ou libéré ;
6. clôture lorsque les règles de solde sont satisfaites.

## 17. Organisation UX recommandée

Dans « Comptabilité & Trésorerie » :

1. **Vue d'ensemble** : solde, liquidité non affectée, engagements, alertes.
2. **Comptes** : comptes et transferts.
3. **Budgets & engagements** : liste partagée, création/décision selon droits, historique et dépenses.
4. **Réservations** : demandes, à approuver, actives, consommées/libérées, échéances.
5. **Opérations** : entrées, sorties, décaissements, contrepassations.
6. **Journal & rapprochement** : journal, export et contrôle bancaire.
7. **Configuration** : catégories et flux automatiques.

Dans RH, conserver une vue contextualisée des budgets nécessaires à l'administration, avec lien vers la fiche financière commune. Réutiliser les composants actuels avant de créer de nouvelles pages.

Améliorations immédiates : renvoi Treasury -> Budgets, badges d'actions à traiter, sélecteur de dépense réservables, modales de motif, historique en tiroir, libellés « engagé / décaissé / réservé ».

## 18. Matrice de recette TRES-01 à TRES-20

> Aucun de ces scénarios n'a été exécuté comme transaction métier pendant l'audit. « Observé » signifie code, schéma, tests statiques et lectures SQL.

| ID | État actuel | Résultat attendu | Observé | Manque | Recommandation |
|---|---|---|---|---|---|
| TRES-01 Création budget | EXISTANT | Brouillon tracé | Route, formulaire et historique | Recette réelle | Tester scopes et catégories |
| TRES-02 Soumission | EXISTANT | `draft/rejected -> submitted` | API + bouton | Aucun écran de file | Ajouter file « à approuver » |
| TRES-03 Approbation | EXISTANT | Décideur distinct, budget actif | Contrôle serveur présent | Recette multi-utilisateur | Tester tous scopes |
| TRES-04 Rejet | EXISTANT | Motif et traçabilité | API + modale | Correction du contenu impossible | Autoriser édition contrôlée |
| TRES-05 Modification approuvé | ABSENT par conception | Pas de réécriture ; avenant | Rallonge additive seulement | Rallonge non approuvée | Workflow d'avenant |
| TRES-06 Création réservation | PARTIEL | Demande complète et traçable | Création immédiatement active | ID brut, bénéficiaire/échéance absents | Sélecteur + champs + workflow |
| TRES-07 Approbation réservation | ABSENT | Quatre yeux selon politique | Aucun statut/route | Modèle et permissions | Décision métier puis implémentation |
| TRES-08 Supérieure au disponible | EXISTANT | 409 sans effet | Contrôles compte et dépense | Recette réelle | Test MySQL ciblé |
| TRES-09 Deux concurrentes | EXISTANT | Une seule dépassement autorisée | Verrous + test MySQL conditionnel existant | Non exécuté ici | Exécuter en base isolée |
| TRES-10 Décaissement partiel | EXISTANT | Mouvement + reliquat actif | Service transactionnel | Cas croisé P0 | Ajouter tests |
| TRES-11 Consommation totale | EXISTANT | `active_amount=0`, `CONSUMED` | Implémenté | Recette réelle | Tester idempotence |
| TRES-12 Libération reliquat | PARTIEL | Motif utilisateur, fonds libérés | API/UI, motif codé en dur | Motif et confirmation | Modale dédiée |
| TRES-13 Annulation | ABSENT | Annulation avant consommation selon règle | Enum seulement | Service/API/UI | Définir différence avec libération |
| TRES-14 Expiration | ABSENT | Politique contrôlée et auditée | Aucun champ/statut | Modèle + traitement | Alertes puis expiration explicite/automatique décidée |
| TRES-15 Soldes | PARTIEL | Solde brut et disponible cohérents | Formules correctes | Bypass P0 des décaissements | Corriger puis test invariant |
| TRES-16 Budget consommé | PARTIEL | Engagé distinct de décaissé | Données distinctes dans Treasury | Libellé RH ambigu | Renommer et documenter |
| TRES-17 Permissions insuffisantes | EXISTANT | 403 serveur | Middleware + scopes | Recette profils métier | Matrice de profils dédiée |
| TRES-18 Scopes territoriaux | EXISTANT | Isolation AGENCY/CONCESSION/GLOBAL | Prédicats SQL | Recette multi-territoire | Tests API authentifiés |
| TRES-19 Traçabilité validations | PARTIEL | Historique consultable | Tables/API/audit | UI historique absente | Vue chronologique |
| TRES-20 Double comptabilisation | PARTIEL | Une réservation ≠ sortie, un événement = un mouvement | Unicités et transactions | Cas P0 non couvert | Tests croisés et concurrents |

## 19. Plan d'évolution priorisé

### Lot P0-A — Invariant de liquidité réservée

- **Objectif :** aucune sortie ne peut réduire le solde sous les réservations qui ne lui appartiennent pas.
- **Composants :** `treasury.service.ts`, `treasury-coverage.service.ts`.
- **API :** contrat de décaissement existant ; préciser le rôle de `reservationId`.
- **Tables :** aucune migration a priori.
- **Permissions :** inchangées.
- **Tests :** sortie budgétaire sans réservation, réservation d'autrui, consommation partielle/totale, concurrence, rollback.
- **Dépendance :** décision sur réservation obligatoire ou facultative.
- **Risque de régression :** refus de décaissements précédemment acceptés à tort.

### Lot P0-B — Gouvernance des rallonges et clôture

- **Objectif :** empêcher l'augmentation non approuvée et la clôture incohérente.
- **Fonctions :** demande/révision/approbation de rallonge ; préconditions de clôture.
- **Composants :** budget UI, routes HR, historique.
- **Tables :** table de demandes de rallonge ou extension de l'historique ; migration additive probable.
- **Permissions :** demander/approuver une rallonge.
- **Tests :** quatre yeux, seuils, engagements/réservations actifs, concurrence.
- **Risque :** compatibilité des rallonges historiques, à conserver comme legacy.

### Lot P1-A — Workflow de réservation

- **Objectif :** demande et activation séparées.
- **Fonctions :** brouillon/soumission/approbation/rejet/annulation, bénéficiaire, échéance.
- **Composants :** nouvel écran Réservations réutilisant la couverture actuelle.
- **API :** transitions explicites et historique.
- **Tables :** extension additive des réservations et événements.
- **Permissions :** submit/approve/cancel/expire.
- **Tests :** auto-approbation, scopes, transitions, capacité recalculée à l'approbation.
- **Risque :** migration des `ACTIVE` existantes comme legacy approuvées sans faux décideur.

### Lot P1-B — Parcours budget complet et partagé

- **Objectif :** rendre le budget trouvable et corrigeable sans duplication.
- **Fonctions :** onglet partagé, édition brouillon/rejeté, annulation/réouverture, historique.
- **Composants :** extraction des formulaires RH en composants communs.
- **API :** PATCH limité aux états modifiables.
- **Tables :** aucune migration nécessaire pour le socle ; audit avant/après requis.
- **Tests :** immutabilité après approbation, correction après rejet, navigation et RBAC.

### Lot P1-C — Cycle de vie des reliquats

- **Objectif :** traiter les réservations inactives ou arrivées à échéance.
- **Fonctions :** alertes, ajustement UI, libération avec motif, annulation et expiration.
- **Migration :** `expires_at`, éventuel `EXPIRED`, décideurs/dates.
- **Tests :** partiellement consommée, expiration concurrente avec décaissement, aucune libération double.

### Lot P2 — Ergonomie et pilotage

- Libellés financiers non ambigus.
- Sélecteurs métier et files d'attente.
- Historique chronologique et indicateurs de vieillissement.
- Rapport consolidé budget/engagé/réservé/décaissé/disponible.
- Documentation des mappings et contrôles périodiques.

## 20. Migrations éventuellement nécessaires

**Aucune migration n'est requise pour corriger le P0 de disponibilité**, si le contrat reste identique.

Migrations additives possibles après décision métier :

1. réservation : statuts de demande/décision, `beneficiary`, `due_at`, `expires_at`, acteurs et dates de transition ;
2. événements : nouvelles valeurs `SUBMITTED`, `APPROVED`, `REJECTED`, `EXPIRED` ;
3. rallonges : demandes séparées avec montant, motif, demandeur, décideur et statut ;
4. éventuellement version/révision du budget pour modifications pré-approbation auditées.

Toute migration doit préserver les lignes existantes, les marquer legacy lorsque nécessaire, ne pas fabriquer de décideur et ne jamais réécrire les mouvements financiers.

## 21. Points nécessitant une décision métier

1. Une réservation doit-elle toujours être approuvée, ou seulement au-dessus d'un seuil ?
2. Quels rôles et scopes approuvent budget, rallonge, engagement et réservation ?
3. Quels seuils imposent un ou plusieurs validateurs ?
4. Une réservation est-elle obligatoire pour tout décaissement budgétaire, ou facultative sous contrôle du disponible non affecté ?
5. Le bénéficiaire et l'échéance sont-ils obligatoires ?
6. Expiration : automatique avec libération immédiate, automatique avec délai de grâce, ou validation manuelle ?
7. Une réservation partiellement consommée expire-t-elle sur son seul reliquat ?
8. Quelle différence métier entre annulation et libération ?
9. Peut-on clôturer un budget avec engagements non décaissés ou réservations actives ?
10. Une rallonge suit-elle exactement le workflow du budget ou un circuit allégé ?
11. Les budgets relèvent-ils organisationnellement de Finance, tout en restant consommables depuis RH et les modules métiers ?
12. Le terme officiel doit-il être « engagé » plutôt que « consommé » avant décaissement ?

## 22. Verdict final

### EXISTANT ET OPÉRATIONNEL

Le registre Treasury, les comptes, mouvements, transferts, contrepassations, journal, flux automatiques, workflow de base des budgets/dépenses, calculs de couverture et primitives de réservation constituent un socle réel, transactionnel et largement audité.

### EXISTANT MAIS INCOMPLET

La gestion budgétaire est difficile à trouver car placée dans RH. Plusieurs routes budget/réservation n'ont pas d'interface. Les réservations n'ont ni approbation, ni échéance, ni annulation/expiration. La gouvernance des rallonges est insuffisante.

### ABSENT

Workflow d'approbation des réservations, expiration, bénéficiaire/échéance, approbation des rallonges et file de validation commune.

### À CONFIRMER PAR RECETTE

Tous les parcours réels multi-utilisateurs, multi-scopes et concurrents. La base locale ne contient pas assez de données pour les qualifier : 1 budget brouillon, aucune dépense/réservation/décaissement, un compte et un mouvement.

### Décision de livraison

**NON QUALIFIÉ EN L'ÉTAT pour une promesse complète de gestion budgétaire et de réservation approuvée.**  
**Fondation réutilisable sans refonte.** Corriger d'abord la protection P0 des réservations et la gouvernance des rallonges/clôtures, puis compléter le workflow et l'UX en lots ciblés.

## Annexe — preuves et contrôles exécutés

- Lecture du frontend, des routes/services backend, migrations 054, 055, 057, 059, 072, 073 et 076, tests FIN-02/FIN-03 et intégration budget/Treasury.
- Docker inspecté en lecture seule : backend, frontend et MySQL `healthy`; aucun redémarrage/rebuild.
- MySQL inspecté uniquement avec `SELECT` et `SHOW CREATE TABLE`; migration maximale 82.
- Tests backend ciblés : 3 fichiers, **3 réussis, 0 échec**.
- Tests frontend ciblés : **14 réussis, 0 échec**.
- Les tests MySQL d'intégration conditionnels et la recette navigateur n'ont pas été exécutés.
- Aucun fichier applicatif, donnée, permission, migration, conteneur ou volume modifié.
- Seul le présent rapport a été créé.
