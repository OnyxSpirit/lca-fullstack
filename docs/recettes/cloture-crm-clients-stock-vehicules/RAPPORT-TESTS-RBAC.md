# Rapport de tests RBAC

Les opérations clients, CRM et véhicules restent adossées aux permissions dynamiques et au contexte d’agence actif. Le transfert exige `vehicles.assign_agency` sur la source et la destination. Expédition/annulation/retour sont réservés à la source ; réception à la destination.

Suites vertes : `crm-agency-rbac`, `customer-agency-rbac`, `vehicles-dynamic-rbac`, `quotation-agency-rbac` et `quotations-dynamic-rbac`. La suite MySQL ajoute les refus réels source/destination. Le parcours navigateur a utilisé exclusivement un rôle métier temporaire non système, limité aux deux agences de fixture.
