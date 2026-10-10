import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const read=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');
const list=read('../src/modules/vehicles/VehiclesListPage.tsx');
const create=read('../src/modules/vehicles/NewVehicleModal.tsx');
const edit=read('../src/modules/vehicles/EditVehicleModal.tsx');
const hooks=read('../src/api/erpHooks.ts');
const transfer=read('../src/modules/vehicles/VehicleTransferModal.tsx');

test('R01 compteurs suivent la vue, restent hors pagination et sont invalidés après transfert',()=>{
  assert.match(list,/useVehicleLocationCountsQuery\(implicitAgencyId,inventoryView\)/);
  assert.match(hooks,/location-counts',agencyId,view/);
  assert.doesNotMatch(hooks.slice(hooks.indexOf('useVehicleLocationCountsQuery'),hooks.indexOf('export interface VehicleLocationRecord')),/page|pageSize/);
  assert.match(hooks,/useVehicleTransfer=[\s\S]+invalidateQueries\(\{queryKey:erpKeys\.vehicles\}\)/);
});

test('R02 création, modification et filtre ne proposent que VN et VO',()=>{
  for(const source of [create,edit,list]){
    assert.match(source,/value="new"/);
    assert.match(source,/value="used"/);
  }
  assert.doesNotMatch(create,/<option value="(?:demo|courtesy)"/);
  assert.doesNotMatch(list,/<option value="(?:demo|courtesy)"/);
  assert.match(edit,/Valeur historique/);
  assert.match(edit,/delete payload\.vehicleType/);
});

test('R03 Modifier affiche l’affectation et réutilise le workflow protégé de transfert',()=>{
  for(const token of ['Affectation actuelle','Non affecté','Affecter','Transférer'])assert.match(edit,new RegExp(token));
  assert.match(edit,/can\('vehicles\.assign_agency'\)/);
  assert.match(edit,/VehicleTransferModal/);
  assert.doesNotMatch(edit,/UPDATE vehicles|vehicle_location_id/);
  assert.match(transfer,/\/vehicles\/\$\{id\}\/transfer|useVehicleTransfer/);
  assert.match(transfer,/onTransferred/);
});
