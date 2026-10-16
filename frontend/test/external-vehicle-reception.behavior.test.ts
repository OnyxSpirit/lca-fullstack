import assert from'node:assert/strict';
import{readFile}from'node:fs/promises';
import test from'node:test';

const read=(path:string)=>readFile(new URL(path,import.meta.url),'utf8');

test('14C.3 sépare les modes et filtre les véhicules selon leur origine',async()=>{
 const modal=await read('../src/modules/service/NewRepairOrderModal.tsx');
 assert.match(modal,/Véhicule interne/);assert.match(modal,/Véhicule extérieur/);
 assert.match(modal,/vehiclesForRepairOrderMode\(allVehicles,'internal'\)/);
 assert.match(modal,/expectedVehicleOrigin:mode==='internal'\?'CONCESSION':'EXTERNAL'/);
 assert.match(modal,/commercialOrigin==='UNKNOWN'/);
});

test('14C.3 recherche les candidats SAV et crée dans les référentiels centraux avec RBAC dynamique',async()=>{
 const modal=await read('../src/modules/service/NewRepairOrderModal.tsx');
 assert.match(modal,/useRepairOrderCustomersQuery\(currentUser\?\.id/);assert.match(modal,/setTimeout\([^,]+,350\)/);
 assert.match(modal,/Continuer avec un nouveau client/);assert.match(modal,/useCreateCustomer\(\)/);
 for(const permission of['customers.create','workshop.vehicles.view','workshop.external_vehicle.create','workshop.vehicle.associations.create'])assert.ok(modal.includes(`can('${permission}')`));
 assert.doesNotMatch(modal,/SUPER_ADMIN|roleName|\.role===/);
});

test('14C.3 gère détection, création, association et conflits véhicule',async()=>{
 const [modal,hooks,client]=await Promise.all([read('../src/modules/service/NewRepairOrderModal.tsx'),read('../src/api/erpHooks.ts'),read('../src/services/apiClient.ts')]);
 assert.match(hooks,/\/workshop\/vehicles\/search/);assert.match(hooks,/\/workshop\/external-vehicles/);assert.match(hooks,/\/workshop\/vehicle-associations/);
 assert.match(modal,/Réutiliser ce véhicule/);assert.match(modal,/Ce VIN correspond à un véhicule existant/);
 assert.match(modal,/vehicleDecision==='existing'/);assert.match(modal,/commercialOrigin!=='EXTERNAL'/);
 assert.match(modal,/OWNER:'Propriétaire',DRIVER:'Conducteur',RESPONSIBLE:'Responsable',FLEET:'Flotte'/);
 assert.match(client,/public readonly details\?: unknown/);
});

test('14C.3 conserve auto-sélection interne et création OR avec verrou pending',async()=>{
 const modal=await read('../src/modules/service/NewRepairOrderModal.tsx');
 assert.match(modal,/selectCustomerVehicle/);assert.match(modal,/useCreateRepairOrder\(\)/);
 assert.match(modal,/createOrder\.mutateAsync/);assert.match(modal,/createOrder\.isPending/);
 assert.match(modal,/setPreferredVehicleId\(undefined\)/);
 assert.match(modal,/resetPathSpecific\(\);setMode\(next\)/);
});
