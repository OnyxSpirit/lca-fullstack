# Lot 10 — dossier employé et compte ERP

Le dossier `employee_profiles` est l'entité RH canonique. Un utilisateur `users` est une identité applicative facultative : créer un employé ne crée pas de compte, et créer, modifier ou désactiver un compte ne crée, ne clôture et ne supprime pas de dossier RH.

## Modèle et identité

- `employee_profiles.user_id` est nullable et unique lorsqu'il est renseigné.
- L'identité RH (`first_name`, `last_name`, `email`, `phone`), le matricule, la fonction, le statut et l'affectation appartiennent au dossier employé.
- `concession_id` est obligatoire. `agency_id` est facultatif afin d'autoriser un rattachement central à la concession.
- Le compte lié conserve sa propre agence applicative et son e-mail de connexion. Ils ne synchronisent pas automatiquement l'affectation ni l'e-mail RH.
- La suppression physique d'un utilisateur, si elle était un jour introduite, mettrait seulement `user_id` à `NULL`. Le produit actuel désactive les utilisateurs au lieu de les supprimer.

## Liaison et déliaison

La liaison est explicite via la permission `hr.employee.account.manage`. Le compte doit être actif, non lié, appartenir à la même concession et rester dans le scope de l'acteur. La contrainte unique et les verrous transactionnels garantissent qu'un compte ne peut appartenir qu'à un dossier. Délier un compte ne le désactive pas et ne modifie ni l'employé, ni ses salaires, ni ses documents.

Les scopes utilisent l'affectation RH : `AGENCY` lit `employee_profiles.agency_id`, `CONCESSION` lit `employee_profiles.concession_id`, `GLOBAL` ne restreint pas. `OWN` correspond uniquement au dossier dont `user_id` est l'utilisateur courant ; un employé non lié n'est donc jamais capturé artificiellement par `OWN`.

## Salaire, GED et acteurs

`salary_history.employee_profile_id` reste la relation salariale canonique et immuable. La GED utilise l'entité `employee`, donc fonctionne sans compte ERP. Les colonnes d'acteur (`created_by`, `updated_by`, `performed_by`) continuent à référencer l'utilisateur ayant réalisé l'action : elles ne deviennent pas des identifiants employés.

## Migration 064

La migration conserve tous les identifiants et liens existants, copie de façon déterministe l'identité et l'affectation depuis le compte historiquement lié, puis rend `user_id` nullable et remplace sa FK par `ON DELETE SET NULL`. La baseline fraîche représente directement l'état 064 et ne crée aucun employé fictif.

## Limites

Ce lot n'implémente ni contrats, ni congés, ni primes, ni paie complète, ni activité ERP consolidée. Ces sujets restent réservés aux lots 11 et 12.
