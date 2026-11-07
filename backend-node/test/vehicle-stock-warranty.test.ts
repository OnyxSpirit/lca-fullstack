import test from'node:test';
import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
import{warrantyTerms}from'../src/modules/vehicles/vehicle.routes.js';

const routes=readFileSync(new URL('../src/modules/vehicles/vehicle.routes.ts',import.meta.url),'utf8');

test('le libellé de garantie reprend les valeurs configurées sans valeur approchée',()=>{
 assert.equal(warrantyTerms(36,100000),'Garantie constructeur : 36 mois ou 100 000 km');
 assert.equal(warrantyTerms(24,null),'Garantie constructeur : 24 mois');
});

test('la lecture stock filtre les constructeurs admissibles sans permission Paramètres',()=>{
 assert.match(routes,/warranty_available=TRUE AND default_warranty_months IS NOT NULL/);
 assert.match(routes,/grant\(request,'vehicles\.create'\).*grant\(request,'vehicles\.update'\).*grant\(request,'vehicles\.view'/s);
 assert.doesNotMatch(routes,/warranty-providers\/eligible'[\s\S]{0,300}settings\.manufacturers\.view/);
});

test('création et modification persistent un snapshot seulement sur demande explicite',()=>{
 assert.match(routes,/Object\.hasOwn\(request\.body,'warrantyAssignment'\).*persistWarrantyAssignment/s);
 assert.match(routes,/const warrantyTouched=Object\.hasOwn\(request\.body,'warrantyAssignment'\)/);
 assert.match(routes,/warranty_provider_name_snapshot/);
});
