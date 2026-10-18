import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
import test from'node:test';
import{vehicleLocationTypeLabel}from'../src/modules/vehicles/vehicleLocationPresentation';

const read=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const list=read('src/modules/vehicles/VehiclesListPage.tsx');
const settings=read('src/modules/settings/VehicleLocationsSettings.tsx');
const transfer=read('src/modules/vehicles/VehicleTransferModal.tsx');

test('B343-UI-01 traduit les trois types sans exposer GARAGE',()=>{
 assert.equal(vehicleLocationTypeLabel('PARC'),'Parc automobile');
 assert.equal(vehicleLocationTypeLabel('SHOWROOM'),'Showroom');
 assert.equal(vehicleLocationTypeLabel('GARAGE'),'Garage');
 assert.match(settings,/vehicleLocationTypeLabel\(location\.type\)/);
 assert.match(transfer,/vehicleLocationTypeLabel\(x\.type\)/);
});

test('B343-UI-02 expose Garage dans les paramètres et conserve les actions',()=>{
 assert.match(settings,/<option value="GARAGE">Garage<\/option>/);
 assert.match(settings,/actions\.create\.mutateAsync/);
 assert.match(settings,/actions\.update\.mutateAsync\(\{id:location\.id,name:next\}\)/);
 assert.match(settings,/isActive:!location\.isActive/);
});

test('B343-UI-03 respecte l’ordre Tout, Parc, Showroom, Garage, Non affecté',()=>{
 const all=list.indexOf("`Tous ${locationCounts?.total??0}`");
 const park=list.indexOf("`Parc automobile ${locationCounts?.park??0}`");
 const showroom=list.indexOf("`Showroom ${locationCounts?.showroom??0}`");
 const garage=list.indexOf("`Garage ${locationCounts?.garage??0}`");
 const unassigned=list.indexOf("`Non affectés ${locationCounts?.unassigned??0}`");
 assert.ok(all>=0&&all<park&&park<showroom&&showroom<garage&&garage<unassigned);
 assert.match(list,/sm:grid-cols-5/);
 assert.match(list,/setLocationType\(key as ''\|'PARC'\|'SHOWROOM'\|'GARAGE'\)/);
});
