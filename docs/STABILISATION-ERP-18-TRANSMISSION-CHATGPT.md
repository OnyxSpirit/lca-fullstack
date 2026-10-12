# ERP-18 — Transmission

1. État initial propre sur `main`/`42540ce`; aucun commit ERP-18.
2. Six conteneurs inchangés et healthy ; MySQL recette toujours `5e7de0bab86f`.
3. Sauvegardes ERP-17 présentes ; aucune restauration.
4. Treize profils demandés présents et actifs ; douze profils métier connectés par login API officiel, Super Admin présent dans le navigateur.
5. Contrôles API : 401 sans session, 403 profils non autorisés, 200 lectures Pièces pour Magasinier/Responsable pièces.
6. Navigateur secondaire non exécuté : aucun jeton injecté, aucun mot de passe extrait ou réinitialisé.
7. Anomalie bloquante `ERP18-PARTS-01` : aucun rôle métier ne cumule `service.order.update` avec création/consommation de réservation Pièces.
8. CRM « Toute l'équipe », Stock/VIN/filtres, vente annulée terminale, Showroom et GED véhicule sont clos.
9. Frontend ciblé : 37/37 ; backend Pièces/Vente/Stock : vert ; Showroom isolé : 12/12.
10. GED reprise ERP-17 : vert ; suite historique combinée : 28/38, 10 assertions à réconcilier.
11. Documents GED inchangés : 46. Données métier préservées.
12. Multi-concessions bloqué proprement : une seule concession, aucune création SQL.
13. Aucune correction de code, de rôle, de permission ou de donnée n'a été appliquée.
14. Verdict ERP-18 : **NON PRÊT POUR LIVRAISON générale** tant que le blocage Atelier/Pièces n'est pas arbitré et recetté.

## Prochaine action recommandée

Décider quel profil exécute réservation et consommation depuis l'OR et à quel scope. Implémenter ensuite le moindre changement autorisé (matrice de rôle ou séparation du droit `service.order.update`), puis ouvrir des sessions navigateur isolées Magasinier/Responsable pièces/Technicien/SAV et rejouer PARTS-03 à PARTS-05.
