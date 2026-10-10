# Lot 11C — primes employés

Une prime est une décision RH, jamais un paiement. Le lot ne crée ni mouvement de trésorerie, ni dépense budgétaire, ni facture, ni paiement, ni ligne de salaire ou de paie.

## Modèle et workflow

`employee_bonus_types` porte le catalogue configurable par concession. Un code utilisé devient immuable ; la désactivation reste logique. `employee_bonuses` référence le dossier employé, conserve les snapshots du code/libellé, un montant `DECIMAL(18,2)`, la devise de la concession, une date de référence, une période facultative appariée et un motif obligatoire.

Le workflow est `DRAFT → PENDING → APPROVED | REJECTED`, avec `CANCELLED` depuis `DRAFT`, `PENDING` ou `APPROVED`. L’annulation exige un motif et conserve l’approbation antérieure. Aucun état `PAID` n’existe.

## Sécurité et concurrence

- `hr.bonus.view` accepte les scopes usuels, dont OWN pour le dossier lié.
- `hr.bonus.manage`, `hr.bonus.approve` et `hr.bonus.type.manage` n’autorisent jamais OWN.
- L’auto-approbation de la prime d’un employé lié au décideur est interdite. Un gestionnaire autorisé peut saisir une prime sur son propre dossier, mais un autre décideur doit l’approuver.
- Les mutations verrouillent le dossier employé, puis la prime et son type dans un ordre stable. La state machine rend les décisions concurrentes exclusives.
- Un employé sans compte ERP reste pleinement pris en charge ; seule la notification est alors omise.

## GED et confidentialité

La GED utilise l’entité `employee_bonus` et exige `hr.bonus.view` en plus des droits GED. Les listes administratives n’exposent ni noms de fichiers ni contenu des justificatifs.
