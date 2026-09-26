import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { clearVehicleFinancialValues, implicitVehicleAgencyFilter, vehiclePayloadForAgency } from '../src/modules/vehicles/vehicleScopePolicy.js';

const read=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');

test('liste: AGENCY conserve A1, CONCESSION et GLOBAL laissent le backend appliquer le scope',()=>{
  assert.equal(implicitVehicleAgencyFilter('AGENCY','11'),'11');
  assert.equal(implicitVehicleAgencyFilter('CONCESSION','11'),undefined);
  assert.equal(implicitVehicleAgencyFilter('GLOBAL','11'),undefined);
});

test('création: un payload non financier ne contient aucun champ financier caché',()=>{
  const payload=vehiclePayloadForAgency({agencyId:'12',vin:'VIN',purchasePrice:100,salePrice:200,notes:'ok'},false);
  assert.deepEqual(payload,{agencyId:'12',vin:'VIN',notes:'ok'});
});

test('changement agence: toutes les valeurs financières sont effacées',()=>{
  const cleared=clearVehicleFinancialValues({agencyId:'12',purchasePrice:'100',salePrice:'200',minimumPrice:'150'});
  for(const field of ['purchasePrice','refurbishmentCost','transportCost','administrativeCost','additionalCosts','catalogPrice','salePrice','minimumPrice'])assert.equal(cleared[field as keyof typeof cleared],'');
});

test('UI: agences et finance proviennent du contexte scope-aware du backend',()=>{
  const modal=read('../src/modules/vehicles/NewVehicleModal.tsx'),hooks=read('../src/api/erpHooks.ts'),list=read('../src/modules/vehicles/VehiclesListPage.tsx');
  assert.match(hooks,/\/vehicles\/agencies\/create/);
  assert.match(modal,/financialAllowed&&<section/);
  assert.match(modal,/vehiclePayloadForAgency/);
  assert.match(modal,/clearVehicleFinancialValues/);
  assert.match(list,/implicitVehicleAgencyFilter\(permissionScope\('vehicles\.view'\)/);
});
