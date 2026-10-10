import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {assertVehicleMinimumPrice} from '../src/shared/vehicle-margin.js';

const read=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');

test('VEH-LOC-01..06 sépare dynamiquement les emplacements véhicules des magasins et ateliers',()=>{
  const vehicles=read('../src/modules/vehicles/vehicle.routes.ts'),parts=read('../src/modules/parts/part.routes.ts');
  assert.match(vehicles,/FROM vehicle_locations WHERE id=\? AND agency_id=\?/);
  assert.match(vehicles,/\['PARC','SHOWROOM'\]/);
  assert.match(vehicles,/agency_id=\?/);
  assert.match(vehicles,/vehicleLocation\(connection,agencyId,request\.body\.locationId\)/);
  assert.match(vehicles,/vehicle_location_id=\?/);
  assert.match(vehicles,/INSERT INTO vehicle_movements\(vehicle_id,from_vehicle_location_id,to_vehicle_location_id/);
  assert.doesNotMatch(vehicles,/Parc VN|Parc VO|Zone préparation/);
  assert.match(parts,/l\.type='warehouse'/);
});

test('SALE-DISCOUNT-05..11 applique le prix minimum autoritatif sans confondre zéro et une borne positive',()=>{
  assert.doesNotThrow(()=>assertVehicleMinimumPrice({minimum_price:23_000_000},23_500_000));
  assert.doesNotThrow(()=>assertVehicleMinimumPrice({minimum_price:23_000_000},23_000_000));
  assert.throws(()=>assertVehicleMinimumPrice({minimum_price:23_000_000},22_500_000),/prix minimum autorisé/);
  assert.doesNotThrow(()=>assertVehicleMinimumPrice({minimum_price:0},1));
  const sales=read('../src/modules/sales/sale.service.ts');
  assert.match(sales,/SELECT id,agency_id,status,vin,stock_number,catalog_price,sale_price,minimum_price/);
  assert.match(sales,/assertVehicleMinimumPrice\(vehicle,quotation\?effectiveSubtotal-effectiveDiscount:directTax!\.netHt\)/);
  assert.match(sales,/vehiclePricingGuard/);
});
