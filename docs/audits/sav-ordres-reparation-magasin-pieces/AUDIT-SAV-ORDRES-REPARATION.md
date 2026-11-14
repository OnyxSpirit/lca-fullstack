# Audit SAV — ordres de réparation

## Cartographie

- UI : `/service`, `/service/repair-orders/:id` ; `/workshop` redirige vers `/service`.
- Principaux composants : `ServiceDashboardPage`, `NewRepairOrderModal`, `RepairOrderDetailPage`, `VehicleWarrantyContractCard`, `WarrantyCard`.
- Backend : `workshop.routes.ts`, `workshop-vehicle.routes.ts`, `sav-operations.routes.ts`.
- Tables clés : `repair_orders`, `repair_order_status_history`, `repair_inspections`, `repair_diagnostics`, `repair_estimate_items`, `repair_approvals`, `interventions`, `work_sessions`, `time_entries`, `repair_quality_controls`, `repair_order_handovers`.

## Constats

- Le workflow impose réception, diagnostic, chiffrage, décision client persistée, intervention, contrôle qualité, facturation, restitution et clôture.
- Les transitions terminales et l'immutabilité sont protégées côté serveur ; aucun rôle historique ne contourne les permissions dynamiques.
- Le démarrage réel repose sur une session persistée et non sur une simple affectation ou préparation.
- Le devis accepté est conservé ; les compléments possèdent une décision distincte.
- La main-d'œuvre forfaitaire n'est pas multipliée par le temps ; les dérogations sont permissionnées et auditées.
- La recette ne contient qu'un OR `closed`, insuffisant pour rejouer toutes les transitions sans fixtures.

Verdict : **CONFORME AVEC RÉSERVES**.

