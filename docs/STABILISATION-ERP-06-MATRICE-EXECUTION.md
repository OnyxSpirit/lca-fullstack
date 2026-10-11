# ERP-06 — Matrice d'exécution

| ID | Scénario | Profil | Preuve | Statut |
|---|---|---|---|---|
| DEL-01 | Candidats #2/#5 avant planification | Admin | API `/deliveries/candidates` | VALIDÉ |
| DEL-02 | Spécialiste agence 2 | Responsable livraison | API spécialistes | VALIDÉ |
| DEL-03 | Vente #4 annulée | Admin | POST 409, zéro ligne SQL | VALIDÉ |
| DEL-04 | Responsable obligatoire | Responsable livraison | POST 400 | VALIDÉ |
| DEL-05 | Planification concurrente #5 | Responsable livraison | 201/409, unicité SQL | VALIDÉ |
| DEL-06 | Planification #2 | Responsable livraison | livraison #2 | VALIDÉ |
| DEL-07 | Report #5 | Responsable livraison | historique + notification | VALIDÉ |
| DEL-08 | Snapshot checklist | Responsable livraison | 4 catégories, 10 items | VALIDÉ |
| DEL-09 | Prêt prématuré refusé | Responsable livraison | PATCH 409 | VALIDÉ |
| DEL-10 | Checklist complète #2 | Responsable livraison | 10/10 SQL/API | VALIDÉ |
| DEL-11 | Checklist complète #5 | Responsable livraison | 10/10 SQL/API | VALIDÉ |
| DEL-12 | Pièce obligatoire non remise | Responsable livraison | signature 409 | VALIDÉ |
| DEL-13 | Pièces remises | Responsable livraison | 1 document reçu/livraison | VALIDÉ |
| DEL-14 | Forçage `delivered` refusé | Responsable livraison | PATCH 409 | VALIDÉ |
| DEL-15 | Signature PNG invalide | Responsable livraison | POST 400 | VALIDÉ |
| DEL-16 | Vente #5 intégralement payée | Responsable livraison | livraison + SQL | VALIDÉ |
| DEL-17 | Vente #2 avec dérogation | Responsable livraison | autorisation `USED` | VALIDÉ |
| DEL-18 | Rejeu signature concurrent | Responsable livraison | une signature/livraison | VALIDÉ |
| DEL-19 | Vente/stock synchronisés | SQL/API | statuts `delivered` | VALIDÉ |
| DEL-20 | PV #2 | Responsable livraison | PDF 3 pages rendu | VALIDÉ |
| DEL-21 | PV #5 | Responsable livraison | PDF 2 pages rendu | VALIDÉ |
| DEL-22 | Planning PDF | Responsable livraison | PDF 1 page rendu | VALIDÉ |
| DEL-23 | Notifications | SQL/UI | événements persistés visibles | VALIDÉ |
| DEL-24 | Audit | SQL | créations, étapes, finalisations | VALIDÉ |
| DEL-25 | Non authentifié | Anonyme | 401 | VALIDÉ |
| DEL-26 | Identifiant invalide | Admin | 400 | VALIDÉ |
| DEL-27 | Commercial | COMMERCIAL | liste 403 | VALIDÉ |
| DEL-28 | Comptable | COMPTABLE | liste 403 | VALIDÉ |
| DEL-29 | Direction | DIRECTION | liste 403 | VALIDÉ |
| DEL-30 | Responsable autre agence | RESP. LIVRAISON agence 3 | liste vide | VALIDÉ |
| DEL-31 | Admin global | SUPER_ADMIN | liste 200 | VALIDÉ |
| DEL-32 | Navigateur liste/détail | Admin | frontend 4176 | VALIDÉ |
| DEL-33 | Affichage dérogation consommée | Admin | frontend 4176 | VALIDÉ après correction |
| DEL-34 | Cachet concession | Responsable livraison | aucune configuration disponible | NON APPLICABLE |
| DEL-35 | Annulation d'une livraison dédiée | Responsable livraison | non destructive, non exécutée | NON EXÉCUTÉ |

Couverture prévue : 35. Exécutée : 34. Validée : 33. Non applicable : 1. Non exécutée : 1. Aucun scénario partiel ou bloqué.
