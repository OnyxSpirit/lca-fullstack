# ERP-14 — Cartographie

| Source | Action | Destination | Conséquence | Preuve |
|---|---|---|---|---|
| Showroom | conversion officielle | CRM | lead et opportunité qualifiée | visite 1 → lead 9 |
| Stock VN/VO | réservation/vente | Ventes | véhicule indisponible pendant la vente | course concurrente REC14 |
| Vente | annulation | Stock | véhicule de nouveau disponible | vente 7 → véhicule 10 |
| Vente | facturation | Billing | facture liée à la vente | dossiers historiques liés |
| Facture | paiement | Livraison | solde ou autorisation contrôlé | dossiers livrés historiques |
| OR | consommation | Pièces | réservation et mouvement | preuves ERP-08/10 relues |
| RH | liaison compte | Users/RBAC | accès sans suppression du compte | preuves ERP-13 relues |
| Modules | événements | Notifications/Audits | ciblage soumis aux permissions | REC14 Showroom + historiques |

Intégrations directes : Showroom/CRM, Vente/Stock, Vente/Billing. Référentiels communs : clients, véhicules, agences. Événementiel : Socket.IO et notifications. Fonctionnalité absente : conversion générale Prospect → Client.
