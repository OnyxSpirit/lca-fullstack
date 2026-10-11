# ERP-14 — Matrice d’exécution

| Scénario | Statut | Preuve |
|---|---|---|
| REC14-CRM-01 | PARTIEL | prospect créé ; conversion Client absente |
| REC14-CRM-02 | VALIDÉ | client, unicité, 360 |
| REC14-SHOWROOM-01 | VALIDÉ | visite 1 → lead 9 qualifié |
| REC14-VENTE-01 | VALIDÉ | course vente + retour stock |
| REC14-VENTE-02 | PARTIEL | chaînes historiques relues |
| REC14-FINANCE-01 | PARTIEL | preuves historiques, pas de nouvelle facture |
| REC14-LIVRAISON-01 | PARTIEL | refus vente annulée + dossiers historiques |
| REC14-VENTE-03 | VALIDÉ | terminal, facture/livraison refusées |
| REC14-SAV/ATELIER/PIECES | PARTIEL | API/tests historiques relus |
| REC14-GARANTIE/KM | NON EXÉCUTÉ | pas de nouveau cycle justifié |
| REC14-RH-01 | PARTIEL | utilisateur REC14 + invariants ERP-13 |
| REC14-NOTIF-01/02 | PARTIEL | événement, politique RBAC, persistance rôle non prouvée |
| REC14-AUDIT-01 | VALIDÉ | traces applicatives/MySQL |
| REC14-CONCESSION-01 | BLOQUÉ | une concession, workflow absent |
