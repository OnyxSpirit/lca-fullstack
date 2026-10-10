# CORR-ERP-02C — Changements

- Schéma : `leads.lead_type`, `activities.created_by`, durée et métadonnées de dérogation sur `follow_ups`.
- RBAC : ajout de `crm.appointment.override_conflict`, attribué uniquement au rôle système `SUPER_ADMIN`.
- API rendez-vous : durée effective, fin calculée, conflit 409 structuré, dérogation contrôlée.
- Paramètres : clé `crm.appointment.default_duration_minutes`, valeur de repli 30.
- API prospects : catégorie explicite acceptée, sinon inférée pour compatibilité.
- Frontend : durée saisissable, paramètre concession éditable, téléphone devenu facultatif lorsqu’un e-mail est fourni.

Les changements sont additifs. Aucun enregistrement historique n’est recalculé ou réattribué.
