# RH & Administration — architecture V1

## Chaîne technique

Le module suit la chaîne React → TanStack Query → routes Express → services et
requêtes SQL paramétrées → MySQL. Il utilise les composants, notifications et
styles déjà présents dans l’ERP. L’entrée `/hr` et chacun de ses onglets dépendent
des permissions renvoyées par le backend.

## Données

La baseline fraîche consolidée 040 contient 92 tables, dont les six tables RH :

- `employee_profiles` lie au plus un profil RH à un utilisateur. L’identité et
  l’agence restent dans `users`. Un départ passe le profil à `departed` ; aucune
  donnée RH n’est supprimée ;
- `salary_history` conserve chaque montant exact (`DECIMAL(18,2)`), sa date
  d’effet et son auteur. Le salaire courant est la dernière ligne effective ;
- `internal_stock_items` porte le solde courant, le minimum et l’agence ;
- `internal_stock_movements` conserve chaque entrée/sortie, auteur, motif et les
  soldes avant/après ;
- `budgets` représente un budget d’agence ou de concession avec une contrainte
  garantissant une seule portée ;
- `budget_expenses` conserve les dépenses exactes rattachées au budget.

Les opérations importantes écrivent aussi dans `audit_logs` avec l’acteur, la
ressource et le contexte utile.

## Concurrence et invariants

Une entrée ou sortie verrouille l’article avec `SELECT … FOR UPDATE`, recalcule le
solde dans la transaction et refuse toute sortie supérieure au disponible. Une
dépense verrouille de la même façon le budget, relit la somme persistée et refuse
un montant supérieur au disponible. Les contraintes SQL interdisent également les
montants et quantités négatifs.

## RBAC et scopes

La V1 ajoute 15 permissions, portant le catalogue de 142 à 157 :

- `hr.view` ;
- `hr.employees.view`, `hr.employees.manage` ;
- `hr.salary.view`, `hr.salary.manage` ;
- `hr.stock.view`, `hr.stock.manage`, `hr.stock.entry`, `hr.stock.exit` ;
- `hr.budget.view`, `hr.budget.manage` ;
- `hr.expense.view`, `hr.expense.create`, `hr.expense.manage` ;
- `hr.reporting.view`.

Aucun rôle RH prédéfini n’est créé. Le seed fresh install conserve uniquement le
vrai `SUPER_ADMIN` système et lui affecte génériquement les 157 permissions actives
en `GLOBAL`. Un rôle dynamique, quel que soit son nom, ne reçoit aucun bypass.

Les scopes `AGENCY`, `CONCESSION` et `GLOBAL` filtrent les agences persistées des
employés et articles. `OWN` ne vaut que pour la fiche employé de l’utilisateur ; il
est refusé pour les stocks et budgets collectifs. Un budget d’agence n’est visible
en `AGENCY` que dans cette agence. Un budget de concession exige au moins le scope
`CONCESSION`. Chaque opération sur une ressource existante recharge son agence ou
sa concession depuis MySQL avant autorisation.

## Fonctionnalités

- **Personnel** : activation depuis le formulaire Utilisateurs avec le choix
  explicite Employé Oui/Non, matricule, fonction, embauche, statut, recherche,
  filtres et pagination.
- **Salaires** : historique effectif et masse salariale. Sans
  `hr.salary.view`, ni les lignes ni le salaire courant ne sont envoyés.
- **Stocks internes** : catalogue libre, seuil minimum et historique des entrées
  et sorties.
- **Budgets & dépenses** : budgets agence/concession, consommation et solde,
  dépenses bornées par la période et le disponible.
- **Vue d’ensemble et Reporting** : agrégats issus de MySQL. Chaque famille est
  calculée seulement si la permission source est présente.

## Baseline et installations existantes

Le projet restant en développement local, les six tables et quinze permissions ont
été consolidées dans le baseline 033 au lieu de créer une série artificielle de
migrations 034+. Une base vide reçoit directement l’état complet puis le seed.
Une base déjà marquée 033 n’est jamais transformée en fresh install et reste
inchangée. Avant une première production réelle, ce delta devra devenir une unique
migration additive 034+ testée sur copie sauvegardée.

## GED et limites V1

Les justificatifs de dépense restent hors périmètre V1. La GED existante impose une
extension complète de sa matrice ressource, de ses permissions et de ses contrôles
de téléchargement ; aucun second stockage, champ URL public ou contournement n’a
été créé. La V1 ne couvre pas la paie, les bulletins, fiscalité, primes, retenues,
avances, prêts, congés ou pointage. Les montants et dates des dépenses sont immuables dans cette V1 ; seules leurs métadonnées administratives peuvent être corrigées. Une
correction financière future devra utiliser un mécanisme d’annulation audité.

## Validation

Les tests ciblés couvrent le schéma, le catalogue RBAC, la séparation
utilisateur/employé, l’historique salarial, les permissions sensibles, les scopes,
les verrous stock/budget, l’absence de solde négatif et l’intégration frontend. La
validation MySQL doit être exécutée sur une base MySQL 8.4 explicitement jetable et
inclure deux bootstrap, `seed-admin`, un rôle dynamique et un faux super admin.
