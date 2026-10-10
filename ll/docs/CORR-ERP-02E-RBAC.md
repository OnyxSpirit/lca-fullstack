# CORR-ERP-02E — RBAC

| Opération | Permission principale | Contrôle |
|---|---|---|
| Lire configuration/détail | `showroom.view` | agence de session et scope persistant |
| Créer/planifier Showroom | `showroom.visitor.update` | visite accessible, véhicule de l'agence, conseiller valide |
| Planifier depuis CRM | `showroom.visitor.update` + `crm.test_drive.create` | lead et affectation dans le scope |
| Reprogrammer | `showroom.visitor.update` | essai visible via `driveScope`, statut `planned` |
| Annuler | `showroom.visitor.update` | essai visible, verrou puis transition logique |
| Confirmer le retour | `showroom.status.update` | scope dédié existant |

Les erreurs de collision exposent uniquement la ressource générique et le type de conflit, jamais l'identité, l'agence ou le créneau de la réservation concurrente. `crm.appointment.override_conflict` n'est pas étendu aux essais.

Aucune permission n'a été ajoutée et aucun nom de rôle n'est utilisé comme autorisation.
