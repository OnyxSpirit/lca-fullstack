import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {assertManualVehicleTransition} from '../src/modules/vehicles/vehicle.routes.js';
import {assertVehicleMinimumPrice,vehicleCostHt} from '../src/shared/vehicle-margin.js';

const read=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');
const routes=read('../src/modules/vehicles/vehicle.routes.ts');
const migration=read('../database/migrations/050_vehicle_locations_and_sale_cost_snapshots.sql');
const baseline=read('../database/baseline/001_initial_schema.sql');
const sales=read('../src/modules/sales/sale.service.ts');
const quotations=read('../src/modules/quotations/quotation.service.ts');
const reporting=read('../src/modules/reports/report.routes.ts')+read('../src/modules/dashboard/dashboard.routes.ts');

test('PARK-01..22 référentiel dédié, scopes, inactivité et mouvements sont structurels',()=>{
  for(const token of ['vehicle_locations','PARC','SHOWROOM','is_active','agency_id','created_by','legacy_location_id'])assert.match(migration,new RegExp(token));
  assert.match(migration,/l\.type IN\('showroom','yard'\)/);
  assert.doesNotMatch(migration,/l\.type IN\([^)]*(?:warehouse|workshop|delivery|other)/);
  for(const token of ['from_vehicle_location_id','to_vehicle_location_id','movement_type','reason','performed_by'])assert.match(routes,new RegExp(token));
  assert.match(routes,/FOR UPDATE/);
  assert.match(routes,/scope OWN ne s’applique pas/);
  assert.match(routes,/is_active=TRUE/);
  assert.match(routes,/Utilisez l'action Transférer/);
});

test('LIST-01..24 pagination et filtres sont exécutés côté serveur sur un tri stable',()=>{
  for(const token of ['locationType','assignment','unassigned','brandId','modelId','dormant','pageSize','totalPages'])assert.match(routes,new RegExp(token));
  assert.match(routes,/SELECT v\.id \$\{filterFrom\}[^;]+ORDER BY \$\{order\} LIMIT \? OFFSET \?/s);
  assert.match(routes,/v\.created_at DESC,v\.id DESC/);
  assert.match(routes,/SELECT COUNT\(\*\) total/);
  assert.match(routes,/SUM\(vl\.type='PARC'\) park/);
  assert.match(routes,/SUM\(v\.vehicle_location_id IS NULL\) unassigned/);
});

test('FLOW-01..12 transitions manuelles et annulation financière restent protégées',()=>{
  assert.doesNotThrow(()=>assertManualVehicleTransition('reserved','available'));
  for(const next of ['reserved','sold','delivered'])assert.throws(()=>assertManualVehicleTransition('available',next));
  assert.match(routes,/réservation active existe[^\n]+workflow d'annulation/);
  assert.match(sales,/amount_paid[\s\S]+Une vente ayant reçu un paiement ne peut plus être annulée/);
});

test('FIN-01..19 coût, minimum, snapshots et fallback legacy sont cohérents',()=>{
  assert.equal(vehicleCostHt({purchase_price:1,refurbishment_cost:2,transport_cost:3,administrative_cost:4,additional_costs:5}),15);
  assert.doesNotThrow(()=>assertVehicleMinimumPrice({minimum_price:0},1));
  assert.throws(()=>assertVehicleMinimumPrice({minimum_price:100},99));
  assert.match(routes,/9999999999999999\.99/);
  assert.match(quotations,/assertVehicleMinimumPrice\(vehicle,calculated\.netHt\)/);
  assert.match(sales,/assertVehicleMinimumPrice\(vehicle,quotation\?effectiveSubtotal-effectiveDiscount:directTax!\.netHt\)/);
  assert.match(sales,/directEnteredSubtotal=effectiveSubtotal\*\(input\.taxMode/);
  assert.match(quotations,/enteredPrice=Math\.round\(Number\(quotation\.subtotal\)\*factor\*100\)\/100/);
  assert.doesNotMatch(quotations,/subtotal=Number\(quotation\.sale_price\)/);
  for(const token of ['purchase_price_snapshot','refurbishment_cost_snapshot','transport_cost_snapshot','administrative_cost_snapshot','additional_costs_snapshot','total_cost_snapshot'])assert.match(baseline,new RegExp(token));
  assert.match(sales,/status==='confirmed'[^;]+UPDATE sale_items/s);
  assert.match(reporting,/COALESCE\(vsi\.total_cost_snapshot/);
  assert.match(reporting,/CURRENT_COST_FALLBACK/);
});
