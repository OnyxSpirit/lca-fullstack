import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { mapVehicle } from '../src/modules/vehicles/vehicle.routes.js';

const row:any={id:1,vin:'VF1TEST00000000001',stock_number:'STK-000001',vehicle_type:'new',mileage:0,status:'available',brand_id:1,brand:'LCA',model_id:1,model:'One',version_id:1,version:'Premium',agency_id:1,agency_name:'Agence',purchase_price:10000000,refurbishment_cost:100000,transport_cost:200000,administrative_cost:50000,additional_costs:25000,catalog_price:16000000,sale_price:15500000,minimum_price:14500000,discount:500000};

test('le mapping public expose le prix commercial mais aucun coût interne',()=>{
  const vehicle=mapVehicle(row,false);
  assert.equal(vehicle.salePrice,15500000);assert.equal(vehicle.catalogPrice,16000000);
  for(const field of ['purchasePrice','refurbishmentCost','transportCost','administrativeCost','additionalCosts','minimumPrice','discount'])assert.equal(Object.hasOwn(vehicle,field),false,field);
});

test('le mapping financier est activé uniquement par vehicles.financials.view dans la route',()=>{
  const vehicle=mapVehicle(row,true);
  assert.equal(vehicle.purchasePrice,10000000);assert.equal(vehicle.minimumPrice,14500000);
  const source=readFileSync(new URL('../src/modules/vehicles/vehicle.routes.ts',import.meta.url),'utf8');
  assert.match(source,/can\(request\.rbac,'vehicles\.financials\.view'\)/);
  assert.doesNotMatch(source,/SALES_MANAGER|DIRECTOR|RECEPTIONIST/);
});

test('/vehicles/stats ne sélectionne stock_value qu’avec la permission financière',()=>{
  const source=readFileSync(new URL('../src/modules/vehicles/vehicle.routes.ts',import.meta.url),'utf8');
  assert.match(source,/financialScoped\?`,COALESCE\(SUM\(CASE WHEN v\.status IN\('received','preparation','available','reserved'\)/);
  assert.match(source,/statsQuery\.finance\?\{stockValue:/);
});
