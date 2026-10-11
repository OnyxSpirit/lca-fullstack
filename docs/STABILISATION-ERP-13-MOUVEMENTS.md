# STABILISATION-ERP-13 — Mouvements

Les entrées et sorties conservent quantité avant/après, date, motif, référence et auteur. Sur une unité disponible, deux sorties simultanées donnent un seul `201`, un `409`, puis un solde final nul.

Le verrou `SELECT ... FOR UPDATE` et la transaction protègent la cohérence.
