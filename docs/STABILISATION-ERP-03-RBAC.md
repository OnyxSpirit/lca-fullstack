# STABILISATION-ERP-03 — RBAC et scopes

Profils utilisés réellement : SUPER_ADMIN, RESPONSABLE_COMMERCIAL, COMMERCIAL et RECEPTIONNISTE.

- COMMERCIAL, scope OWN : voit 2 prospects sur 5 et son client ; accès direct à un prospect/client d'un autre propriétaire masqué par 404.
- RESPONSABLE_COMMERCIAL, scope CONCESSION : voit les 5 prospects et deux membres d'équipe sur plusieurs agences de la concession.
- RECEPTIONNISTE : `/leads` refusé 403 et menu CRM absent.
- SUPER_ADMIN : création et pilotage global des données CRM, sous réserve des contrôles d'agence propres à Customers.
- Inter-concessions : BLOQUÉ, aucune seconde concession créable par workflow officiel.

Anomalie de configuration : COMMERCIAL ne possède pas `notifications.view`; son centre de notifications API répond 403. Aucune permission n'a été ajoutée arbitrairement.

