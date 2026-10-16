import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
import test from'node:test';
const routes=readFileSync(new URL('../src/modules/workshop/workshop.routes.ts',import.meta.url),'utf8');

test('OR-PATH-BE-01 la recherche client reste sous service.order.create',()=>{assert.match(routes,/get\('\/repair-orders\/customer-candidates',serviceAccess\('service\.order\.create'\)/);assert.match(routes,/serviceCustomerScope\(r\)/)});
test('OR-PATH-BE-02 la recherche cible identité ou raison sociale et limite les résultats',()=>{assert.match(routes,/CONCAT_WS\(' ',c\.first_name,c\.last_name\) LIKE/);assert.match(routes,/c\.company_name LIKE/);assert.match(routes,/LIMIT 50/)});
test('OR-PATH-BE-03 le type client est validé',()=>{assert.match(routes,/customerType.*\['individual','company'\]/);assert.match(routes,/Type de client invalide/)});
test('OR-PATH-BE-04 le contrat optionnel bloque une origine incohérente',()=>{assert.match(routes,/expectedVehicleOrigin/);assert.match(routes,/VEHICLE_ORIGIN_MISMATCH/);assert.match(routes,/valid\.commercial_origin!==expectedOrigin/)});
test('OR-PATH-BE-05 les anciens consommateurs restent compatibles',()=>assert.match(routes,/expectedVehicleOrigin==null\?null/));
