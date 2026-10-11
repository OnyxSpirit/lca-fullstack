# ERP-16 — Matrice d'exécution (état courant)

| Scénario | Priorité | Résultat observé | Statut |
|---|---|---|---|
| ISO-01 | P0 | ports, IDs, volume et ressources REC15 exactes vérifiés | VALIDÉ |
| GAR-01 | P0 | cycle neuf complet : client 9, véhicule 12, vente 9, livraison 5, OR 7 ; garantie ACTIVE/APPROVED/FULL/CONFIRMED ; constructeur 41 615 XAF, client 0 XAF ; restitution 55 km ; API/UI/MySQL/PDF concordants | VALIDÉ |
| GAR-02 | P1 | protections couvertes par test ciblé, pas de ressources REC16 | PARTIEL |
| GED-01/02/03 | P0 | correctif Atelier présent ; test ciblé vert ; échec historique Livraison isolé | PARTIEL |
| CONC-LIVRAISON | P1 | test MySQL ciblé vert, pas de ressource REC16 | PARTIEL |
| CONC-VENTE | P1 | véhicule 13, une vente 10, un gagnant et un conflit, état `reserved` cohérent | VALIDÉ |
| CONC-PAIEMENT | P1 | facture 19 : un paiement de 100 000 XAF, second refusé, solde 18 900 XAF | VALIDÉ |
| CONC-LIVRAISON REC16 | P1 | livraison 6 : une signature, une transition, une archive GED, rejeu terminal | VALIDÉ |
| CONC-PIÈCES | P1 | pièce 7 : dernière unité transférée une fois, `201/409`, stocks 0/1 | VALIDÉ |
| CONC-OR | P1 | OR 8 : une transition reçue, une intervention, une facture 23 | VALIDÉ |
| IDEM-FACTURE/PAIEMENT/LIVRAISON | P1 | clés identiques séquentielles et concurrentes, cardinalités unitaires | VALIDÉ |
| IDEM-GED ATELIER | P0 | deux facturations simultanées → facture 23 et archive uniques ; injection d'échec Atelier non disponible | PARTIEL |
| Notifications scopes | P1 | sessions distinctes, persistance, lecture idempotente et absence de fuite démontrées ; tests source historiques partiellement périmés | VALIDÉ RÉEL / TESTS PARTIELS |
| UI Vente/SAV/Garantie | P0 | ventes 9-11, livraisons 5/6, client 360 et OR 7 vérifiés sur 4176 | VALIDÉ |
| UI RBAC multi-profils | P1 | admin vérifié au navigateur ; profils secondaires vérifiés par API authentifiée | PARTIEL |
| PDF | P0/P1 | 7 PDF A4 téléchargés, extraits, rendus et inspectés ; 2 défauts typographiques/alignement mineurs | VALIDÉ AVEC RÉSERVES |
| Socket.IO | P0 | deux sessions, jeton invalide, isolation nominative/agence et reconnexion | VALIDÉ |
| Multi-agences | P1 | A2/A3/A4 et scopes OWN/AGENCY/CONCESSION/GLOBAL contrôlés | VALIDÉ |
| Audits | P1 | audit_logs, historiques OR/Livraison, mouvements Pièces et créance Garantie concordants | VALIDÉ |
| Multi-concessions | P2 | une concession, aucun workflow | BLOQUÉ |
| Builds | P0 | backend TypeScript et frontend Vite | VALIDÉ |
| Tests ciblés | P1 | backend 58/62 exécutés (+2 skips), frontend 53/62 ; échecs = assertions textuelles historiques à réaligner | PARTIEL |
