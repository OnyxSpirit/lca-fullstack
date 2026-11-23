# Audit documentaire — Comptabilité & Trésorerie

## 1. Méthode et périmètre

Audit statique effectué le 20 novembre 2026 sur les routes React, composants Treasury/Accounting, hooks API, routes et services Express, migrations 054 à 125 pertinentes, schéma de base et rapports de qualification existants. Aucun fichier de production, test, migration, permission ou donnée n'a été modifié.

La navigation n'a pas été rejouée dans un navigateur pilotable pendant cette mission. Les chemins ont été recoupés dans `App.tsx`, `Sidebar.tsx`, `TreasuryWorkspace.tsx` et les composants rendus. Cette limite interdit de revendiquer une recette visuelle nouvelle ; des preuves navigateur historiques existent dans les dossiers de recette, mais ne remplacent pas une nouvelle exécution.

## 2. Fonctionnalités réellement disponibles

- centre de pilotage multi-périodes et multi-devises sans conversion ;
- comptes Caisse/Banque/Autre, catégories et soldes dérivés ;
- entrées/sorties manuelles, documents associés et idempotence ;
- transferts internes et contrepassations ;
- journal filtré, pagination serveur et export complet CSV ;
- flux automatiques des paiements, remboursements et garanties constructeur ;
- couverture, budgets, engagements et cycle complet des réservations ;
- rapprochement bancaire CSV/XLSX/PDF, validation, propositions, rapprochement simple/groupé, écarts, historique, export et annulation ;
- écritures manuelles équilibrées, validation, comptabilisation, contrepassation, PDF et exports ;
- grand livre, balances générale/auxiliaire, analyse des journaux et exports ;
- plan comptable, subdivisions, import/export ;
- exercices/périodes, journaux et liaisons classe 5 ;
- schémas et supervision des intégrations automatiques ;
- contrôles, préparation/clôture/réouverture de périodes.

## 3. Fonctionnalités partielles ou préparatoires

| Fonction | État constaté | Conséquence utilisateur |
|---|---|---|
| États financiers | modèles préparatoires consultables | ne pas présenter comme états officiels SYSCOHADA |
| Échanges Sage | profils consultables, adaptateur désactivé sans cible validée | aucun export/import Sage opérationnel à promettre |
| Report à nouveau | calcul préparatoire uniquement | aucune écriture automatique générée |
| Clôture annuelle | analyse des prérequis | comptabilisation finale bloquée sans paramètres validés |
| Modification d'un brouillon | permission et backend présents | parcours d'édition complet peu exposé dans l'UI actuelle |
| Administration des modèles d'états/échanges | permissions backend présentes | pas de formulaire complet dans l'onglet actuel |

## 4. Fonctions implémentées mais non directement accessibles ici

- créances clients : produites et réglées dans Facturation ; seulement synthétisées dans le pilotage ;
- dettes fournisseurs : gérées depuis les factures fournisseurs/Magasin ; synthétisées ici ;
- encaissement de vente/SAV : initié depuis la facture, pas depuis le Journal financier ;
- transit SAV : initié et décidé dans le workflow SAV avec permissions `service.transit.*` ;
- décaissement d'une dépense : dépend du workflow Budgets/RH et de `hr.expense.disburse`.

Cette séparation est fonctionnelle, pas une anomalie : Treasury centralise les effets financiers sans remplacer les écrans métier sources.

## 5. Incohérences et observations

### Observations confirmées

1. Les migrations anciennes attribuent parfois un scope historique `GLOBAL` au super-administrateur, alors que la politique actuelle et l'interface RBAC ne doivent exposer que `OWN` et `AGENCY`. La documentation utilisateur suit la politique actuelle, pas ces valeurs historiques de bootstrap.
2. Le rapprochement bancaire refuse effectivement `OWN` pour les opérations collectives et exige une portée agence.
3. La page d'états annonce explicitement son caractère préparatoire ; aucune conformité SYSCOHADA complète ne peut être déduite du seul plan comptable.
4. Les exports serveur du journal et du reporting utilisent les filtres et ne sont pas limités à la page visible. Les tableaux client paginés, eux, paginent un jeu déjà chargé.
5. Les soldes bancaires externes sont affichés séparément des soldes ERP, ce qui évite de présenter un relevé comme une écriture ERP.

### Points d'ergonomie, non qualifiés comme anomalies métier

- la richesse des dix onglets Comptabilité rend une formation par profil indispensable ;
- certaines actions de budgets utilisent des permissions RH dans un espace Treasury, ce qui est cohérent techniquement mais doit être expliqué aux administrateurs ;
- la création manuelle reste visible depuis plusieurs sous-pages grâce à l'en-tête partagé ; cela peut surprendre mais ne change pas le contrôle par permission ;
- plusieurs référentiels utilisent une pagination client alors que les listes opérationnelles utilisent une pagination serveur ; l'utilisateur voit néanmoins les mêmes choix 10/20/50/100 lorsque le composant commun est présent.

## 6. Limites de qualification

- aucune connexion à une base de recette et aucune création de donnée fictive ;
- aucune vérification visuelle nouvelle sur ordinateur/mobile ;
- aucune validation réglementaire externe SYSCOHADA, fiscale ou bancaire ;
- les libellés et comportements sont ceux du code présent, mais les données réellement configurées (comptes, schémas, journaux, profils) dépendent de l'installation ;
- aucune analyse des rôles effectivement attribués aux utilisateurs réels, afin de ne pas consulter inutilement de données personnelles.

## 7. Points nécessitant une décision métier

1. Valider officiellement la nomenclature et les sources réglementaires avant de promouvoir les états préparatoires en états officiels.
2. Décider du produit, de la version et du format Sage cible avant activation d'un adaptateur.
3. Valider journal d'ouverture, contreparties et affectation du résultat avant toute comptabilisation du report à nouveau.
4. Confirmer si un parcours UI complet de modification des brouillons comptables doit être exposé.
5. Confirmer la gouvernance des permissions RH visibles dans Budgets & engagements pour les profils financiers.
6. Prévoir une recette de formation avec comptes et schémas fictifs représentatifs de chaque agence.

## 8. Anomalies confirmées

Aucune anomalie fonctionnelle bloquante nouvelle n'est confirmée par ce seul audit documentaire. Les écarts ci-dessus sont soit des limitations explicitement assumées dans l'interface, soit des décisions de gouvernance restant à prendre. Aucun correctif n'a été entrepris, conformément au périmètre documentaire.

## 9. Sources principales recoupées

- navigation : `frontend/src/App.tsx`, `frontend/src/components/layout/Sidebar.tsx`, `frontend/src/modules/treasury/TreasuryWorkspace.tsx` ;
- trésorerie/pilotage : `TreasuryPage.tsx`, `FinancialDashboardPage.tsx`, `BankReconciliationPanel.tsx`, `BudgetTreasuryPanel.tsx` ;
- comptabilité : `AccountingPage.tsx`, `AccountingEntriesPanel.tsx`, `AccountingAnalysisPanel.tsx`, `AccountingAdvancedPanels.tsx`, `AccountingAutomationPanels.tsx` ;
- backend : modules `treasury`, `accounting`, `billing` et transit SAV ;
- base : migrations 054–059, 073, 075–076, 083, 085, 112 et 119–126 ;
- qualification : dossiers `docs/audits/comptabilite-tresorerie` et `docs/recettes/cloture-facturation-comptabilite-tresorerie`.
