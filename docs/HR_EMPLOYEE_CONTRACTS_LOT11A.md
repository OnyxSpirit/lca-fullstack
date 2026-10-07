# Lot 11A — Contrats employés

Les contrats sont rattachés à `employee_profiles.id`, jamais au compte ERP facultatif. Aucun contrat historique n'est déduit d'un statut employé ou d'une date d'embauche.

## Modèle et cycle de vie

`employee_contract_types` porte le catalogue configurable par concession. Un type utilisé ne peut plus changer de code et peut être désactivé ; ses snapshots code/libellé restent sur chaque contrat. Aucun type juridique n'est imposé par défaut.

`employee_contracts` conserve les dates contractuelles, une éventuelle fin effective anticipée, la référence unique par concession et le lien facultatif vers le contrat précédent. Les états persistés sont `DRAFT`, `ACTIVE`, `ENDED`, `CANCELLED`. `SCHEDULED` et `EXPIRED` sont dérivés des dates serveur pour éviter un scheduler. Un contrat applicable peut être sans date de fin.

Seul un brouillon est éditable ou annulable. L'activation vérifie l'employé actif, le type actif et l'absence de chevauchement. La fin conserve la date contractuelle originale. Le renouvellement crée toujours une nouvelle ligne ; il n'écrase jamais l'ancienne.

## Salaire, GED, sécurité et concurrence

La rémunération demeure exclusivement dans `salary_history`; aucun montant n'est copié dans le contrat. Les documents utilisent la cible GED `employee_contract`, distincte de `employee`.

Les permissions sont `hr.contract.view`, `hr.contract.manage` et `hr.contract.type.manage`. Les scopes de contrat sont dérivés de l'employé : OWN par `employee_profiles.user_id`, AGENCY, CONCESSION ou GLOBAL. Le catalogue refuse OWN et AGENCY. Aucun rôle n'est codé en dur.

Les écritures verrouillent la ressource et la ligne employé dans une transaction InnoDB avant validation des périodes. L'unicité de renouvellement et de référence complète la sérialisation. Les événements realtime sont émis après commit et les actions sont inscrites dans `audit_logs` avec un acteur `users.id`.

Migration : `065_employee_contract_history.sql`, additive, sans backfill métier. La baseline fraîche est `baseline_001_065`.
