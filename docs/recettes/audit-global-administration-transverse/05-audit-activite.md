# 05 — Audit Activité utilisateur

## Preuves UI

La page affiche 46 événements sur deux pages avec scope `GLOBAL`. Les filtres utilisateur, module, action, catégorie, mode de contexte, agence, concession et dates sont disponibles. Une ligne a été ouverte : le modal, l'acteur, la date, le contexte et l'impression unitaire fonctionnent.

## Preuves MySQL

- 46 lignes `audit_logs`.
- 0 acteur manquant.
- 22 lignes sans `agency_id` et sans `concession_id`, visibles comme historique non classifié ou « contexte territorial non enregistré ».

## Réserve

Une activité GED générique intitulée « Opération enregistrée » ouvre un modal sans section ni champ de détail, seulement l'en-tête, l'acteur, la date et le contexte. Le comportement est stable mais la valeur probante métier du détail est faible.

Verdict : **prêt avec réserves non bloquantes**.

