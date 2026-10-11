# STABILISATION-ERP-04 — Tests

`scripts/stabilisation-erp-04-stock.mjs` exécute référentiels, créations, matrice VIN, édition, statuts, photos, filtres, 360, PDF, RBAC, concurrence et performance. `scripts/stabilisation-erp-04-ged.mjs` dépose puis prévisualise un PDF lié au véhicule.

Test ciblé : `node --import tsx --test test/vehicle-create-insert-shape.test.ts` → 2 tests, 2 succès. Une tentative avec la commande npm globale a lancé toute la suite par défaut et rencontré des échecs préexistants ainsi qu'une assertion native Node ; elle n'est pas utilisée comme verdict du correctif.

MySQL réel : 7 véhicules, 7 VIN uniques, 4 images, 4 emplacements/4 agences, 1 document, 8 historiques de statut et 7 mouvements. Navigateur : liste, compteurs, filtres, fiche RAV4, photo réelle, fiche Corolla, historique de prix et GED réelle ; aucune erreur console.

