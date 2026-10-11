# STABILISATION-ERP-04 — RBAC

- SUPER_ADMIN : création, modification, statuts, photos, GED, finances et vue globale validés.
- RESPONSABLE_COMMERCIAL, CONCESSION : voit les 6 véhicules métier des quatre agences.
- RECEPTIONNISTE, AGENCY : voit 1 véhicule de son agence ; identifiant d'une autre agence masqué 404.
- RESPONSABLE_LIVRAISON, AGENCY : voit 1 véhicule de son agence en lecture.
- COMMERCIAL : le rôle ERP-02 possède `vehicles.view` en scope OWN, mais ce scope est explicitement invalide pour un stock collectif ; API 403 et frontend « Stock indisponible ».
- DIRECTION : aucun droit `vehicles.view`, API 403.

Le périmètre GLOBAL/CONCESSION/AGENCY est prouvé. OWN est non applicable au stock collectif et constitue une anomalie de configuration du rôle COMMERCIAL. Inter-concessions reste bloqué faute de seconde concession officielle.

