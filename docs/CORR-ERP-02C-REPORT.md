# CORR-ERP-02C — Rapport

Le lot fiabilise les rendez-vous CRM, distingue l’auteur du responsable d’activité et corrige la création des prospects particuliers/entreprises.

- Durée par défaut concession : 30 minutes, configurable dans Paramètres.
- Durée modifiable par rendez-vous, de 1 à 1440 minutes.
- Détection transactionnelle des chevauchements par commercial, avec verrou `FOR UPDATE`.
- Forçage réservé à `crm.appointment.override_conflict`, avec motif et trace persistée.
- Auteur (`created_by`) distinct du responsable (`assigned_user_id`). L’historique antérieur reste à auteur inconnu.
- Particulier : prénom + nom ; entreprise : raison sociale ; les deux : téléphone ou e-mail.
- Les essais routiers conservent leur modèle réel : démarrage immédiat, véhicule disponible et retour explicite. Aucune durée ou statut fictif n’a été ajouté.

La migration additive est `077_crm_appointment_reliability.sql`. Aucun déploiement, commit ou migration sur une base persistante n’a été effectué.
