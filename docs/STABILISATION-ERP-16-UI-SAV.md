# ERP-16 — Recette navigateur SAV

Le détail `/service/repair-orders/7` affiche l'OR `OR-1791745796584` livré, kilométrage d'entrée 50, restitution 55, diagnostic, validation client, intervention terminée, contrôle qualité, facture et historique complet.

La chaîne d'états visible est : `planned → received → diagnosis → waiting_approval → in_progress → quality_control → ready → invoiced → delivered`. Elle concorde avec `repair_order_status_history`.

Statut : **VALIDÉ**.

