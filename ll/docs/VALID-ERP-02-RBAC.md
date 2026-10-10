# VALID-ERP-02 — RBAC

## Dérogation de conflit

Une fuite de portée a été démontrée : `assertPermission` confirmait l'existence de `crm.appointment.override_conflict`, mais n'appliquait pas son scope à la cible. Un détenteur OWN pouvait donc tenter une dérogation sur un prospect accessible via une permission de création plus large.

Le correctif minimal `assertLeadPermissionScope` applique désormais :

- OWN : le prospect est affecté à l'utilisateur authentifié ;
- AGENCY : l'agence du prospect égale celle de l'utilisateur ;
- CONCESSION : les deux agences appartiennent à la même concession ;
- GLOBAL : accès autorisé.

Le contrôle intervient avant la transaction dès que `overrideConflict` est demandé. En présence d'un conflit, la permission est encore vérifiée dans la transaction ; la justification vide est refusée, et l'auteur, la date, le motif et les identifiants en conflit sont persistés. Aucun nom de rôle n'est consulté dans ce flux.

## Autres contrôles

- La création de rendez-vous reste bornée par `crm.appointment.create` et le scope d'accès au prospect.
- L'auteur d'activité provient de `request.user.sub` et n'est pas fourni par le client.
- Le responsable demeure un champ distinct et réaffectable suivant les permissions existantes.
- Les activités historiques restent sans auteur au lieu de recevoir une identité artificielle.
- Les tests ciblés CRM dynamique, scope Client 360°, pagination, transitions et fiabilité passent dans leur exécution isolée.

## Verdict

**VALIDÉ AVEC RÉSERVES.** La fuite de scope directement démontrée est fermée. Restent : l'attribution automatique SUPER_ADMIN/GLOBAL par la migration 077 à confirmer en gouvernance, l'absence d'interface de dérogation, et l'impossibilité de vérifier une matrice utilisateur complète au navigateur dans cette exécution.
