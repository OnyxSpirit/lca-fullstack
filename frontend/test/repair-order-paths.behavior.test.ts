import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
import test from'node:test';
const modal=readFileSync(new URL('../src/modules/service/NewRepairOrderModal.tsx',import.meta.url),'utf8'),hooks=readFileSync(new URL('../src/api/erpHooks.ts',import.meta.url),'utf8');

test('OR-PATH-01 le parcours interne utilise les candidats SAV et filtre CONCESSION',()=>{assert.match(modal,/useRepairOrderCustomersQuery/);assert.match(modal,/vehiclesForRepairOrderMode\(allVehicles,'internal'\)/);assert.match(modal,/Véhicule de concession associé/);assert.doesNotMatch(modal,/useCustomersQuery/)});
test('OR-PATH-02 UNKNOWN est écarté explicitement sans reclassement',()=>{assert.match(modal,/commercialOrigin==='UNKNOWN'/);assert.match(modal,/origine doit être régularisée hors de ce formulaire/);assert.doesNotMatch(modal,/commercialOrigin.*UNKNOWN.*CONCESSION/)});
test('OR-PATH-03 le parcours extérieur impose confirmation client et véhicule',()=>{assert.match(modal,/Utiliser ce client/);assert.match(modal,/Continuer avec un nouveau client/);assert.match(modal,/Réutiliser ce véhicule/);assert.match(modal,/customerDecision!=='new'/);assert.match(modal,/vehicleDecision==='existing'/)});
test('OR-PATH-04 le changement de parcours purge les états spécifiques',()=>{for(const reset of["customerId:''","vehicleId:''","setCustomerSearch('')","setCustomerForm(emptyCustomer())","setConfirmedCustomer(null)","setExternalForm(emptyExternal())","setConfirmedVehicle(null)","setConflict(null)"])assert.ok(modal.includes(reset),reset);assert.match(modal,/changeMode=\(next:Mode\).*resetPathSpecific\(\).*setMode\(next\)/)});
test('OR-PATH-05 le contrat d’origine est transmis à la création',()=>assert.match(modal,/expectedVehicleOrigin:mode==='internal'\?'CONCESSION':'EXTERNAL'/));
test('OR-PATH-06 la recherche client est temporisée et utilise identité ou société',()=>{assert.match(modal,/setTimeout\(\(\)=>setExternalCustomerSearch/);assert.match(modal,/customerForm\.firstName\.trim\(\).*customerForm\.lastName\.trim\(\)/);assert.match(modal,/customerForm\.company\.trim\(\)/);assert.match(hooks,/repair-orders\/customer-candidates/)});
