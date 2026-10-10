import assert from'node:assert/strict';
import{readFile}from'node:fs/promises';
import test from'node:test';

const read=(path:string)=>readFile(new URL(path,import.meta.url),'utf8');

test('14C.3 expose les modes sans les utiliser pour filtrer les véhicules du client',async()=>{
 const modal=await read('../src/modules/service/NewRepairOrderModal.tsx');
 assert.match(modal,/Véhicule interne/);assert.match(modal,/Véhicule extérieur/);
 assert.match(modal,/useCustomerServiceVehiclesQuery\(form\.customerId,isOpen\)/);
 assert.doesNotMatch(modal,/useCustomerServiceVehiclesQuery\([^)]*mode/);
 assert.match(modal,/new Map\(\(vehiclesQuery\.data\?\?\[\]\)\.map/);
});

test('14C.3 recherche et crée dans les référentiels centraux avec RBAC dynamique',async()=>{
 const modal=await read('../src/modules/service/NewRepairOrderModal.tsx');
 assert.match(modal,/useCustomersQuery\(debouncedCustomerSearch/);assert.match(modal,/setTimeout\([^,]+,350\)/);
 assert.match(modal,/Nouveau client/);assert.match(modal,/useCreateCustomer\(\)/);
 for(const permission of['customers.create','workshop.vehicles.view','workshop.external_vehicle.create','workshop.vehicle.associations.create'])assert.ok(modal.includes(`can('${permission}')`));
 assert.doesNotMatch(modal,/SUPER_ADMIN|roleName|\.role===/);
});

test('14C.3 gère recherche, création, association et conflits véhicule',async()=>{
 const [modal,hooks,client]=await Promise.all([read('../src/modules/service/NewRepairOrderModal.tsx'),read('../src/api/erpHooks.ts'),read('../src/services/apiClient.ts')]);
 assert.match(hooks,/\/workshop\/vehicles\/search/);assert.match(hooks,/\/workshop\/external-vehicles/);assert.match(hooks,/\/workshop\/vehicle-associations/);
 assert.match(modal,/VIN_ALREADY_EXISTS/);assert.match(modal,/REGISTRATION_AMBIGUOUS/);
 assert.match(modal,/saveExternal\(true\)/);assert.match(modal,/confirmRegistrationAmbiguity:confirmRegistrationAmbiguity\|\|undefined/);
 assert.match(modal,/OWNER:'Propriétaire',DRIVER:'Conducteur',RESPONSIBLE:'Responsable',FLEET:'Flotte'/);
 assert.match(client,/public readonly details\?: unknown/);
});

test('14C.3 conserve auto-sélection et création OR avec verrou pending',async()=>{
 const modal=await read('../src/modules/service/NewRepairOrderModal.tsx');
 assert.match(modal,/selectCustomerVehicle/);assert.match(modal,/useCreateRepairOrder\(\)/);
 assert.match(modal,/createOrder\.mutateAsync/);assert.match(modal,/createOrder\.isPending/);
 assert.match(modal,/setForm\(current=>\(\{\.\.\.current,customerId:id,customerName:/);
 assert.match(modal,/preferredVehicleId&&!ids\.includes\(preferredVehicleId\)\)return/);
 assert.match(modal,/setPreferredVehicleId\(result\.vehicleId\);await vehiclesQuery\.refetch/);
 assert.doesNotMatch(modal,/if\(preferredVehicleId\)setPreferredVehicleId\(undefined\)/);
});
