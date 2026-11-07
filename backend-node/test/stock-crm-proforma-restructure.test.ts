import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';

const read=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');

test('le profil technique couvre tous les champs de la migration 103',()=>{
  const service=read('../src/modules/vehicles/vehicle-technical-profile.ts');
  for(const field of ['combined_power_kw','acceleration_0_100_seconds','length_mm','advanced_sensors','battery_cooling_function','ventilated_front_discs','central_screen_dashboard','remote_app_control','steering_system','additional_specs'])assert.match(service,new RegExp(field));
});

test('une ligne pro forma véhicule est résolue et figée côté serveur',()=>{
  const route=read('../src/modules/proformas/proforma.routes.ts');
  assert.match(route,/resolveVehicleCommercialSnapshot\(connection,vehicleId\)/);
  assert.match(route,/await assertVehicleAccess/);
  assert.match(route,/snapshot=resolved\.technical/);
  assert.match(route,/images=resolved\.images/);
  assert.doesNotMatch(route,/if\(vehicleId&&!snapshot\)/);
});

test('la vente est indépendante de l’étape non terminale et Perdu reste irréversible',()=>{
  const sale=read('../src/modules/sales/sale.service.ts');
  assert.doesNotMatch(sale,/\['negotiation','offer'\]\.includes\(String\(opportunity\.stage\)\)/);
  assert.match(sale,/opportunity\.stage\)==='lost'/);
  assert.match(sale,/UPDATE opportunities SET stage='won'/);
});

test('le stock accepte une version normalisée sans casser la saisie historique',()=>{
  const route=read('../src/modules/vehicles/vehicle.routes.ts');
  assert.match(route,/request\.body\.versionId/);
  assert.match(route,/LOWER\(TRIM\(name\)\)=LOWER\(TRIM\(\?\)\)/);
  assert.match(route,/technicalProfile/);
});
