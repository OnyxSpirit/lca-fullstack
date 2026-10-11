# STABILISATION-ERP-05 — Annulations

La vente #4 a été créée par la course concurrente, puis annulée avec le motif `Annulation contrôlée REC05`.

- motif absent : 400 ;
- annulation valide : 200 ;
- vente finale : `cancelled` ;
- réservation : `cancelled` ;
- Hyundai REC04 #4 : `available` ;
- transition ultérieure : 409 ;
- facturation ultérieure : 409 ;
- trace `sale.cancelled` persistée ;
- notification `sale.cancelled` persistée.

Réserve UX : `SaleDetailPage` demande encore le motif via `window.prompt`. Aucun remplacement n'a été fait sans validation du design transversal.
