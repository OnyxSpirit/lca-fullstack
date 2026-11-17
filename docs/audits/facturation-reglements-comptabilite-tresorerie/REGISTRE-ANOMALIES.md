# Registre des anomalies

## FIN-001 — BLOQUANTE — configuration recette confirmée

- Module : Treasury / encaissements.
- Reproduction : interroger comptes, mappings et configurations sur `lca_recette`.
- Attendu : au moins une destination active par moyen/agence.
- Observé : un compte `REC-BANK`, mais zéro catégorie, mapping et configuration ; encaissement réel impossible.
- Impact : chaîne Facture → Paiement → Treasury non testable et non opérationnelle.
- Correction future : configurer comptes, catégories, mappings et activer le flux après recette contrôlée.

## FIN-002 — MAJEURE — intégration historique incomplète confirmée

- Preuve : deux paiements, tous sans compte Treasury, zéro mouvement.
- Impact : historique absent des soldes et de l’automatisation comptable.
- Correction future : stratégie de reprise explicite, idempotente et auditée ; jamais insertion ad hoc.

## FIN-003 — MAJEURE — régularisations comptables confirmées

- Deux événements (`INVOICE_ISSUED`, `CREDIT_NOTE_ISSUED`) sont `REGULARIZE` faute de schéma actif.
- Impact : documents historiques non comptabilisés automatiquement.
- Correction future : compléter/activer les schémas puis utiliser le workflow de retry/régularisation.

## FIN-004 — MAJEURE — recette RBAC insuffisante

- Seul SUPER_ADMIN historique possède les permissions ; aucun profil facturation/comptable/trésorerie/sans droit.
- Impact : isolation OWN/AGENCY et révocation non prouvées réellement.

## FIN-005 — MOYENNE — contrainte de séparation contraire à la règle globale

- Inspection : la facture fournisseur refuse que le créateur valide sa propre facture.
- Impact : blocage possible lorsqu’un utilisateur possède les deux permissions.
- Périmètre : intégration directe fournisseurs ; à arbitrer, sans correction durant l’audit.

## FIN-006 — MOYENNE — données remboursement incohérentes/incomplètes

- Un remboursement réel existe mais `credit_notes=0`, alors que l’API moderne exige un avoir compatible.
- Impact : traçabilité historique difficile ; donnée identifiée comme fictive.
