import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {VEHICLE_LOCATION_TYPES} from '../src/modules/vehicles/vehicle.routes.js';

const read=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const migration=read('database/migrations/093_vehicle_location_garages.sql');
const routes=read('src/modules/vehicles/vehicle.routes.ts');

test('B343-SQL — migration additive de PARC/SHOWROOM vers GARAGE',()=>{
  assert.match(migration,/ALTER TABLE vehicle_locations/);
  assert.match(migration,/ENUM\('PARC','SHOWROOM','GARAGE'\) NOT NULL/);
  assert.doesNotMatch(migration,/\b(?:DROP|DELETE|TRUNCATE)\b/i);
});

test('B343-REF — le contrat backend accepte exactement les trois types',()=>{
  assert.deepEqual(VEHICLE_LOCATION_TYPES,['PARC','SHOWROOM','GARAGE']);
  assert.match(routes,/post\('\/vehicle-locations',requirePermission\('vehicles\.assignments\.manage'\)/);
  assert.match(routes,/assertAgencyPermissionScope\(request,'vehicles\.assignments\.manage'/);
  assert.match(routes,/if\(type\)\{if\(!isVehicleLocationType\(type\)\)/);
});

test('B343-FILTRE — filtre courant et compte GARAGE restent dans le scope véhicules',()=>{
  assert.match(routes,/SUM\(vl\.type='GARAGE'\) garage/);
  assert.match(routes,/clauses\.push\('vl\.type=\?'\);params\.push\(locationType\)/);
  assert.match(routes,/vehicleScope\(request,'vehicles\.view'/);
});

test('B343-TRANSFERT — workflow unique, verrou, historique et synchronisation conservés',()=>{
  assert.match(routes,/post\('\/vehicles\/:id\/transfer',requirePermission\('vehicles\.assign_agency'\)/);
  assert.match(routes,/SELECT agency_id,vehicle_location_id,status FROM vehicles WHERE id=\? FOR UPDATE/);
  assert.match(routes,/vehicleLocation\(connection,toAgencyId,request\.body\.toLocationId\)/);
  assert.match(routes,/INSERT INTO vehicle_movements\(vehicle_id,from_vehicle_location_id,to_vehicle_location_id,from_agency_id,to_agency_id,movement_type,reason,performed_by\)/);
  assert.match(routes,/emitToAgency\(String\(row\.agency_id\),'vehicles:transferred'/);
  const transfer=routes.slice(routes.indexOf("vehicleRouter.post('/vehicles/:id/transfer'"),routes.indexOf('async function insertVehicleImages'));
  assert.doesNotMatch(transfer,/sale_price|purchase_price|minimum_price|status=|reservation/);
});

test('B343-STATUT — GARAGE est un emplacement physique valide sans modifier les règles commerciales',()=>{
  assert.match(routes,/next==='available'[\s\S]*isVehicleLocationType\(String\(row\.location_type\)\)/);
  assert.match(routes,/assertStockVehicleMutable\(row\.status\)/);
});
