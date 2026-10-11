# STABILISATION-ERP-04 — Réserves

1. Le COMMERCIAL voit le menu Stock mais son scope OWN est rejeté ; décision RBAC nécessaire.
2. Test inter-concessions bloqué faute de workflow de seconde concession.
3. Les statuts reserved/sold/delivered seront validés par les workflows Vente/Livraison, pas forcés ici.
4. Suppression/remplacement concurrent de photos et archivage/restauration GED non exécutés afin de conserver les preuves destinées à la Vente.
5. Pas de test de charge ni responsive exhaustif.
6. La suite backend globale contient des dettes préexistantes ; seuls les tests ciblés du correctif sont verts.

Verdict : **PRÊT AVEC RÉSERVES POUR STABILISATION-ERP-05**.

